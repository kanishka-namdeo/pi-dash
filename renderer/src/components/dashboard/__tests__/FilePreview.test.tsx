import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FilePreview } from "../FilePreview";

const mockGetFileContent = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();

	(window as any).api = {
		filetree: {
			getFileContent: mockGetFileContent,
			revealInFileManager: vi.fn(),
			openInTerminal: vi.fn(),
		},
	};
});

// Mock Prism - the component uses dynamic import('prismjs')
vi.mock("prismjs", () => ({
	__esModule: true,
	default: {
		highlight: (code: string) => `<span>${code}</span>`,
		highlightAll: vi.fn(),
		languages: {
			typescript: {},
			javascript: {},
			python: {},
			css: {},
			json: {},
			markdown: {},
			bash: {},
			yaml: {},
			toml: {},
			rust: {},
			go: {},
			java: {},
			c: {},
			cpp: {},
			csharp: {},
			sql: {},
			html: {},
			xml: {},
			plaintext: {},
		},
	},
	highlight: (code: string) => `<span>${code}</span>`,
	highlightAll: vi.fn(),
	languages: {
		typescript: {},
		javascript: {},
		plaintext: {},
	},
}));

describe("FilePreview", () => {
	it("shows fallback card for binary files", async () => {
		mockGetFileContent.mockResolvedValue({
			content: "",
			size: 1024,
			isBinary: true,
		});

		render(<FilePreview path="/test.png" onClose={vi.fn()} />);

		await waitFor(
			() => {
				expect(screen.getByText(/Binary file/i)).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});

	it("shows fallback card for oversize files", async () => {
		mockGetFileContent.mockResolvedValue({
			content: "",
			size: 2 * 1024 * 1024, // 2MB
			isBinary: false,
		});

		render(<FilePreview path="/test.large" onClose={vi.fn()} />);

		await waitFor(
			() => {
				expect(screen.getByText(/too large/i)).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});

	it("calls onClose when close button is clicked", async () => {
		const onClose = vi.fn();
		mockGetFileContent.mockResolvedValue({
			content: "hello",
			size: 5,
			isBinary: false,
		});

		render(<FilePreview path="/test.txt" onClose={onClose} />);

		// Wait for the component to load and render
		await waitFor(
			() => {
				const closeBtn = screen.getByTitle("Close");
				expect(closeBtn).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);

		fireEvent.click(screen.getByTitle("Close"));
		expect(onClose).toHaveBeenCalled();
	});

	it("shows file content for text files", async () => {
		mockGetFileContent.mockResolvedValue({
			content: "const x = 1;",
			size: 12,
			isBinary: false,
		});

		render(<FilePreview path="/test.ts" onClose={vi.fn()} />);

		// Wait for content to load and display
		await waitFor(
			() => {
				expect(screen.queryByText(/Binary file/i)).not.toBeInTheDocument();
				expect(screen.queryByText(/too large/i)).not.toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});
});
