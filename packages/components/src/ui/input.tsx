import * as React from "react";

import { cn } from "../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "font-mono h-9 w-full border-b-2 border-zinc-100 bg-transparent px-1 text-sm transition-colors",
        "placeholder:text-muted-foreground",
        "focus:border-orange-500 focus:outline-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
