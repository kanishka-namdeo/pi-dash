import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentGitBridge } from "../agent-git-bridge";
import { githubService } from "../../github/github-service";
import { worktreeService } from "../../worktree/worktree-service";

const mocks = vi.hoisted(() => ({
	git: {
		push: vi.fn(),
		status: vi.fn(),
		getConfig: vi.fn(),
	},
	octokit: {
		rest: {
			pulls: {
				create: vi.fn(),
			},
			issues: {
				createComment: vi.fn(),
				listComments: vi.fn(),
			},
		},
	},
}));

vi.mock("simple-git", () => ({
	default: () => mocks.git,
}));

vi.mock("electron-store", () => {
	class MockStore {
		get() {
			return { worktrees: [] };
		}
		set() {}
	}
	return { default: MockStore };
});

vi.mock("../../github/github-service", () => ({
	githubService: {
		getOctokit: () => mocks.octokit,
		makeRequest: async <T>(fn: () => Promise<T>) => fn(),
	},
}));

vi.mock("../../worktree/worktree-service", () => ({
	worktreeService: {},
}));

describe("AgentGitBridge", () => {
	let bridge: AgentGitBridge;

	beforeEach(() => {
		vi.clearAllMocks();
		bridge = new AgentGitBridge(githubService, worktreeService);
	});

	describe("createPR", () => {
		it("creates a PR from worktree", async () => {
			mocks.git.push.mockResolvedValue(undefined);
			mocks.git.status.mockResolvedValue({ current: "feature-branch" });
			mocks.git.getConfig.mockResolvedValue({
				value: "https://github.com/test-owner/test-repo.git",
			});
			mocks.octokit.rest.pulls.create.mockResolvedValue({
				data: {
					number: 234,
					html_url: "https://github.com/test-owner/test-repo/pull/234",
				},
			});

			const result = await bridge.createPR(
				"/path/to/worktree",
				"Fix auth",
				"Resolves #123",
			);

			expect(result.number).toBe(234);
			expect(result.url).toBe(
				"https://github.com/test-owner/test-repo/pull/234",
			);
			expect(mocks.git.push).toHaveBeenCalledWith("origin", "HEAD");
			expect(mocks.octokit.rest.pulls.create).toHaveBeenCalledWith({
				owner: "test-owner",
				repo: "test-repo",
				title: "Fix auth",
				body: "Resolves #123",
				head: "feature-branch",
				base: "main",
			});
		});

		it("handles SSH remote URLs", async () => {
			mocks.git.push.mockResolvedValue(undefined);
			mocks.git.status.mockResolvedValue({ current: "fix-branch" });
			mocks.git.getConfig.mockResolvedValue({
				value: "git@github.com:owner/repo.git",
			});
			mocks.octokit.rest.pulls.create.mockResolvedValue({
				data: {
					number: 456,
					html_url: "https://github.com/owner/repo/pull/456",
				},
			});

			const result = await bridge.createPR(
				"/worktree",
				"Update docs",
				"Added docs",
			);

			expect(result.number).toBe(456);
			expect(mocks.octokit.rest.pulls.create).toHaveBeenCalledWith({
				owner: "owner",
				repo: "repo",
				title: "Update docs",
				body: "Added docs",
				head: "fix-branch",
				base: "main",
			});
		});

		it("throws error when remote URL cannot be parsed", async () => {
			mocks.git.push.mockResolvedValue(undefined);
			mocks.git.status.mockResolvedValue({ current: "branch" });
			mocks.git.getConfig.mockResolvedValue({
				value: "https://gitlab.com/owner/repo.git",
			});

			await expect(
				bridge.createPR("/worktree", "Title", "Body"),
			).rejects.toThrow("Could not determine repo from remote URL");
		});

		it("throws error when remote URL is missing", async () => {
			mocks.git.push.mockResolvedValue(undefined);
			mocks.git.status.mockResolvedValue({ current: "branch" });
			mocks.git.getConfig.mockResolvedValue({ value: "" });

			await expect(
				bridge.createPR("/worktree", "Title", "Body"),
			).rejects.toThrow("Could not determine repo from remote URL");
		});

		it("propagates push errors", async () => {
			mocks.git.push.mockRejectedValue(new Error("Push failed"));

			await expect(
				bridge.createPR("/worktree", "Title", "Body"),
			).rejects.toThrow("Push failed");
		});

		it("propagates GitHub API errors", async () => {
			mocks.git.push.mockResolvedValue(undefined);
			mocks.git.status.mockResolvedValue({ current: "branch" });
			mocks.git.getConfig.mockResolvedValue({
				value: "https://github.com/owner/repo.git",
			});
			mocks.octokit.rest.pulls.create.mockRejectedValue(new Error("API error"));

			await expect(
				bridge.createPR("/worktree", "Title", "Body"),
			).rejects.toThrow("API error");
		});
	});

	describe("commentOnIssue", () => {
		it("adds comment to issue", async () => {
			mocks.octokit.rest.issues.createComment.mockResolvedValue({ data: {} });

			await bridge.commentOnIssue("owner", "repo", 123, "Test comment");

			expect(mocks.octokit.rest.issues.createComment).toHaveBeenCalledWith({
				owner: "owner",
				repo: "repo",
				issue_number: 123,
				body: "Test comment",
			});
		});

		it("propagates API errors", async () => {
			mocks.octokit.rest.issues.createComment.mockRejectedValue(
				new Error("Not found"),
			);

			await expect(
				bridge.commentOnIssue("owner", "repo", 999, "Comment"),
			).rejects.toThrow("Not found");
		});

		it("handles empty comment body", async () => {
			mocks.octokit.rest.issues.createComment.mockResolvedValue({ data: {} });

			await bridge.commentOnIssue("owner", "repo", 1, "");

			expect(mocks.octokit.rest.issues.createComment).toHaveBeenCalledWith({
				owner: "owner",
				repo: "repo",
				issue_number: 1,
				body: "",
			});
		});
	});

	describe("readPRFeedback", () => {
		it("reads PR comments", async () => {
			mocks.octokit.rest.issues.listComments.mockResolvedValue({
				data: [
					{ user: { login: "reviewer1" }, body: "LGTM" },
					{ user: { login: "reviewer2" }, body: "Nice work" },
				],
			});

			const result = await bridge.readPRFeedback("owner", "repo", 234);

			expect(result).toEqual([
				{ user: "reviewer1", body: "LGTM" },
				{ user: "reviewer2", body: "Nice work" },
			]);
			expect(mocks.octokit.rest.issues.listComments).toHaveBeenCalledWith({
				owner: "owner",
				repo: "repo",
				issue_number: 234,
			});
		});

		it("handles comments with missing user", async () => {
			mocks.octokit.rest.issues.listComments.mockResolvedValue({
				data: [{ user: null, body: "Anonymous comment" }],
			});

			const result = await bridge.readPRFeedback("owner", "repo", 1);

			expect(result).toEqual([{ user: "unknown", body: "Anonymous comment" }]);
		});

		it("handles comments with missing body", async () => {
			mocks.octokit.rest.issues.listComments.mockResolvedValue({
				data: [{ user: { login: "user" }, body: null }],
			});

			const result = await bridge.readPRFeedback("owner", "repo", 1);

			expect(result).toEqual([{ user: "user", body: "" }]);
		});

		it("returns empty array for PR with no comments", async () => {
			mocks.octokit.rest.issues.listComments.mockResolvedValue({
				data: [],
			});

			const result = await bridge.readPRFeedback("owner", "repo", 1);

			expect(result).toEqual([]);
		});

		it("propagates API errors", async () => {
			mocks.octokit.rest.issues.listComments.mockRejectedValue(
				new Error("Network error"),
			);

			await expect(bridge.readPRFeedback("owner", "repo", 1)).rejects.toThrow(
				"Network error",
			);
		});
	});
});
