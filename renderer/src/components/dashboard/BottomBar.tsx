export function BottomBar() {
  return (
    <footer
      data-testid="bottom-bar"
      className="flex items-center justify-between px-4 h-9"
      style={{
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        height: '36px',
      }}
    >
      <div data-testid="bottom-bar-left" className="flex items-center gap-3" />
      <div data-testid="bottom-bar-center" className="flex-1 flex justify-center items-center" />
      <div data-testid="bottom-bar-right" className="flex items-center gap-4" />
    </footer>
  );
}
