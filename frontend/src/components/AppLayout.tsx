import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  className?: string;
}

/**
 * Mobile-first 390px canvas centered on desktop.
 */
export function AppLayout({
  children,
  showNav = false,
  className = "",
}: AppLayoutProps) {
  return (
    <div className="min-h-dvh w-full bg-background flex justify-center">
      <div
        className={`relative w-full max-w-[430px] min-h-dvh flex flex-col ${className}`}
        style={{ paddingBottom: showNav ? 96 : 0 }}
      >
        {children}
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
