import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Maximize2, RefreshCw, FileCode, ZoomOut, ZoomIn, Terminal, Search, Eye, EyeOff } from 'lucide-react';

type FilePreviewProps = {
  path: string;
  onClose: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
};

type FileContentResult = {
  content: string;
  size: number;
  isBinary: boolean;
};

export function FilePreview({ path, onClose, onExpand, isExpanded }: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isMarkdownMode, setIsMarkdownMode] = useState<boolean>(true);
  const [prism, setPrism] = useState<any>(null);
  const [language, setLanguage] = useState<string>('plaintext');
  const preRef = useRef<HTMLPreElement>(null);

  // Language detection
  const getLanguageFromExtension = useCallback((filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    const extMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      css: 'css',
      scss: 'css',
      sass: 'css',
      less: 'css',
      json: 'json',
      md: 'markdown',
      markdown: 'markdown',
      sh: 'bash',
      bash: 'bash',
      zsh: 'bash',
      yml: 'yaml',
      yaml: 'yaml',
      toml: 'toml',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'cpp',
      cpp: 'cpp',
      cc: 'cpp',
      cs: 'csharp',
      sql: 'sql',
      html: 'html',
      htm: 'html',
      xml: 'xml',
      svg: 'xml',
    };
    return extMap[extension] || 'plaintext';
  }, []);

  useEffect(() => {
    // Load Prism dynamically
    const loadPrism = async () => {
      try {
        const Prism = await import('prismjs');
        setPrism(Prism);
      } catch (err) {
        console.error('Failed to load Prism:', err);
      }
    };
    loadPrism();
  }, []);

  useEffect(() => {
    if (!path) return;

    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result: FileContentResult = await window.api.filetree.getFileContent(path);
        setContent(result.content);
        setFileSize(result.size);
        setLanguage(getLanguageFromExtension(path));
        setIsLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Could not read file');
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [path, getLanguageFromExtension]);

  useEffect(() => {
    if (prism && preRef.current && content !== null) {
      setTimeout(() => {
        try {
          prism.highlightAll();
        } catch (err) {
          console.error('Prism highlight error:', err);
        }
      }, 0);
    }
  }, [content, language, prism]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleRetry = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result: FileContentResult = await window.api.filetree.getFileContent(path);
      setContent(result.content);
      setFileSize(result.size);
      setIsLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Could not read file');
      setIsLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 500));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 25));
  };

  const handleFitToView = () => {
    setZoomLevel(100);
  };

  const handleZoomModalClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsZoomModalOpen(false);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isZoomModalOpen) {
      setIsZoomModalOpen(false);
    }
  }, [isZoomModalOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const displayContent = content;

  return (
    <div
      className={`flex flex-col h-full${isExpanded ? ' fixed inset-0 z-50' : ''}`}
      style={{
        backgroundColor: 'var(--bg)',
        position: isExpanded ? 'fixed' : 'relative',
        top: isExpanded ? 0 : undefined,
        left: isExpanded ? 0 : undefined,
        width: isExpanded ? '100vw' : '100%',
        height: isExpanded ? '100vh' : '100%',
        zIndex: isExpanded ? 9999 : undefined,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--card)',
        }}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <span
            className="text-xs font-mono truncate max-w-[200px] md:max-w-[300px] lg:max-w-[400px] xl:max-w-[500px] 2xl:max-w-[600px]"
            style={{ color: 'var(--text-primary)' }}
            title={path}
          >
            {path}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--bg)',
              color: 'var(--text-muted)',
            }}
          >
            {formatFileSize(fileSize)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onExpand && (
            <button
              onClick={onExpand}
              className="w-8 h-8 rounded flex items-center justify-center hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
              title="Expand (fullscreen)"
            >
              <Maximize2 size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{
            borderColor: 'var(--status-conflict)',
            backgroundColor: '#450a0a',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-xs"
              style={{ color: '#fca5a5' }}
            >
              {error}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRetry}
              className="px-3 py-1 text-xs rounded hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--accent-emerald)',
                color: '#fff',
              }}
            >
              <RefreshCw size={12} className="inline mr-1" />
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs rounded hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--status-conflict)',
                color: '#fff',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto relative">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div
              className="w-5 h-5 border-2 border-t-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--text-muted)', borderTopColor: 'var(--text-primary)' }}
            />
          </div>
        )}

        {/* Binary File Fallback */}
        {content && content.startsWith('Binary file') && (
          <div
            className="max-w-md mx-auto p-6 mt-8 rounded-lg border text-center space-y-4"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--card)',
            }}
          >
            <div className="flex justify-center">
              <FileCode size={48} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <h3
                className="text-base font-semibold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Binary File
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                This file appears to be binary and cannot be previewed as text.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={async () => {
                  try {
                    await window.api.filetree.revealInFileManager(path);
                  } catch (err) {
                    console.error('Failed to reveal:', err);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--accent-indigo)', color: '#fff' }}
              >
                <Search size={14} />
                Reveal in File Manager
              </button>
              <button
                onClick={async () => {
                  try {
                    await window.api.filetree.openInTerminal(path);
                  } catch (err) {
                    console.error('Failed to open terminal:', err);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                <Terminal size={14} />
                Open in Terminal
              </button>
            </div>
          </div>
        )}

        {/* Oversize File Fallback */}
        {content && fileSize > 1024 * 1024 && (
          <div
            className="max-w-md mx-auto p-6 mt-8 rounded-lg border text-center space-y-4"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--card)',
            }}
          >
            <div className="flex justify-center">
              <FileCode size={48} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <h3
                className="text-base font-semibold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                File Too Large
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                This file ({formatFileSize(fileSize)}) exceeds the 1MB preview limit.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={async () => {
                  try {
                    await window.api.filetree.revealInFileManager(path);
                  } catch (err) {
                    console.error('Failed to reveal:', err);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--accent-indigo)', color: '#fff' }}
              >
                <Search size={14} />
                Reveal in File Manager
              </button>
              <button
                onClick={async () => {
                  try {
                    await window.api.filetree.openInTerminal(path);
                  } catch (err) {
                    console.error('Failed to open terminal:', err);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                <Terminal size={14} />
                Open in Terminal
              </button>
            </div>
          </div>
        )}

        {/* Image Preview */}
        {content && !isLoading && !error && (
          <div
            className="w-full h-full flex flex-col"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            {/* Toolbar */}
            <div
              className="flex items-center justify-between px-4 py-2 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMarkdownMode(!isMarkdownMode)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs rounded hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: isMarkdownMode ? 'var(--accent-indigo)' : 'var(--bg)',
                    color: isMarkdownMode ? '#fff' : 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {isMarkdownMode ? <Eye size={12} /> : <EyeOff size={12} />}
                  {isMarkdownMode ? 'Rendered' : 'Source'}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleZoomOut}
                  className="w-8 h-8 rounded flex items-center justify-center hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={handleFitToView}
                  className="w-8 h-8 rounded flex items-center justify-center hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                  title="Fit to View"
                >
                  <Maximize2 size={14} />
                </button>
                <button
                  onClick={handleZoomIn}
                  className="w-8 h-8 rounded flex items-center justify-center hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <span
                  className="text-xs w-10 text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {zoomLevel}%
                </span>
              </div>
            </div>

            {/* Image/Content Container */}
            <div
              className="flex-1 overflow-auto flex items-center justify-center p-8"
              onClick={handleZoomModalClose}
            >
              {path.toLowerCase().match(/\.(png|jpe?g|gif|bmp|webp|ico|svg)$/i) ? (
                <img
                  src={`file:///${path.replace(/\\/g, '/')}`}
                  alt="Preview"
                  style={{
                    maxHeight: 'calc(100vh - 150px)',
                    maxWidth: '100%',
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'center center',
                  }}
                />
              ) : (
                <pre
                  ref={preRef}
                  className={`text-xs md:text-sm lg:text-base font-mono p-4 m-0 overflow-auto`}
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                >
                  <code
                    className={`language-${language}`}
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{
                      __html: prism
                        ? prism.highlight(displayContent, prism.languages[language], language)
                        : displayContent,
                    }}
                  />
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expand Modal */}
      {isZoomModalOpen && (
        <div
          className="fixed inset-0 z-[10000] flex flex-col"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
          }}
          onClick={handleZoomModalClose}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <span
              className="text-xs font-mono truncate max-w-xs"
              style={{ color: 'var(--text-primary)' }}
            >
              {path}
            </span>
            <button
              onClick={() => setIsZoomModalOpen(false)}
              className="w-8 h-8 rounded flex items-center justify-center hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div
              className="max-w-full max-h-full"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
              }}
            >
              {content && (
                <pre
                  className={`text-xs md:text-sm lg:text-base font-mono p-8 m-0 overflow-auto`}
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                >
                  <code
                    className={`language-${language}`}
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{
                      __html: prism
                        ? prism.highlight(content, prism.languages[language], language)
                        : content,
                    }}
                  />
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
