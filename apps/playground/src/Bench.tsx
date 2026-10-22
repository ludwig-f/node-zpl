import type { ReactNode } from "react";

/** Screen pixels per millimeter at most, so small labels aren't blown up */
const MAX_PX_PER_MM = 6;

type BenchProps = {
  widthMm: number;
  heightMm: number;
  children: ReactNode;
};

/**
 * The label on its backing paper, under a millimeter ruler that matches the
 * label's width
 */
export default function Bench({ widthMm, heightMm, children }: BenchProps) {
  // Ticks every millimeter, or every 5 mm on wide labels to stay readable
  const step = widthMm > 120 ? 5 : 1;
  const ticks = Array.from(
    { length: Math.floor(widthMm / step) + 1 },
    (_, index) => index * step
  );

  return (
    <div className="bench">
      <div
        className="liner"
        style={{ width: `min(100%, ${widthMm * MAX_PX_PER_MM}px)` }}
      >
        <div
          className="ruler"
          role="img"
          aria-label={`${widthMm.toFixed(1)} by ${heightMm.toFixed(1)} mm`}
        >
          {ticks.map((mm) => (
            <span
              key={mm}
              className={
                mm % 10 === 0
                  ? "tick major"
                  : mm % 5 === 0
                  ? "tick mid"
                  : "tick"
              }
              style={{ left: `${(mm / widthMm) * 100}%` }}
            >
              {mm % 10 === 0 && mm > 0 && (
                <span className="tick-label">{mm}</span>
              )}
            </span>
          ))}
        </div>
        {children}
      </div>
      <p className="size">
        {widthMm.toFixed(1)} × {heightMm.toFixed(1)} mm
      </p>
    </div>
  );
}
