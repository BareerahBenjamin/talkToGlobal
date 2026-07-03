import { cn } from "@/lib/utils";

export type SparkState =
  "idle" | "listening" | "thinking" | "generating" | "success" | "empty";

interface SparkProps {
  state?: SparkState;
  size?: number;
  className?: string;
  showHands?: boolean;
}

/**
 * Spark — a chubby marshmallow-star companion.
 * Warm yellow body #FFD76A, cream face #F8F2E6, two black oval eyes,
 * minimal smile. Never sharp, never mechanical.
 */
export function SparkMascot({
  state = "idle",
  size = 120,
  className,
  showHands = true,
}: SparkProps) {
  const animClass =
    state === "listening"
      ? "animate-spark-nod"
      : state === "thinking"
        ? "animate-spark-shake"
        : state === "success"
          ? "animate-spark-jump"
          : "animate-spark-float";

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
      aria-label="Spark, your creative companion"
    >
      {/* orbiting stars for generating */}
      {state === "generating" && (
        <>
          <MiniStar
            className="absolute -top-1 left-1/2 animate-twinkle"
            style={{ animationDelay: "0s" }}
          />
          <MiniStar
            className="absolute top-1/3 -right-2 animate-twinkle"
            style={{ animationDelay: "0.4s" }}
          />
          <MiniStar
            className="absolute -bottom-1 left-2 animate-twinkle"
            style={{ animationDelay: "0.8s" }}
          />
        </>
      )}
      {/* thinking stars */}
      {state === "thinking" && (
        <>
          <MiniStar
            className="absolute -top-2 right-3 animate-twinkle"
            style={{ animationDelay: "0s" }}
          />
          <MiniStar
            className="absolute -top-4 right-8 animate-twinkle"
            style={{ animationDelay: "0.5s" }}
            small
          />
        </>
      )}

      <div className={cn("w-full h-full", animClass)}>
        <svg
          viewBox="0 0 140 140"
          className="w-full h-full drop-shadow-[0_8px_16px_rgba(246,166,35,0.25)]"
        >
          {/* chubby rounded star body */}
          <path
            d="M70 12
               C 78 12, 84 22, 92 30
               C 100 38, 116 40, 122 48
               C 128 56, 120 68, 120 78
               C 120 88, 128 100, 122 108
               C 116 116, 100 116, 92 124
               C 84 132, 78 130, 70 130
               C 62 130, 56 132, 48 124
               C 40 116, 24 116, 18 108
               C 12 100, 20 88, 20 78
               C 20 68, 12 56, 18 48
               C 24 40, 40 38, 48 30
               C 56 22, 62 12, 70 12 Z"
            fill="#FFD76A"
            stroke="#F0B94A"
            strokeWidth="1.5"
          />
          {/* cream face */}
          <ellipse cx="70" cy="78" rx="34" ry="28" fill="#F8F2E6" />
          {/* eyes */}
          <ellipse cx="58" cy="74" rx="3.4" ry="5" fill="#1E2B1A" />
          <ellipse cx="82" cy="74" rx="3.4" ry="5" fill="#1E2B1A" />
          {/* cheek blush */}
          <ellipse
            cx="50"
            cy="86"
            rx="4"
            ry="2.4"
            fill="#F6A623"
            opacity="0.28"
          />
          <ellipse
            cx="90"
            cy="86"
            rx="4"
            ry="2.4"
            fill="#F6A623"
            opacity="0.28"
          />
          {/* smile */}
          <path
            d="M62 88 Q70 96 78 88"
            stroke="#1E2B1A"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          {/* tiny hands */}
          {showHands && (
            <>
              <circle
                cx="16"
                cy="82"
                r="5"
                fill="#FFD76A"
                stroke="#F0B94A"
                strokeWidth="1.2"
              />
              <circle
                cx="124"
                cy="82"
                r="5"
                fill="#FFD76A"
                stroke="#F0B94A"
                strokeWidth="1.2"
              />
            </>
          )}
        </svg>
      </div>

      {/* listening sound waves */}
      {state === "listening" && (
        <div className="absolute top-1/2 -right-6 -translate-y-1/2 flex items-end gap-1 h-8">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-1.5 rounded-full bg-warm"
              style={{
                height: "100%",
                animation: `sound-wave 0.9s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStar({
  className,
  style,
  small,
}: {
  className?: string;
  style?: React.CSSProperties;
  small?: boolean;
}) {
  const s = small ? 10 : 14;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 20 20"
      className={className}
      style={style}
    >
      <path
        d="M10 1 C11 6, 14 9, 19 10 C14 11, 11 14, 10 19 C9 14, 6 11, 1 10 C6 9, 9 6, 10 1 Z"
        fill="#FFD76A"
        stroke="#F0B94A"
        strokeWidth="0.8"
      />
    </svg>
  );
}
