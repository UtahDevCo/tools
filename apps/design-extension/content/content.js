(() => {
  if (window.__designOverlayInjected) return;
  window.__designOverlayInjected = true;

  // Create container and shadow root
  const host = document.createElement('div');
  host.id = 'design-overlay-extension-root';
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100%';
  host.style.height = '100%';
  host.style.pointerEvents = 'none'; // pass through
  host.style.zIndex = '2147483647'; // max z-index
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #grid-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      display: none;
      z-index: 1;
    }
    #image-container {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      display: none;
      z-index: 2;
      transform-origin: top left;
    }
    #image-overlay {
      display: block;
      pointer-events: none;
    }
    #drag-handle {
      position: absolute;
      top: 0;
      left: 0;
      width: 40px;
      height: 40px;
      background-color: rgba(0, 123, 255, 0.8);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      pointer-events: auto; /* allows dragging */
      border-radius: 50%;
      transform: translate(-50%, -50%); /* Center on the top-left corner */
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      user-select: none;
    }
    #drag-handle:active {
      cursor: grabbing;
    }
    #drag-handle::after {
      content: '✥';
      font-size: 20px;
    }
    .guide-line-el {
      position: absolute;
      pointer-events: none;
      z-index: 10;
    }
    .guide-line-el.horizontal {
      left: 0;
      width: 100vw;
      height: 1px;
      border-top: 1px solid currentColor;
    }
    .guide-line-el.vertical {
      top: 0;
      height: 100vh;
      width: 1px;
      border-left: 1px solid currentColor;
    }
    .guide-line-el.inactive {
      display: none;
    }
    .guide-handle-el {
      position: absolute;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: move;
      pointer-events: auto;
      z-index: 11;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      user-select: none;
    }
    .guide-handle-el::after {
      content: '✥';
      font-size: 14px;
    }
    .guide-handle-el.inactive {
      opacity: 0.5;
      background-color: #6c757d !important;
      border: 1px dashed #fff;
    }
    .guide-handle-el.horizontal {
      left: 20px;
      transform: translateY(-50%);
      cursor: ns-resize;
    }
    .guide-handle-el.vertical {
      top: 20px;
      transform: translateX(-50%);
      cursor: ew-resize;
    }
    .guide-label-el {
      position: absolute;
      color: rgba(60, 60, 60, 0.7);
      font-size: 11px;
      font-family: monospace, sans-serif;
      font-weight: bold;
      pointer-events: none;
      background-color: rgba(240, 240, 240, 0.85);
      border: 1px solid rgba(200, 200, 200, 0.5);
      padding: 2px 5px;
      border-radius: 3px;
      transform: translate(-50%, -50%);
      z-index: 9;
      user-select: none;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
  `;
  shadow.appendChild(style);

  // Grid Element
  const gridOverlay = document.createElement('div');
  gridOverlay.id = 'grid-overlay';
  shadow.appendChild(gridOverlay);

  // Image Element
  const imageContainer = document.createElement('div');
  imageContainer.id = 'image-container';
  
  const imgOverlay = document.createElement('img');
  imgOverlay.id = 'image-overlay';
  imageContainer.appendChild(imgOverlay);
  
  const dragHandle = document.createElement('div');
  dragHandle.id = 'drag-handle';
  imageContainer.appendChild(dragHandle);
  
  shadow.appendChild(imageContainer);

  // Guides Containers
  const guidesContainer = document.createElement('div');
  guidesContainer.id = 'guides-container';
  shadow.appendChild(guidesContainer);

  const labelsContainer = document.createElement('div');
  labelsContainer.id = 'labels-container';
  shadow.appendChild(labelsContainer);

  // State
  let currentSettings = { guides: [] };
  let posX = 0;
  let posY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Guide drag state
  let activeDragGuideId = null;
  let activeDragType = null;
  let dragStartOffset = 0;

  // Apply settings
  function applySettings(settings) {
    currentSettings = settings;
    if (!currentSettings.guides) currentSettings.guides = [];

    // Grid
    if (settings.gridEnabled) {
      gridOverlay.style.display = 'block';
      const c = settings.gridColor;
      const s = settings.gridSpacing;
      
      gridOverlay.style.background = `
        repeating-linear-gradient(to right, ${c}, ${c} 1px, transparent 1px, transparent ${s}),
        repeating-linear-gradient(to bottom, ${c}, ${c} 1px, transparent 1px, transparent ${s})
      `;
      gridOverlay.style.backgroundPosition = `${settings.gridOffsetX || 0}px ${settings.gridOffsetY || 0}px`;
    } else {
      gridOverlay.style.display = 'none';
    }

    // Image
    if (settings.imageEnabled && settings.imageDataDataUrl) {
      imageContainer.style.display = 'block';
      
      if (imgOverlay.src !== settings.imageDataDataUrl) {
        imgOverlay.src = settings.imageDataDataUrl;
      }
      
      imgOverlay.style.opacity = settings.imageOpacity;
      
      if (settings.imageX !== undefined && settings.imageY !== undefined) {
        posX = settings.imageX;
        posY = settings.imageY;
      }
      
      updateImageTransform();
    } else {
      imageContainer.style.display = 'none';
    }

    // Render guides
    renderGuides();
  }

  function updateImageTransform() {
    if (!currentSettings) return;
    const scale = currentSettings.imageScale || 1;
    imageContainer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  }

  async function saveSettingsToStorage() {
    try {
      const url = new URL(window.location.href);
      const host = url.host;
      currentSettings.imageX = posX;
      currentSettings.imageY = posY;
      
      const data = {};
      data[host] = currentSettings;
      await chrome.storage.local.set(data);
    } catch (e) {
      console.log('Error saving settings from content script', e);
    }
  }

  // Render Guides
  function renderGuides() {
    guidesContainer.innerHTML = '';
    
    currentSettings.guides.forEach((guide) => {
      const line = document.createElement('div');
      line.className = `guide-line-el ${guide.type} ${guide.active ? '' : 'inactive'}`;
      line.style.color = guide.color;
      line.setAttribute('data-id', guide.id);
      
      if (guide.type === 'horizontal') {
        line.style.top = `${guide.position}px`;
      } else {
        line.style.left = `${guide.position}px`;
      }
      
      const handle = document.createElement('div');
      handle.className = `guide-handle-el ${guide.type} ${guide.active ? '' : 'inactive'}`;
      handle.style.backgroundColor = guide.color;
      handle.style.color = '#fff';
      handle.setAttribute('data-id', guide.id);
      
      if (guide.type === 'horizontal') {
        handle.style.top = `${guide.position}px`;
      } else {
        handle.style.left = `${guide.position}px`;
      }

      // Drag handler for Guide Line Handle
      handle.addEventListener('mousedown', (e) => {
        activeDragGuideId = guide.id;
        activeDragType = guide.type;
        dragStartOffset = (guide.type === 'horizontal' ? e.clientY : e.clientX) - guide.position;
        e.preventDefault();
      });

      // Double click toggles active state
      handle.addEventListener('dblclick', () => {
        guide.active = !guide.active;
        applySettings(currentSettings);
        saveSettingsToStorage();
        
        try {
          chrome.runtime.sendMessage({ type: 'GUIDE_TOGGLED', id: guide.id, active: guide.active });
        } catch (err) {
          // popup might be closed
        }
      });
      
      guidesContainer.appendChild(line);
      guidesContainer.appendChild(handle);
    });

    updateLabels();
  }

  // Calculate & update labels displaying pixel distances
  function updateLabels() {
    labelsContainer.innerHTML = '';

    // Horizontal labels (between active horizontal guides)
    const activeH = currentSettings.guides
      .filter(g => g.type === 'horizontal' && g.active !== false)
      .sort((a, b) => a.position - b.position);

    for (let i = 0; i < activeH.length - 1; i++) {
      const g1 = activeH[i];
      const g2 = activeH[i+1];
      const distance = Math.round(g2.position - g1.position);
      const mid = (g1.position + g2.position) / 2;

      const label = document.createElement('div');
      label.className = 'guide-label-el';
      label.style.top = `${mid}px`;
      label.style.left = '50vw'; // center horizontally
      label.textContent = `${distance}px`;
      labelsContainer.appendChild(label);
    }

    // Vertical labels (between active vertical guides)
    const activeV = currentSettings.guides
      .filter(g => g.type === 'vertical' && g.active !== false)
      .sort((a, b) => a.position - b.position);

    for (let i = 0; i < activeV.length - 1; i++) {
      const g1 = activeV[i];
      const g2 = activeV[i+1];
      const distance = Math.round(g2.position - g1.position);
      const mid = (g1.position + g2.position) / 2;

      const label = document.createElement('div');
      label.className = 'guide-label-el';
      label.style.left = `${mid}px`;
      label.style.top = '50vh'; // center vertically
      label.textContent = `${distance}px`;
      labelsContainer.appendChild(label);
    }
  }

  // Figma Image overlay drag logic
  dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX - posX;
    dragStartY = e.clientY - posY;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (activeDragGuideId) {
      const pos = (activeDragType === 'horizontal' ? e.clientY : e.clientX) - dragStartOffset;
      const roundedPos = Math.max(0, Math.round(pos));
      
      const guide = currentSettings.guides.find(g => g.id === activeDragGuideId);
      if (guide) {
        guide.position = roundedPos;
        
        const lineEl = shadow.querySelector(`.guide-line-el[data-id="${activeDragGuideId}"]`);
        const handleEl = shadow.querySelector(`.guide-handle-el[data-id="${activeDragGuideId}"]`);
        
        if (lineEl && handleEl) {
          if (activeDragType === 'horizontal') {
            lineEl.style.top = `${roundedPos}px`;
            handleEl.style.top = `${roundedPos}px`;
          } else {
            lineEl.style.left = `${roundedPos}px`;
            handleEl.style.left = `${roundedPos}px`;
          }
        }
        
        updateLabels();
        
        try {
          chrome.runtime.sendMessage({ type: 'GUIDE_DRAGGED', id: activeDragGuideId, position: roundedPos });
        } catch (err) {
          // popup closed
        }
      }
    } else if (isDragging) {
      posX = e.clientX - dragStartX;
      posY = e.clientY - dragStartY;
      updateImageTransform();
    }
  });

  window.addEventListener('mouseup', () => {
    let shouldSave = false;
    if (activeDragGuideId) {
      activeDragGuideId = null;
      activeDragType = null;
      shouldSave = true;
    }
    if (isDragging) {
      isDragging = false;
      shouldSave = true;
    }
    if (shouldSave) {
      saveSettingsToStorage();
    }
  });

  // Message listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_SETTINGS') {
      applySettings(message.settings);
      sendResponse({ status: 'ok' });
    } else if (message.type === 'GET_STATE') {
      sendResponse({
        imageX: posX,
        imageY: posY,
        guides: currentSettings.guides
      });
    }
    return true;
  });

  // Initial load request from storage
  (async () => {
    try {
      const url = new URL(window.location.href);
      const host = url.host;
      const hostname = url.hostname;
      const result = await chrome.storage.local.get([host, hostname]);
      const settings = result[host] || result[hostname];
      if (settings) {
        applySettings(settings);
      }
    } catch (e) {
      console.log('Error initializing overlay from storage', e);
    }
  })();
})();
