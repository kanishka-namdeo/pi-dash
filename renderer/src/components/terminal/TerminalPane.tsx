import { useRef, useEffect } from 'react';
import { useAgentSession } from '../../hooks/useAgentSession';
import { CommandBlockView } from './CommandBlock';

export function TerminalPane({ agentId }: { agentId: string }) {
  const {
    state,
    blocks,
    currentInput,
    submitCommand,
    setInput,
    toggleCollapse,
    historyBack,
    historyForward,
  } = useAgentSession(agentId);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [blocks]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentInput.trim()) {
      submitCommand(currentInput.trim());
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = historyBack();
      if (prev !== null) setInput(prev);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyForward();
      if (next !== null) setInput(next);
    }
  };

  const isInputDisabled = state === 'working' || state === 'paused' || state === 'killed';

  return (
    <div className="terminal-pane">
      <div className="terminal-content" ref={scrollRef}>
        {blocks.map(block => (
          <CommandBlockView
            key={block.id}
            block={block}
            onToggleCollapse={toggleCollapse}
          />
        ))}
      </div>

      <div className="terminal-input-container">
        <span>$ </span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isInputDisabled}
          placeholder={state === 'killed' ? 'Session terminated' : 'Type a command...'}
        />
        {state === 'working' && <span className="spinner">⟳</span>}
      </div>
    </div>
  );
}
