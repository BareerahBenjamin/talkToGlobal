import { cn } from "@/lib/utils";

export type GunGunState =
  "idle" | "listening" | "thinking" | "generating" | "success" | "empty";

interface GunGunProps {
  state?: GunGunState;
  size?: number;
  className?: string;
  /** Kept for API compatibility; the illustrated mascot already has hands. */
  showHands?: boolean;
}

// 滚滚 (GunGun) — the brand mascot. Each state maps to an illustrated
// expression under /public/gungun.
const STATE_IMAGE: Record<GunGunState, string> = {
  idle: "/gungun/idle.png",
  listening: "/gungun/talking.png",
  thinking: "/gungun/thinking.png",
  generating: "/gungun/thinking.png",
  success: "/gungun/happy.png",
  empty: "/gungun/sleep.png",
};

/**
 * 滚滚 — a chubby green marshmallow companion. Renders the illustrated PNG for
 * the given state, wrapped in the same idle/nod/shake/jump motion as before.
 */
export function GunGunMascot({
  state = "idle",
  size = 120,
  className,
}: GunGunProps) {
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
      aria-label="滚滚，你的创作搭子"
    >
      <div className={cn("w-full h-full", animClass)}>
        <img
          src={STATE_IMAGE[state]}
          alt="滚滚"
          width={size}
          height={size}
          draggable={false}
          className="w-full h-full object-contain select-none drop-shadow-[0_8px_16px_rgba(90,127,61,0.18)]"
        />
      </div>
    </div>
  );
}
