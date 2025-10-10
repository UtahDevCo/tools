import { App } from './app';

const root = document.getElementById('root');
if (root) {
  root.innerHTML = `<div id="app"></div>`;
  const appElement = document.getElementById('app');
  if (appElement) {
    const { createRoot } = await import('react-dom/client');
    const reactRoot = createRoot(appElement);
    reactRoot.render(<App />);
  }
}
