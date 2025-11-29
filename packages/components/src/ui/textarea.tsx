import * as React from "react";

import { cn } from "../lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-[100px] w-full border-b-2 border-zinc-100 bg-transparent px-1 py-2 text-sm transition-colors resize-none",
        "font-mono placeholder:text-muted-foreground",
        "focus:border-orange-500 focus:outline-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
