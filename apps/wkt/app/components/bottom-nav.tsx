"use client";

import { Home, History, BarChart3, Settings, LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconButton } from "@repo/components";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-app-surface/95 backdrop-blur-sm border-t-2 border-app-border">
      <div className="max-w-2xl mx-auto px-6 py-4">
        <div className="grid grid-cols-4 gap-2">
          <BottomNavButton
            icon={Home}
            label="Home"
            href="/"
            isActive={pathname === "/"}
          />
          <BottomNavButton
            icon={History}
            label="History"
            href="/history"
            isActive={pathname === "/history"}
          />
          <BottomNavButton
            icon={BarChart3}
            label="Stats"
            href="/stats"
            isActive={pathname === "/stats"}
          />
          <BottomNavButton
            icon={Settings}
            label="Settings"
            href="/settings"
            isActive={pathname === "/settings"}
          />
        </div>
      </div>
    </nav>
  );  
}

type BottomNavButtonProps = {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive: boolean;
};

function BottomNavButton({
  icon: Icon,
  label,
  href,
  isActive,
}: BottomNavButtonProps) {
  const className = `flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all ${
    isActive ? "text-brand" : "text-muted-foreground hover:text-foreground"
  }`;

  return (
    <Link href={href} className={className}>
      <IconButton
        icon={<Icon className="w-6 h-6" strokeWidth={2} />}
        size="lg"
        variant="ghost"
        aria-label={label}
      />
    </Link>
  );
}
