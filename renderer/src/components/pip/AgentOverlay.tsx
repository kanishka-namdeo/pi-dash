import { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { usePiPContext } from '../../context/PiPContext';
import { useSession } from '../../hooks/useSession';
import { useElapsedTimer } from '../../hooks/useElapsedTimer';
import type { Overlay, OverlayContentMode } from '../../types/pip';
import { SIZE_PRESETS } from '../../types/pip';

type AgentOverlayProps = {
  overlay: Overlay;
  agentName: string;
};

export function AgentOverlay({ overlay, agentName }: AgentOverlayProps) {
  const { actions } = usePiPContext();
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [contentMode, setContentMode] = useState<OverlayContentMode>('preview');
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!overlayRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(overlayRef.current);
    return () => observer.disconnect();
  }, []);

  const { state: sessionState, spawn, write, resize } = useSession(overlay.agentId);
  const { elapsed, start, stop } = useElapsedTimer();

  // Sync timer with session state
  useEffect(() => {
    if (sessionState === 'running') {
      start();
    } else {
      stop();
    }
  }, [sessionState, start, stop]);

  const formatElapsed = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || !isVisible || (contentMode !== 'preview' && contentMode !== 'rich')) return;

    const term = new Terminal({
      cursorBlink: false,
      fontSize: 12,
      fontFamily: 'Monaco, Menlo, monospace',
      scrollback: 100,
      theme: {
        background: '#0a0a0a',
        foreground: '#e5e5e5',
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    const onDataDisposable = term.onData((data) => {
      write(data);
    });

    const unsubData = window.api.session.onData((evtAgentId, data) => {
      if (evtAgentId === overlay.agentId) {
        term.write(data);
      }
    });

    const unsubExit = window.api.session.onExit((evtAgentId) => {
      if (evtAgentId === overlay.agentId) {
        term.writeln('\r\n[Session ended]');
      }
    });

    if (sessionState === 'idle') {
      spawn(process.cwd()).catch((err) => {
        term.writeln(`\r\nFailed to start session: ${err.message}`);
      });
    }

    return () => {
      unsubData();
      unsubExit();
      onDataDisposable.dispose();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [overlay.agentId, contentMode, isVisible]);

  // Fit terminal on resize
  useEffect(() => {
    if (fitAddonRef.current && termRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
        if (termRef.current) {
          const { cols, rows } = termRef.current;
          resize(cols, rows);
        }
      }, 0);
    }
  }, [overlay.width, overlay.height]);

  const handleDragStop = (_e: MouseEvent | React.MouseEvent, data: { x: number; y: number }) => {
    actions.updateOverlayPosition(overlay.agentId, data.x, data.y);
    setIsDragging(false);
  };


  const handleResizeStop = (
    _e: MouseEvent | React.MouseEvent,
    _dir: string,
    ref: HTMLElement,
    _delta: { width: number; height: number },
    position: { x: number; y: number }
  ) => {
    const width = parseInt(ref.style.width);
    const height = parseInt(ref.style.height);

    let size: 'S' | 'M' | 'L' = 'M';
    if (width <= 300) size = 'S';
    else if (width >= 500) size = 'L';

    actions.updateOverlaySize(overlay.agentId, width, height, size);
    actions.updateOverlayPosition(overlay.agentId, position.x, position.y);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.removeOverlay(overlay.agentId);
  };

  const handlePromote = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.promoteToMain(overlay.agentId);
  };

  const handleCycleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modes: OverlayContentMode[] = ['minimal', 'preview', 'rich'];
    const currentIndex = modes.indexOf(contentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setContentMode(modes[nextIndex]);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sizes: Array<'S' | 'M' | 'L'> = ['S', 'M', 'L'];
    const currentIndex = sizes.indexOf(overlay.size);
    const nextIndex = (currentIndex + 1) % sizes.length;
    const newSize = sizes[nextIndex];
    const preset = SIZE_PRESETS[newSize];

    actions.updateOverlaySize(overlay.agentId, preset.width, preset.height, newSize);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      actions.promoteToMain(overlay.agentId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      actions.removeOverlay(overlay.agentId);
    }
  };
  const statusColor = sessionState === 'running' ? '#3b82f6' : sessionState === 'exited' ? '#dc2626' : '#737373';

  return (
    <Rnd
      default={{
        x: overlay.x,
        y: overlay.y,
        width: overlay.width,
        height: overlay.height,
      }}
      position={{ x: overlay.x, y: overlay.y }}
      size={{ width: overlay.width, height: overlay.height }}
      minWidth={200}
      minHeight={120}
      bounds="parent"
      dragHandleClassName="overlay-header"
      style={{
        zIndex: overlay.zIndex,
        transition: isDragging ? 'none' : 'transform 0.1s ease',
        willChange: isDragging ? 'transform' : 'auto',
      }}
      className={`group ${isDragging && !prefersReducedMotion ? 'scale-[0.98]' : ''}`}
      onDragStart={() => setIsDragging(true)}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onClick={() => actions.bringOverlayToFront(overlay.agentId)}
      <div
        ref={overlayRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="h-full flex flex-col bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] overflow-hidden focus-within:outline focus-within:outline-2 focus-within:outline-[#3b82f6]"
      >
        {/* Header */}
        <div
          className="overlay-header flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border-b border-[#2a2a2a] cursor-move select-none"
          onClick={handlePromote}
          onDoubleClick={handleDoubleClick}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-xs font-medium text-[#e5e5e5] flex-1 truncate">
            {agentName}
          </span>
          <button
            onClick={handleCycleMode}
            className="p-1 rounded hover:bg-[#2a2a2a] text-[#737373] hover:text-[#e5e5e5] transition-colors"
            title="Toggle view mode"
          >
            {contentMode === 'minimal' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-[#dc2626] text-[#737373] hover:text-white transition-colors"
            title="Close overlay"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {contentMode === 'minimal' ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center">
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: statusColor }}
                />
                <p className="text-[10px] uppercase tracking-wide text-[#737373]">
                  {sessionState}
                </p>
              </div>
            </div>
          ) : contentMode === 'preview' ? (
            <div ref={terminalRef} className="w-full h-full" />
          ) : (
            // Rich mode: terminal + metrics
            <div className="h-full flex flex-col">
              <div ref={terminalRef} className="flex-1 min-h-0" />
              <div className="flex items-center gap-3 px-3 py-1.5 bg-[#0a0a0a] border-t border-[#2a2a2a] text-[10px] text-[#737373]">
                <span className="uppercase tracking-wide">
                  {sessionState}
                </span>
                {sessionState === 'running' && (
                  <span className="font-mono">
                    {formatElapsed(elapsed)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Rnd>
  );
}
