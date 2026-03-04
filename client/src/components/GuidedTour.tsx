import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  steps: TourStep[];
  tourKey: string;
  active: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const PULSE_STYLE = `
@keyframes ec-tour-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.15);
  }
  100% {
    box-shadow: 0 0 0 16px rgba(59, 130, 246, 0);
  }
}
@keyframes ec-tour-glow {
  0%, 100% {
    box-shadow: 0 0 4px 2px rgba(59, 130, 246, 0.4), 0 0 0 0 rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 8px 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.1);
  }
}
`;

function getTooltipPosition(
  targetRect: DOMRect,
  position: 'top' | 'bottom' | 'left' | 'right',
  tooltipW: number,
  tooltipH: number
): { top: number; left: number; actualPos: string } {
  const gap = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const positions: Record<string, { top: number; left: number }> = {
    bottom: {
      top: targetRect.bottom + gap,
      left: targetRect.left + targetRect.width / 2 - tooltipW / 2,
    },
    top: {
      top: targetRect.top - tooltipH - gap,
      left: targetRect.left + targetRect.width / 2 - tooltipW / 2,
    },
    right: {
      top: targetRect.top + targetRect.height / 2 - tooltipH / 2,
      left: targetRect.right + gap,
    },
    left: {
      top: targetRect.top + targetRect.height / 2 - tooltipH / 2,
      left: targetRect.left - tooltipW - gap,
    },
  };

  const tryOrder = [position, 'bottom', 'top', 'right', 'left'];
  for (const pos of tryOrder) {
    const p = positions[pos];
    if (p.top >= 8 && p.top + tooltipH <= vh - 8 && p.left >= 8 && p.left + tooltipW <= vw - 8) {
      return { top: p.top, left: p.left, actualPos: pos };
    }
  }

  let { top, left } = positions[position];
  top = Math.max(8, Math.min(top, vh - tooltipH - 8));
  left = Math.max(8, Math.min(left, vw - tooltipW - 8));
  return { top, left, actualPos: position };
}

export default function GuidedTour({ steps, tourKey, active, onComplete, onSkip }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    setCurrentStep(0);
    setTargetRect(null);
    setTooltipPos(null);
  }, [tourKey, steps]);

  useEffect(() => {
    if (!active) return;
    const style = document.createElement('style');
    style.textContent = PULSE_STYLE;
    document.head.appendChild(style);
    styleRef.current = style;
    return () => {
      style.remove();
    };
  }, [active]);

  const updatePosition = useCallback((shouldScroll = false) => {
    if (!active || currentStep >= steps.length) return;
    const step = steps[currentStep];
    const el = document.querySelector(`[data-testid="${step.target}"]`);
    if (!el) {
      setTargetRect(null);
      setTooltipPos(null);
      return;
    }

    if (shouldScroll) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      const tooltipW = 320;
      const tooltipH = 160;
      const pos = getTooltipPosition(rect, step.position || 'bottom', tooltipW, tooltipH);
      setTooltipPos({ top: pos.top, left: pos.left });
    });
  }, [active, currentStep, steps]);

  useEffect(() => {
    updatePosition(true);
  }, [currentStep, active, steps]);

  useEffect(() => {
    const poll = () => updatePosition(false);
    const interval = setInterval(poll, 500);
    window.addEventListener('resize', poll);
    window.addEventListener('scroll', poll, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', poll);
      window.removeEventListener('scroll', poll, true);
    };
  }, [updatePosition]);

  const markComplete = useCallback(() => {
    try {
      localStorage.setItem(tourKey, 'true');
    } catch {}
  }, [tourKey]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      markComplete();
      onComplete();
    }
  }, [currentStep, steps.length, markComplete, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    markComplete();
    onSkip();
  }, [markComplete, onSkip]);

  if (!active || steps.length === 0) return null;
  if (currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const pad = 6;

  return (
    <>
      <div
        data-testid="tour-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          pointerEvents: 'none',
        }}
      />

      {targetRect && (
        <div
          data-testid="tour-highlight"
          style={{
            position: 'fixed',
            top: targetRect.top - pad,
            left: targetRect.left - pad,
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
            borderRadius: 8,
            border: '2px solid rgba(59, 130, 246, 0.6)',
            animation: 'ec-tour-glow 2s ease-in-out infinite',
            zIndex: 99999,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: 12,
              animation: 'ec-tour-pulse 2s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {tooltipPos && (
        <div
          ref={tooltipRef}
          data-testid="tour-tooltip"
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: 320,
            zIndex: 100000,
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              padding: 16,
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
              <span
                data-testid="tour-step-counter"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'hsl(var(--primary))',
                  letterSpacing: '0.02em',
                }}
              >
                Step {currentStep + 1} of {steps.length}
              </span>
              <button
                data-testid="button-tour-exit"
                onClick={handleSkip}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'hsl(var(--muted-foreground))',
                  padding: '2px 4px',
                  borderRadius: 4,
                }}
              >
                <X size={12} />
                Exit tour
              </button>
            </div>

            <h4
              data-testid="tour-step-title"
              style={{
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 6,
                lineHeight: 1.3,
              }}
            >
              {step.title}
            </h4>

            <p
              data-testid="tour-step-description"
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: 'hsl(var(--muted-foreground))',
                margin: 0,
                marginBottom: 14,
              }}
            >
              {step.description}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {steps.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: i === currentStep ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      transition: 'background 0.2s',
                    }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {currentStep > 0 && (
                  <button
                    data-testid="button-tour-back"
                    onClick={handleBack}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid hsl(var(--border))',
                      background: 'transparent',
                      color: 'hsl(var(--foreground))',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    <ChevronLeft size={14} />
                    Back
                  </button>
                )}
                <button
                  data-testid="button-tour-next"
                  onClick={handleNext}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                  {currentStep < steps.length - 1 && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function isTourCompleted(tourKey: string): boolean {
  try {
    return localStorage.getItem(tourKey) === 'true';
  } catch {
    return false;
  }
}

export function resetTour(tourKey: string): void {
  try {
    localStorage.removeItem(tourKey);
  } catch {}
}
