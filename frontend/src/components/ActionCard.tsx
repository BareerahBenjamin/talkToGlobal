import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface ActionCardProps {
  to?: string;
  onClick?: () => void;
  icon: ReactNode;
  title: string;
  description?: string;
  iconBg?: string;
  size?: "md" | "lg";
}

export function ActionCard({
  to,
  onClick,
  icon,
  title,
  description,
  iconBg = "var(--cream)",
  size = "md",
}: ActionCardProps) {
  const inner = (
    <div className="flex items-center gap-4 w-full">
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: size === "lg" ? 56 : 48,
          height: size === "lg" ? 56 : 48,
          borderRadius: 20,
          background: iconBg,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[16px] font-semibold text-foreground leading-tight">
          {title}
        </div>
        {description && (
          <div className="text-[13px] text-muted-foreground mt-1 leading-snug">
            {description}
          </div>
        )}
      </div>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="text-muted-foreground shrink-0"
      >
        <path
          d="M9 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

  const cls =
    "block w-full bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 transition active:scale-[0.98] hover:shadow-float";

  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
