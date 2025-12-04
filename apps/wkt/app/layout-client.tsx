"use client";

import { BottomNav } from "./components/bottom-nav";

type LayoutClientProps = {
  children: React.ReactNode;
};

export function LayoutClient({ children }: LayoutClientProps) {
  return (
    <>
    <div className="pt-28 pb-6">
      {children}
      </div>
      <BottomNav />
    </>
  );
}
