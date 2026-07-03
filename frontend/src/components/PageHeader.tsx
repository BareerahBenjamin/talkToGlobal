import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title?: string;
  back?: string;
  right?: ReactNode;
}

export function PageHeader({ title, back, right }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 pt-4 pb-2 h-14">
      <div className="w-10">
        {back && (
          <Link
            to={back}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 hover:bg-muted transition"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        )}
      </div>
      <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
      <div className="w-10 flex justify-end">{right}</div>
    </header>
  );
}
