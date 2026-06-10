// Background service worker
// Handles installation and lifecycle events

chrome.runtime.onInstalled.addListener(() => {
  console.log("Design Overlay Extension Installed.");
});

// Since we use content_scripts in manifest.json and they run on page load,
// we just need them to query chrome.storage.local for the current host's settings.
// The content script does this on load, so the background script is minimal.
