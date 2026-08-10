import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilePreview } from '../FilePreview';

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

// Mock Prism
vi.mock('prismjs', () => ({
  default: {
    highlight: (code: string) => `<span>${code}</span>`,
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
}));

describe('FilePreview', () => {
  it('shows syntax-highlighted text for .ts files', async () => {
    mockGetFileContent.mockResolvedValue({
      content: 'const x = 1;',
      size: 12,
      isBinary: false,
    });

    render(<FilePreview path="/test.ts" onClose={vi.fn()} />);

    await screen.findByText('const x = 1;');
    expect(screen.queryByText('Binary file')).not.toBeInTheDocument();
  });

  it('shows fallback card for binary files', async () => {
    mockGetFileContent.mockResolvedValue({
      content: '',
      size: 1024,
      isBinary: true,
    });

    render(<FilePreview path="/test.png" onClose={vi.fn()} />);

    await screen.findByText(/Binary file/i);
  });

  it('shows fallback card for oversize files', async () => {
    mockGetFileContent.mockResolvedValue({
      content: '',
      size: 2 * 1024 * 1024, // 2MB
      isBinary: false,
    });

    render(<FilePreview path="/test.large" onClose={vi.fn()} />);

    await screen.findByText(/too large/i);
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    mockGetFileContent.mockResolvedValue({
      content: 'hello',
      size: 5,
      isBinary: false,
    });

    render(<FilePreview path="/test.txt" onClose={onClose} />);

    const closeBtn = await screen.findByTitle('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});