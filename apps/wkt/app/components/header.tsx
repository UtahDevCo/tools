"use client";

import Link from "next/link";
import { IconButton, Typography } from "@repo/components";
import NextImage from "next/image";

type HeaderProps = {
  title?: string;
};

export function Header({ title }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-app-surface/95 backdrop-blur-sm border-b-2 border-app-border">
      <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="w-10 h-10 rounded-full bg-app-surface-raised flex items-center justify-center hover:bg-app-surface-hover transition-all border-2 border-app-border-subtle"
            aria-label="Home"
          >
            <NextImage
              src="/wkt-logo.svg"
              alt="WKT Logo"
              width={24}
              height={24}
            />
          </Link>
          <div>
            <Typography variant="title">{title || "WKT"}</Typography>
          </div>
        </div>
        <IconButton
          icon={
            <NextImage
              src="/icons/sparkle-chat.svg"
              alt="AI Chat"
              width={24}
              height={24}
            />
          }
          size="lg"
          variant="outline"
          aria-label="AI assistant"
        />
      </div>
    </header>
  );
}
