import * as React from "react";

import { Button, type ButtonProps } from "./ui/button";
import { cn } from "./lib/utils";

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  /**
   * The icon element to render inside the button
   */
  icon: React.ReactNode;
  /**
   * Optional label for accessibility (recommended for icon-only buttons)
   */
  "aria-label"?: string;
  /**
   * Size of the icon button
   * @default "default"
   */
  size?: "sm" | "default" | "lg" | "fill";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = "default", ...props }, ref) => {
    const clonedIcon = React.isValidElement(icon)
      ? React.cloneElement(icon, {
          className: cn(
            {
              "h-4! w-4!": size === "sm",
              "h-5! w-5!": size === "default",
              "h-6! w-6!": size === "lg",
              "h-full! w-full! object-contain": size === "fill",
            },
            (icon as React.ReactElement<{ className?: string }>).props
              ?.className
          ),
        } as never)
      : icon;

    return (
      <Button
        ref={ref}
        size="icon"
        className={cn(
          // Base icon button styles
          "shrink-0 pl-0!",
          // Size variants
          {
            "h-8 w-8 pl-2": size === "sm",
            "h-9 w-9 pl-2": size === "default",
            "h-10 w-10 pl-2": size === "lg",
            "h-full w-full aspect-square p-0": size === "fill",
          },
          className
        )}
        name={props["aria-label"]}
        {...props}
      >
        {clonedIcon}
        <span className="sr-only">{props["aria-label"]}</span>
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";
