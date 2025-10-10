const server = Bun.serve({
  port: 3010,
  async fetch(req) {
    const url = new URL(req.url);k
    
    // Serve index.html for root path
    if (url.pathname === '/') {
      const file = Bun.file('./index.html');
      return new Response(file);
    }
    
    // Handle TypeScript/JSX files
    if (url.pathname.endsWith('.tsx') || url.pathname.endsWith('.ts')) {
      const filePath = `.${url.pathname}`;
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        const transpiled = await Bun.build({
          entrypoints: [filePath],
          format: 'esm',
        });
        
        if (transpiled.outputs[0]) {
          return new Response(transpiled.outputs[0], {
            headers: {
              'Content-Type': 'application/javascript',
            },
          });
        }
      }
    }
    
    // Serve static files
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
