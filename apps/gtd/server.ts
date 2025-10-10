import { resolve } from 'path';

const server = Bun.serve({
  port: 3010,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Serve index.html for root path
    if (url.pathname === '/') {
      const file = Bun.file('./index.html');
      return new Response(file);
    }
    
    // Bundle and serve the main entry point
    if (url.pathname === '/src/index.tsx') {
      try {
        const result = await Bun.build({
          entrypoints: ['./src/index.tsx'],
          format: 'esm',
          splitting: true,
          outdir: './dist',
          minify: false,
          sourcemap: 'inline',
        });

        if (result.success && result.outputs[0]) {
          return new Response(result.outputs[0], {
            headers: {
              'Content-Type': 'application/javascript',
            },
          });
        }
      } catch (error) {
        console.error('Build error:', error);
        return new Response(`Build error: ${error}`, { status: 500 });
      }
    }

    // Handle CSS files
    if (url.pathname.endsWith('.css')) {
      const filePath = `.${url.pathname}`;
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            'Content-Type': 'text/css',
          },
        });
      }
    }
    
    // Serve static files from dist
    if (url.pathname.startsWith('/dist/')) {
      const filePath = `.${url.pathname}`;
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            'Content-Type': 'application/javascript',
          },
        });
      }
    }
    
    // Serve other static files
    const filePath = `.${url.pathname}`;
    const file = Bun.file(filePath);
    
    if (await file.exists()) {
      return new Response(file);
    }
    
    // Fallback to index.html for client-side routing
    return new Response(Bun.file('./index.html'));
  },
});

console.log(`Server running at http://localhost:${server.port}`);
