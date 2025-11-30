import { Button, Typography } from "@repo/components";
import Link from "next/link";
import { Type, FormInput, RectangleHorizontal } from "lucide-react";
import { ArrowLeft } from "lucide-react";
  
const PLAYGROUND_ROUTES = [
  {
    href: "/playground/typography",
    name: "Typography",
    description: "Text variants, colors, and semantic HTML elements",
    icon: Type,
  },
  {
    href: "/playground/forms",
    name: "Forms",
    description: "Form components and edit drawer",
    icon: FormInput,
  },
  {
    href: "/playground/buttons",
    name: "Buttons",
    description: "Button variants, sizes, and states",
    icon: RectangleHorizontal,
  },
] as const;

export default function PlaygroundPage() {
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Back to app
          </Link>
        </Button>
      </div>

      <Typography variant="headline" className="mb-2">
        Playground
      </Typography>
      <Typography color="muted" className="mb-8">
        Component development and testing environment
      </Typography>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLAYGROUND_ROUTES.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className="group flex items-start gap-4 p-6 border rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors"
          >
            <div className="shrink-0 p-2 rounded-md bg-muted group-hover:bg-orange-100 transition-colors">
              <route.icon className="h-6 w-6 text-muted-foreground group-hover:text-orange-600 transition-colors" />
            </div>
            <div>
              <Typography
                variant="subtitle"
                className="group-hover:text-orange-600 transition-colors"
              >
                {route.name}
              </Typography>
              <Typography variant="light" color="muted">
                {route.description}
              </Typography>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
