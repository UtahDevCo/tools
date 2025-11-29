import { Typography, Button } from "@repo/components";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Mail, Loader2, ChevronRight } from "lucide-react";

const VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
const SIZES = ["default", "sm", "lg", "icon", "icon-sm", "icon-lg"] as const;

export default function ButtonsPlaygroundPage() {
  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <Link
        href="/playground"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Playground
      </Link>

      <Typography variant="headline" className="mb-2">
        Buttons
      </Typography>
      <Typography color="muted" className="mb-8">
        All button variants and sizes from the shadcn/ui component library
      </Typography>

      {/* Variants Section */}
      <section className="mb-12">
        <Typography variant="title" className="mb-4">
          Variants
        </Typography>
        <div className="grid gap-6">
          {VARIANTS.map((variant) => (
            <div key={variant} className="flex items-center gap-4">
              <Typography variant="default" className="w-28 font-mono text-sm">
                {variant}
              </Typography>
              <Button variant={variant}>Button</Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Sizes Section */}
      <section className="mb-12">
        <Typography variant="title" className="mb-4">
          Sizes
        </Typography>
        <div className="grid gap-6">
          {SIZES.map((size) => (
            <div key={size} className="flex items-center gap-4">
              <Typography variant="default" className="w-28 font-mono text-sm">
                {size}
              </Typography>
              {size.startsWith("icon") ? (
                <>
                  <Button size={size} variant="default">
                    <Plus />
                  </Button>
                  <Button size={size} variant="outline">
                    <Trash2 />
                  </Button>
                  <Button size={size} variant="ghost">
                    <Mail />
                  </Button>
                </>
              ) : (
                <>
                  <Button size={size}>Button</Button>
                  <Button size={size} variant="outline">
                    Outline
                  </Button>
                  <Button size={size} variant="secondary">
                    Secondary
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* With Icons Section */}
      <section className="mb-12">
        <Typography variant="title" className="mb-4">
          With Icons
        </Typography>
        <div className="flex flex-wrap gap-4">
          <Button>
            <Mail />
            Login with Email
          </Button>
          <Button variant="outline">
            <Plus />
            Add Item
          </Button>
          <Button variant="secondary">
            Continue
            <ChevronRight />
          </Button>
          <Button variant="destructive">
            <Trash2 />
            Delete
          </Button>
        </div>
      </section>

      {/* Loading State Section */}
      <section className="mb-12">
        <Typography variant="title" className="mb-4">
          Loading States
        </Typography>
        <div className="flex flex-wrap gap-4">
          <Button disabled>
            <Loader2 className="animate-spin" />
            Please wait
          </Button>
          <Button variant="outline" disabled>
            <Loader2 className="animate-spin" />
            Loading...
          </Button>
          <Button variant="secondary" disabled>
            <Loader2 className="animate-spin" />
          </Button>
        </div>
      </section>

      {/* Full Matrix Section */}
      <section className="mb-12">
        <Typography variant="title" className="mb-4">
          Variant × Size Matrix
        </Typography>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 border-b font-mono text-sm text-muted-foreground">
                  variant \ size
                </th>
                {SIZES.filter((s) => !s.startsWith("icon")).map((size) => (
                  <th
                    key={size}
                    className="text-left p-2 border-b font-mono text-sm text-muted-foreground"
                  >
                    {size}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VARIANTS.map((variant) => (
                <tr key={variant}>
                  <td className="p-2 border-b font-mono text-sm">{variant}</td>
                  {SIZES.filter((s) => !s.startsWith("icon")).map((size) => (
                    <td key={`${variant}-${size}`} className="p-2 border-b">
                      <Button variant={variant} size={size}>
                        Button
                      </Button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Icon Buttons Matrix */}
      <section className="mb-12">
        <Typography variant="title" className="mb-4">
          Icon Button Matrix
        </Typography>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 border-b font-mono text-sm text-muted-foreground">
                  variant \ size
                </th>
                {SIZES.filter((s) => s.startsWith("icon")).map((size) => (
                  <th
                    key={size}
                    className="text-left p-2 border-b font-mono text-sm text-muted-foreground"
                  >
                    {size}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VARIANTS.filter((v) => v !== "link").map((variant) => (
                <tr key={variant}>
                  <td className="p-2 border-b font-mono text-sm">{variant}</td>
                  {SIZES.filter((s) => s.startsWith("icon")).map((size) => (
                    <td key={`${variant}-${size}`} className="p-2 border-b">
                      <Button variant={variant} size={size}>
                        <Plus />
                      </Button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
