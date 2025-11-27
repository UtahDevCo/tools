import { Typography } from "@repo/components";

const VARIANTS = [
  "headline",
  "title",
  "subtitle",
  "strong",
  "default",
  "light",
] as const;
const COLORS = [
  "default",
  "muted",
  "primary",
  "destructive",
  "accent",
] as const;

export default function TypographyPlayground() {
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <Typography variant="headline" className="mb-8">
        Typography Playground
      </Typography>

      <section className="mb-12">
        <Typography variant="title" className="mb-4">
          Variants
        </Typography>
        <div className="space-y-4 border rounded-lg p-6">
          {VARIANTS.map((variant) => (
            <div key={variant} className="flex items-baseline gap-4">
              <code className="text-sm text-muted-foreground w-24 shrink-0">
                {variant}
              </code>
              <Typography variant={variant}>
                The quick brown fox jumps over the lazy dog
              </Typography>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <Typography variant="title" className="mb-4">
          Colors
        </Typography>
        <div className="space-y-4 border rounded-lg p-6">
          {COLORS.map((color) => (
            <div key={color} className="flex items-baseline gap-4">
              <code className="text-sm text-muted-foreground w-24 shrink-0">
                {color}
              </code>
              <Typography color={color}>
                The quick brown fox jumps over the lazy dog
              </Typography>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <Typography variant="title" className="mb-4">
          Variant + Color Combinations
        </Typography>
        <div className="border rounded-lg p-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-2 text-sm font-medium text-muted-foreground">
                  Variant / Color
                </th>
                {COLORS.map((color) => (
                  <th
                    key={color}
                    className="text-left p-2 text-sm font-medium text-muted-foreground"
                  >
                    {color}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VARIANTS.map((variant) => (
                <tr key={variant} className="border-t">
                  <td className="p-2 text-sm font-medium text-muted-foreground">
                    {variant}
                  </td>
                  {COLORS.map((color) => (
                    <td key={`${variant}-${color}`} className="p-2">
                      <Typography variant={variant} color={color}>
                        Aa
                      </Typography>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <Typography variant="title" className="mb-4">
          Custom className Override
        </Typography>
        <div className="space-y-4 border rounded-lg p-6">
          <Typography variant="title" className="italic underline">
            Title with italic and underline
          </Typography>
          <Typography color="primary" className="uppercase tracking-widest">
            Primary with uppercase and wide tracking
          </Typography>
          <Typography variant="light" className="text-lg font-bold">
            Light variant overridden to text-lg font-bold
          </Typography>
        </div>
      </section>

      <section>
        <Typography variant="title" className="mb-4">
          Semantic HTML Elements
        </Typography>
        <div className="space-y-4 border rounded-lg p-6">
          <div className="flex items-baseline gap-4">
            <code className="text-sm text-muted-foreground w-32 shrink-0">
              headline → h1
            </code>
            <Typography variant="headline">Heading 1</Typography>
          </div>
          <div className="flex items-baseline gap-4">
            <code className="text-sm text-muted-foreground w-32 shrink-0">
              title → h2
            </code>
            <Typography variant="title">Heading 2</Typography>
          </div>
          <div className="flex items-baseline gap-4">
            <code className="text-sm text-muted-foreground w-32 shrink-0">
              subtitle → h3
            </code>
            <Typography variant="subtitle">Heading 3</Typography>
          </div>
          <div className="flex items-baseline gap-4">
            <code className="text-sm text-muted-foreground w-32 shrink-0">
              strong → strong
            </code>
            <Typography variant="strong">Strong text</Typography>
          </div>
          <div className="flex items-baseline gap-4">
            <code className="text-sm text-muted-foreground w-32 shrink-0">
              default → p
            </code>
            <Typography>Paragraph text</Typography>
          </div>
          <div className="flex items-baseline gap-4">
            <code className="text-sm text-muted-foreground w-32 shrink-0">
              light → span
            </code>
            <Typography variant="light">Span text</Typography>
          </div>
          <div className="flex items-baseline gap-4">
            <code className="text-sm text-muted-foreground w-32 shrink-0">
              as=&quot;span&quot;
            </code>
            <Typography as="span" variant="strong">
              Custom element override
            </Typography>
          </div>
        </div>
      </section>
    </main>
  );
}
