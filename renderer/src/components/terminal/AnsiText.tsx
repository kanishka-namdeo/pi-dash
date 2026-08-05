import { parseAnsi } from '../../lib/ansiParser';

export function AnsiText({ text }: { text: string }) {
  const spans = parseAnsi(text);
  
  return (
    <>
      {spans.map((span, i) => (
        <span
          key={i}
          style={{
            fontWeight: span.bold ? 'bold' : 'normal',
            color: span.color || 'inherit',
          }}
        >
          {span.text}
        </span>
      ))}
    </>
  );
}
