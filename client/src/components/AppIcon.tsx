import qrIconPath from '@assets/image_1772575316478.png';

interface AppIconProps {
  size?: number;
  isDark?: boolean;
}

export default function AppIcon({ size = 36, isDark = false }: AppIconProps) {
  return (
    <div
      className="relative overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <img
        src={qrIconPath}
        alt="Electracom QR"
        className="w-full h-full object-contain"
        style={{
          filter: isDark ? 'brightness(2.2) saturate(0.6)' : 'none',
        }}
      />
      <div
        className="absolute left-[15%] right-[15%] h-[2px] rounded-full"
        style={{
          background: isDark
            ? 'rgba(100,200,255,0.6)'
            : 'rgba(0,176,240,0.5)',
          boxShadow: isDark
            ? '0 0 6px 1px rgba(100,200,255,0.4)'
            : '0 0 6px 1px rgba(0,176,240,0.3)',
          animation: 'scanLine 2.4s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 18%; }
          50% { top: 72%; }
        }
      `}</style>
    </div>
  );
}
