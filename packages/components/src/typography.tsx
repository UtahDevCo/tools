import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./lib/utils";

const VARIANT_ELEMENT_MAP = {
  headline: "h1",
  title: "h2",
  subtitle: "h3",
  strong: "strong",
  default: "p",
  light: "span",
} as const;

const typographyVariants = cva("font-sans", {
  variants: {
    variant: {
      headline: "text-4xl font-bold tracking-tight",
      title: "text-2xl font-bold tracking-tight",
      subtitle: "text-xl font-semibold",
      strong: "text-base font-semibold",
      default: "text-base font-normal",
      light: "text-sm font-normal",
    },
    color: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      destructive: "text-destructive",
      accent: "text-accent-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
    color: "default",
  },
});

type VariantKey = keyof typeof VARIANT_ELEMENT_MAP;
type ElementType = (typeof VARIANT_ELEMENT_MAP)[VariantKey];

type TypographyProps<T extends ElementType = "p"> = {
  as?: T;
} & VariantProps<typeof typographyVariants> &
  React.ComponentPropsWithoutRef<T>;

function Typography<T extends ElementType = "p">({
  as,
  variant = "default",
  color,
  className,
  ...props
}: TypographyProps<T>) {
  const Component = as ?? VARIANT_ELEMENT_MAP[variant as VariantKey] ?? "p";

  return (
    <Component
      data-slot="typography"
      className={cn(typographyVariants({ variant, color, className }))}
      {...props}
    />
  );
}

export { Typography, typographyVariants };
