import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FileTreePanel } from "../FileTreePanel";

// Mock window.api.filetree
const mockListDir = vi.fn();
const mockGetGitStatus = vi.fn();
const mockIsGitRepo = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();

	// Mock scrollIntoView to avoid test error
	Element.prototype.scrollIntoView = vi.fn();

	(window as any).api = {
		filetree: {
			listDir: mockListDir,
			getGitStatus: mockGetGitStatus,
			getFileContent: vi.fn(),
			copyPath: vi.fn(),
			revealInFileManager: vi.fn(),
			openInTerminal: vi.fn(),
			getActiveFiles: vi.fn().mockResolvedValue({ files: [] }),
		},
		isGitRepo: mockIsGitRepo,
	};
});

describe("FileTreePanel", () => {
	it("renders empty state when no project is active", () => {
		render(
			<FileTreePanel
				activeProject={null}
				onFileSelect={vi.fn()}
				isCollapsed={false}
				onToggleCollapse={vi.fn()}
			/>,
		);
		expect(screen.getByText("No files")).toBeInTheDocument();
	});

	it("expands directory on click and shows children", async () => {
		mockIsGitRepo.mockResolvedValue(false);
		mockListDir.mockResolvedValue({
			entries: [
				{
					name: "src",
					type: "directory",
					path: "/proj/src",
					hasChildren: true,
				},
				{ name: "package.json", type: "file", path: "/proj/package.json" },
			],
		});

		render(
			<FileTreePanel
				activeProject={{ path: "/proj" } as any}
				onFileSelect={vi.fn()}
				isCollapsed={false}
				onToggleCollapse={vi.fn()}
			/>,
		);

		// Wait for entries to load
		await vi.waitFor(() => {
			expect(screen.getByText("src")).toBeInTheDocument();
		});

		// Expand src directory
		fireEvent.click(screen.getByText("src"));

		// Lazy load should be triggered
		await vi.waitFor(() => {
			expect(mockListDir).toHaveBeenCalledWith("/proj/src");
		});
	});

	it("calls onFileSelect when a file is clicked", async () => {
		const onFileSelect = vi.fn();
		mockIsGitRepo.mockResolvedValue(false);
		mockListDir.mockResolvedValue({
			entries: [{ name: "README.md", type: "file", path: "/proj/README.md" }],
		});

		render(
			<FileTreePanel
				activeProject={{ path: "/proj" } as any}
				onFileSelect={onFileSelect}
				isCollapsed={false}
				onToggleCollapse={vi.fn()}
			/>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText("README.md")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText("README.md"));
		expect(onFileSelect).toHaveBeenCalledWith("/proj/README.md");
	});

	it("hides filter tabs when not a git repo", async () => {
		mockIsGitRepo.mockResolvedValue(false);
		mockListDir.mockResolvedValue({ entries: [] });

		render(
			<FileTreePanel
				activeProject={{ path: "/proj" } as any}
				onFileSelect={vi.fn()}
				isCollapsed={false}
				onToggleCollapse={vi.fn()}
			/>,
		);

		await vi.waitFor(() => {
			expect(screen.queryByText("All")).not.toBeInTheDocument();
		});
	});

	it("shows collapsed state with expand button", () => {
		render(
			<FileTreePanel
				activeProject={null}
				onFileSelect={vi.fn()}
				isCollapsed={true}
				onToggleCollapse={vi.fn()}
			/>,
		);
		expect(screen.getByTitle("Expand panel")).toBeInTheDocument();
	});
});
