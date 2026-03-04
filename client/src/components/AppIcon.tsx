import qrIconLight from '@assets/image_1772575316478.png';
import qrIconDark from '@assets/Screenshot_2026-03-03_221155-removebg-preview_1772575950459.png';

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
        src={isDark ? qrIconDark : qrIconLight}
        alt="Electracom QR"
        className="w-full h-full object-contain"
        style={{
          filter: isDark
            ? 'brightness(0) invert(1) brightness(0.85)'
            : 'brightness(0)',
        }}
      />
      <div
        className="absolute left-[15%] right-[15%] h-[2px] rounded-full"
        style={{
          background: '#2A5A9E',
          boxShadow: '0 0 8px 2px rgba(42,90,158,0.5)',
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
