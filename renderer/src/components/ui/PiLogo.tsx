interface PiLogoProps {
  size?: number;
}

export function PiLogo({ size = 40 }: PiLogoProps) {
  return (
    <div
      className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
      style={{ width: size, height: size }}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.5 }}>
        π
      </span>
    </div>
  );
}
