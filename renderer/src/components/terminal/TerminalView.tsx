import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useSettingsContext } from '../../context/SettingsContext';
import { useSession } from '../../hooks/useSession';

type TerminalViewProps = {
  agentId?: string;
};

export function TerminalView({ agentId: propAgentId }: TerminalViewProps = {}) {
  const { agentId: paramAgentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const cwd = searchParams.get('cwd') || '';
  const agentId = propAgentId || paramAgentId;

  const terminalRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettingsContext();
  const terminal = settings?.terminal;

  useEffect(() => {
    if (!terminalRef.current || !agentId) return;


    const term = new Terminal({
      cursorBlink: true,
      fontSize: terminal?.fontSize ?? 14,
      fontFamily: terminal?.fontFamily ?? 'Geist Mono, monospace',
      cursorStyle: terminal?.cursorStyle ?? 'block',
      scrollbackLines: terminal?.scrollbackLines ?? 10000,
      theme: terminal?.theme === 'light'
        ? { background: '#ffffff', foreground: '#000000' }
        : { background: '#1e1e1e', foreground: '#e5e5e5' },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    if (terminal?.copyOnSelect) {
      term.onSelectionChange(() => {
        const selection = term.getSelection();
        if (selection) navigator.clipboard.writeText(selection);
      });
    }
    fitAddon.fit();

    const onDataDisposable = term.onData((data) => {
      write(data);
    });

    const unsubData = window.api.session.onData((evtAgentId, data) => {
      if (evtAgentId === agentId) {
        term.write(data);
      }
    });

    const unsubExit = window.api.session.onExit((evtAgentId) => {
      if (evtAgentId === agentId) {
        term.writeln('\r\n[Session ended]');
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const { cols, rows } = term;
      resize(cols, rows);
    });
    resizeObserver.observe(terminalRef.current);

    spawn(cwd).catch((err) => {
      term.writeln(`\r\nFailed to start session: ${err.message}`);
    });

    return () => {
      resizeObserver.disconnect();
      unsubData();
      unsubExit();
      onDataDisposable.dispose();
      term.dispose();
    };
  }, [agentId, cwd, spawn, write, resize, destroy, settings?.terminal]);

  return <div className="terminal-container" ref={terminalRef} />;
}
