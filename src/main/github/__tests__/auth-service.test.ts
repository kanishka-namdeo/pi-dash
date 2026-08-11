import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Mock } from "vitest";
import { githubService } from "../github-service";
import { AuthService } from "../auth-service";

// --- Hoisted mock instances (vi.hoisted runs before vi.mock factories) ---

const { mockOAuthServer, mockAuthWindow } = vi.hoisted(() => {
	return {
		mockOAuthServer: {
			start: vi.fn(),
			waitForCode: vi.fn(),
			stop: vi.fn(),
		},
		mockAuthWindow: {
			loadURL: vi.fn(),
			close: vi.fn(),
		},
	};
});

// --- Module mocks ---

vi.mock("../oauth-server", () => ({
	OAuthServer: class {
		start = mockOAuthServer.start;
		waitForCode = mockOAuthServer.waitForCode;
		stop = mockOAuthServer.stop;
	},
}));

vi.mock("electron", () => ({
	BrowserWindow: class {
		loadURL = mockAuthWindow.loadURL;
		close = mockAuthWindow.close;
	},
}));

vi.mock("electron-store", () => {
	class MockStore {
		private data: any = {};
		constructor(options?: any) {
			this.data = options?.defaults || {};
		}
		get(key: string) {
			return this.data[key];
		}
		set(key: string, value: any) {
			this.data[key] = value;
		}
	}
	return { default: MockStore };
});

// --- Typed references for test assertions ---

interface MockOAuthServer {
	start: Mock;
	waitForCode: Mock;
	stop: Mock;
}

interface MockAuthWindow {
	loadURL: Mock;
	close: Mock;
}

const oauthServerMock = mockOAuthServer as MockOAuthServer;
const authWindowMock = mockAuthWindow as MockAuthWindow;

// --- Tests ---

describe("AuthService - PAT", () => {
	let authService: InstanceType<typeof AuthService>;

	beforeEach(() => {
		vi.clearAllMocks();
		authService = new AuthService(githubService);
		githubService.clearToken();
	});

	it("validates valid PAT and stores token", async () => {
		const mockToken = "ghp_test123";
		const mockUser = {
			id: 1,
			login: "testuser",
			avatar_url: "https://example.com/avatar.png",
		};

		const mockOctokit = {
			rest: {
				users: {
					getAuthenticated: vi.fn().mockResolvedValue({ data: mockUser }),
				},
			},
		};
		vi.spyOn(githubService, "getOctokit").mockReturnValue(
			mockOctokit as unknown as ReturnType<typeof githubService.getOctokit>,
		);

		const result = await authService.authenticatePAT(mockToken);
		expect(result.success).toBe(true);
		expect(authService.getToken()).toBe(mockToken);
	});

	it("rejects invalid PAT", async () => {
		const mockOctokit = {
			rest: {
				users: {
					getAuthenticated: vi
						.fn()
						.mockRejectedValue(new Error("Bad credentials")),
				},
			},
		};
		vi.spyOn(githubService, "getOctokit").mockReturnValue(
			mockOctokit as unknown as ReturnType<typeof githubService.getOctokit>,
		);

		const result = await authService.authenticatePAT("invalid-token");
		expect(result.success).toBe(false);
		expect(result.error).toContain("Invalid token");
	});
});

describe("AuthService - OAuth", () => {
	let authService: InstanceType<typeof AuthService>;
	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };

		// Reset mock implementations
		oauthServerMock.start.mockResolvedValue({ port: 9876 });
		oauthServerMock.waitForCode.mockResolvedValue({
			code: "test_code",
			state: "test_state",
		});
		oauthServerMock.stop.mockImplementation(() => {});
		authWindowMock.loadURL.mockResolvedValue(undefined);
		authWindowMock.close.mockImplementation(() => {});

		authService = new AuthService(githubService);
		githubService.clearToken();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("rejects OAuth when credentials are placeholders", async () => {
		process.env.GITHUB_OAUTH_CLIENT_ID = "YOUR_GITHUB_OAUTH_CLIENT_ID";
		process.env.GITHUB_OAUTH_CLIENT_SECRET = "YOUR_GITHUB_OAUTH_CLIENT_SECRET";

		const result = await authService.authenticateOAuth();
		expect(result.success).toBe(false);
		expect(result.error).toContain("OAuth credentials not configured");
	});

	it("rejects OAuth when credentials are missing", async () => {
		delete process.env.GITHUB_OAUTH_CLIENT_ID;
		delete process.env.GITHUB_OAUTH_CLIENT_SECRET;

		const result = await authService.authenticateOAuth();
		expect(result.success).toBe(false);
		expect(result.error).toContain("OAuth credentials not configured");
	});

	it("completes OAuth flow successfully", async () => {
		process.env.GITHUB_OAUTH_CLIENT_ID = "test_client_id";
		process.env.GITHUB_OAUTH_CLIENT_SECRET = "test_client_secret";

		const mockUser = {
			id: 123,
			login: "oauthuser",
			avatar_url: "https://example.com/avatar.png",
		};
		const mockOctokit = {
			rest: {
				users: {
					getAuthenticated: vi.fn().mockResolvedValue({ data: mockUser }),
				},
			},
		};
		vi.spyOn(githubService, "getOctokit").mockReturnValue(
			mockOctokit as unknown as ReturnType<typeof githubService.getOctokit>,
		);

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ access_token: "gho_test_token_123" }),
		});
		global.fetch = mockFetch;

		// Mock crypto.randomUUID so state matches between auth URL and callback
		const generatedState = "generated_csrf_state";
		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			generatedState as `${string}-${string}-${string}-${string}-${string}`,
		);
		oauthServerMock.waitForCode.mockResolvedValue({
			code: "test_code",
			state: generatedState,
		});

		const result = await authService.authenticateOAuth();

		expect(result.success).toBe(true);
		expect(authService.getToken()).toBe("gho_test_token_123");
		expect(oauthServerMock.start).toHaveBeenCalled();
		expect(oauthServerMock.waitForCode).toHaveBeenCalled();
		expect(oauthServerMock.stop).toHaveBeenCalled();
		expect(authWindowMock.close).toHaveBeenCalled();
		expect(mockFetch).toHaveBeenCalledWith(
			"https://github.com/login/oauth/access_token",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					"Content-Type": "application/json",
					Accept: "application/json",
				}),
			}),
		);
	});

	it("rejects OAuth when state validation fails (CSRF protection)", async () => {
		process.env.GITHUB_OAUTH_CLIENT_ID = "test_client_id";
		process.env.GITHUB_OAUTH_CLIENT_SECRET = "test_client_secret";

		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			"expected_state" as `${string}-${string}-${string}-${string}-${string}`,
		);
		oauthServerMock.waitForCode.mockResolvedValue({
			code: "test_code",
			state: "wrong_state",
		});

		const result = await authService.authenticateOAuth();

		expect(result.success).toBe(false);
		expect(result.error).toContain("state mismatch");
		expect(oauthServerMock.stop).toHaveBeenCalled();
		expect(authWindowMock.close).toHaveBeenCalled();
	});

	it("handles token exchange failure", async () => {
		process.env.GITHUB_OAUTH_CLIENT_ID = "test_client_id";
		process.env.GITHUB_OAUTH_CLIENT_SECRET = "test_client_secret";

		const generatedState = "test_state";
		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			generatedState as `${string}-${string}-${string}-${string}-${string}`,
		);
		oauthServerMock.waitForCode.mockResolvedValue({
			code: "test_code",
			state: generatedState,
		});

		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 400,
			statusText: "Bad Request",
		});

		const result = await authService.authenticateOAuth();

		expect(result.success).toBe(false);
		expect(result.error).toContain("OAuth authentication failed");
		expect(oauthServerMock.stop).toHaveBeenCalled();
		expect(authWindowMock.close).toHaveBeenCalled();
	});

	it("handles user fetch failure after token exchange", async () => {
		process.env.GITHUB_OAUTH_CLIENT_ID = "test_client_id";
		process.env.GITHUB_OAUTH_CLIENT_SECRET = "test_client_secret";

		const generatedState = "test_state";
		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			generatedState as `${string}-${string}-${string}-${string}-${string}`,
		);
		oauthServerMock.waitForCode.mockResolvedValue({
			code: "test_code",
			state: generatedState,
		});

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ access_token: "gho_test_token" }),
		});

		const mockOctokit = {
			rest: {
				users: {
					getAuthenticated: vi.fn().mockRejectedValue(new Error("API error")),
				},
			},
		};
		vi.spyOn(githubService, "getOctokit").mockReturnValue(
			mockOctokit as unknown as ReturnType<typeof githubService.getOctokit>,
		);

		const result = await authService.authenticateOAuth();

		expect(result.success).toBe(false);
		expect(result.error).toContain("OAuth authentication failed");
		expect(oauthServerMock.stop).toHaveBeenCalled();
		expect(authWindowMock.close).toHaveBeenCalled();
	});

	it("cleans up resources on waitForCode timeout", async () => {
		process.env.GITHUB_OAUTH_CLIENT_ID = "test_client_id";
		process.env.GITHUB_OAUTH_CLIENT_SECRET = "test_client_secret";

		oauthServerMock.waitForCode.mockRejectedValue(new Error("OAuth timeout"));

		const result = await authService.authenticateOAuth();

		expect(result.success).toBe(false);
		expect(result.error).toContain("OAuth authentication failed");
		expect(oauthServerMock.stop).toHaveBeenCalled();
		expect(authWindowMock.close).toHaveBeenCalled();
	});
});

describe("AuthService - exchangeCodeForToken", () => {
	let authService: InstanceType<typeof AuthService>;

	beforeEach(() => {
		vi.clearAllMocks();
		authService = new AuthService(githubService);
	});

	// Typed accessor for the private method under test
	function callExchange(
		code: string,
		clientId: string,
		clientSecret: string,
	): Promise<string> {
		const target = authService as unknown as {
			exchangeCodeForToken: (
				c: string,
				ci: string,
				cs: string,
			) => Promise<string>;
		};
		return target.exchangeCodeForToken.call(
			authService,
			code,
			clientId,
			clientSecret,
		);
	}

	it("throws on non-ok response", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 403,
			statusText: "Forbidden",
		});

		await expect(
			callExchange("code", "client_id", "client_secret"),
		).rejects.toThrow("Token exchange failed: 403 Forbidden");
	});

	it("throws when response has no access_token", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ error: "bad_verification_code" }),
		});

		await expect(
			callExchange("code", "client_id", "client_secret"),
		).rejects.toThrow("no access_token in response");
	});

	it("returns access_token on success", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ access_token: "gho_success_token" }),
		});
		global.fetch = mockFetch;

		const token = await callExchange("code", "client_id", "client_secret");

		expect(token).toBe("gho_success_token");
		expect(mockFetch).toHaveBeenCalledWith(
			"https://github.com/login/oauth/access_token",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					client_id: "client_id",
					client_secret: "client_secret",
					code: "code",
				}),
			}),
		);
	});
});
