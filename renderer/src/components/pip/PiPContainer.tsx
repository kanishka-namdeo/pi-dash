import type { ReactNode } from 'react';

type PiPContainerProps = {
  children: ReactNode;
};

export function PiPContainer({ children }: PiPContainerProps) {
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        display: 'grid',
        gridTemplate: '1fr / 1fr',
      }}
    >
      {children}
    </div>
  );
}
