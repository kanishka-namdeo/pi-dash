import type { CommandBlock } from '../../types/session';
import { AnsiText } from './AnsiText';

type CommandBlockViewProps = {
  block: CommandBlock;
  onToggleCollapse: (blockId: string) => void;
};

export function CommandBlockView({ block, onToggleCollapse }: CommandBlockViewProps) {
  if (!block.isMultiLine) {
    // Flat rendering for single-line output
    return (
      <div className="command-block-flat">
        <div className="command">$ {block.command}</div>
        <div className="output">
          <AnsiText text={block.output} />
        </div>
      </div>
    );
  }
  
  // Collapsible block for multi-line output
  return (
    <div className="command-block">
      <div 
        className="block-header"
        onClick={() => onToggleCollapse(block.id)}
      >
        <span>{block.isCollapsed ? '▶' : '▼'}</span>
        <span>$ {block.command}</span>
      </div>
      {!block.isCollapsed && (
        <div className="block-body">
          <AnsiText text={block.output} />
        </div>
      )}
    </div>
  );
}
