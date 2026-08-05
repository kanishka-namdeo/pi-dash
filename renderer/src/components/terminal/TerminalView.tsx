import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useSession } from '../../hooks/useSession';

interface TerminalViewProps {
  agentId: string;
  cwd: string;
}

export function TerminalView({ agentId, cwd }: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { state, spawn, write, resize, destroy } = useSession(agentId);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, monospace',
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    // Forward terminal input to session
    const onDataDisposable = term.onData((data) => {
      write(data);
    });

    // Forward session output to terminal
    const unsubData = window.api.session.onData((evtAgentId, data) => {
      if (evtAgentId === agentId) {
        term.write(data);
      }
    });

    // Handle session exit
    const unsubExit = window.api.session.onExit((evtAgentId) => {
      if (evtAgentId === agentId) {
        term.writeln('\r\n[Session ended]');
      }
    });

    // Resize observer for responsive sizing
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const { cols, rows } = term;
      resize(cols, rows);
    });
    resizeObserver.observe(terminalRef.current);

    // Spawn session
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
  }, [agentId, cwd, spawn, write, resize, destroy]);

  return <div className="terminal-container" ref={terminalRef} />;
}
