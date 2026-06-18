"use client";

/**
 * The Halda Bestie — a parametric SVG creature that visibly grows through four
 * stages as the student completes challenges. `stage` (0–3) drives size and
 * which features (arms, leaf antenna, sparkle aura, crown) are drawn.
 *
 * Self-contained: no external dependencies, so it can be dropped into any app.
 */

export const BESTIE_STAGES = [
  { name: "Sproutling", min: 0, blurb: "Fresh and ready. Let's grow." },
  { name: "Lil Bestie", min: 3, blurb: "Getting the hang of this." },
  { name: "Big Bestie", min: 7, blurb: "Thriving. Look at it go." },
  { name: "Mega Bestie", min: 12, blurb: "Absolute legend status." },
] as const;

/** Map cumulative growth points to a stage index (0–3). */
export function stageForGrowth(growth: number): number {
  let s = 0;
  for (let i = 0; i < BESTIE_STAGES.length; i++) {
    if (growth >= BESTIE_STAGES[i].min) s = i;
  }
  return s;
}

export const MAX_STAGE = BESTIE_STAGES.length - 1;

export function Bestie({
  stage,
  className = "",
}: {
  stage: number;
  className?: string;
}) {
  const s = Math.max(0, Math.min(MAX_STAGE, stage));
  // Body scales up visibly with each stage.
  const scale = 0.72 + s * 0.12;
  const showLeaf = true; // it's a sprout from the start
  const showArms = s >= 1;
  const showAura = s >= 2;
  const showCrown = s >= 3;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={`Halda Bestie — ${BESTIE_STAGES[s].name}`}
    >
      <defs>
        <radialGradient id="bestie-body" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        <radialGradient id="bestie-belly" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#fdf4ff" />
          <stop offset="100%" stopColor="#f5d0fe" />
        </radialGradient>
        <filter id="bestie-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#7c3aed" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Aura ring for later stages */}
      {showAura && (
        <circle
          cx="100"
          cy="105"
          r="78"
          fill="none"
          stroke="#f0abfc"
          strokeWidth="3"
          strokeDasharray="4 10"
          strokeLinecap="round"
          opacity="0.7"
        />
      )}

      <g style={{ transformOrigin: "100px 120px", transformBox: "view-box" as never }}>
        <g transform={`translate(100 118) scale(${scale}) translate(-100 -118)`}>
          {/* Ground shadow */}
          <ellipse cx="100" cy="178" rx="46" ry="9" fill="#7c3aed" opacity="0.15" />

          {/* Antenna + leaf */}
          {showLeaf && (
            <g>
              <path
                d="M100 64 C100 44 100 38 100 30"
                stroke="#7c3aed"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M100 32 C112 22 126 26 124 40 C112 46 100 42 100 32 Z" fill="#4ade80" />
              <path d="M100 38 C90 30 78 33 80 44 C90 49 100 46 100 38 Z" fill="#22c55e" />
            </g>
          )}

          <g filter="url(#bestie-shadow)">
            {/* Arms */}
            {showArms && (
              <>
                <ellipse cx="52" cy="124" rx="13" ry="9" fill="#9333ea" transform="rotate(-20 52 124)" />
                <ellipse cx="148" cy="124" rx="13" ry="9" fill="#9333ea" transform="rotate(20 148 124)" />
              </>
            )}

            {/* Body */}
            <path
              d="M100 60
                 C140 60 158 92 158 120
                 C158 156 132 172 100 172
                 C68 172 42 156 42 120
                 C42 92 60 60 100 60 Z"
              fill="url(#bestie-body)"
            />
            {/* Belly */}
            <ellipse cx="100" cy="132" rx="34" ry="30" fill="url(#bestie-belly)" opacity="0.85" />

            {/* Eyes */}
            <g>
              <ellipse cx="82" cy="112" rx="9" ry="11" fill="#3b0764" />
              <ellipse cx="118" cy="112" rx="9" ry="11" fill="#3b0764" />
              <circle cx="85" cy="108" r="3.2" fill="#fff" />
              <circle cx="121" cy="108" r="3.2" fill="#fff" />
            </g>

            {/* Blush */}
            <ellipse cx="70" cy="128" rx="8" ry="5" fill="#fb7185" opacity="0.55" />
            <ellipse cx="130" cy="128" rx="8" ry="5" fill="#fb7185" opacity="0.55" />

            {/* Smile */}
            <path
              d="M88 132 Q100 144 112 132"
              fill="none"
              stroke="#3b0764"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Feet */}
            <ellipse cx="80" cy="172" rx="12" ry="7" fill="#7c3aed" />
            <ellipse cx="120" cy="172" rx="12" ry="7" fill="#7c3aed" />
          </g>

          {/* Crown for the final stage */}
          {showCrown && (
            <path
              d="M74 58 l10 -22 l16 16 l16 -16 l10 22 Z"
              fill="#fbbf24"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}
        </g>
      </g>
    </svg>
  );
}

export default Bestie;
