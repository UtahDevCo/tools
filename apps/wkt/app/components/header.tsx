"use client";

import Link from "next/link";
import { IconButton, Typography } from "@repo/components";
import { WktLogoIcon, SparkleChatIcon } from "./icons";

type HeaderProps = {
  title?: string;
};

export function Header({ title }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-app-surface/95 backdrop-blur-sm border-b-8 border-app-border">
      <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="w-10 h-10 rounded-md flex items-center justify-center hover:bg-app-surface-hover transition-all"
            aria-label="Home"
          >
            <WktLogoIcon className="w-6 h-6" />
          </Link>
          <div>
            <Typography variant="title">{title || "WKT"}</Typography>
          </div>
        </div>
        <IconButton
          icon={<SparkleChatIcon className="w-6 h-6" />}
          size="lg"
          variant="ghost"
          aria-label="AI assistant"
        />
      </div>
    </header>
  );
}
