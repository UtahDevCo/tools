document.addEventListener('DOMContentLoaded', async () => {
  // UI Elements
  const gridEnable = document.getElementById('gridEnable');
  const gridSpacing = document.getElementById('gridSpacing');
  const gridColor = document.getElementById('gridColor');
  const gridStyle = document.getElementById('gridStyle');
  const gridOffsetX = document.getElementById('gridOffsetX');
  const gridOffsetY = document.getElementById('gridOffsetY');
  
  const addHGuideBtn = document.getElementById('addHGuideBtn');
  const addVGuideBtn = document.getElementById('addVGuideBtn');
  const activateAllGuidesBtn = document.getElementById('activateAllGuidesBtn');
  const deactivateAllGuidesBtn = document.getElementById('deactivateAllGuidesBtn');
  const deleteAllGuidesBtn = document.getElementById('deleteAllGuidesBtn');
  const guidesList = document.getElementById('guidesList');
  
  const imageEnable = document.getElementById('imageEnable');
  const imageUpload = document.getElementById('imageUpload');
  const imageOpacity = document.getElementById('imageOpacity');
  const opacityVal = document.getElementById('opacityVal');
  const imageScale = document.getElementById('imageScale');
  const scaleVal = document.getElementById('scaleVal');
  
  const savePresetBtn = document.getElementById('savePresetBtn');
  const clearPresetBtn = document.getElementById('clearPresetBtn');
  const statusMessage = document.getElementById('statusMessage');

  // State
  let currentSettings = {
    gridEnabled: false,
    gridSpacing: '1rem',
    gridColor: '#00ff00',
    gridStyle: 'dashed',
    gridOffsetX: 0,
    gridOffsetY: 0,
    imageEnabled: false,
    imageDataDataUrl: null,
    imageOpacity: 0.5,
    imageScale: 1.0,
    imageX: 0,
    imageY: 0,
    guides: [] // array of { id, type, position, color, active }
  };

  let currentHost = 'default';

  // Get current tab host
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let hostname = 'default';
  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      currentHost = url.host; // Use url.host to include port
      hostname = url.hostname;
    } catch (e) {
      console.error('Invalid URL:', tab.url);
    }
  }

  // Load from storage (with fallback from url.hostname to url.host)
  const result = await chrome.storage.local.get([currentHost, hostname]);
  const settings = result[currentHost] || result[hostname];
  if (settings) {
    currentSettings = { ...currentSettings, ...settings };
    if (!currentSettings.guides) currentSettings.guides = [];
    updateUIFromSettings();
  }

  // Update UI function
  function updateUIFromSettings() {
    gridEnable.checked = currentSettings.gridEnabled;
    gridSpacing.value = currentSettings.gridSpacing;
    gridColor.value = currentSettings.gridColor;
    gridStyle.value = currentSettings.gridStyle;
    gridOffsetX.value = currentSettings.gridOffsetX || 0;
    gridOffsetY.value = currentSettings.gridOffsetY || 0;
    
    imageEnable.checked = currentSettings.imageEnabled;
    imageOpacity.value = currentSettings.imageOpacity;
    opacityVal.textContent = currentSettings.imageOpacity;
    imageScale.value = currentSettings.imageScale;
    scaleVal.textContent = currentSettings.imageScale;
    
    renderGuidesList();
  }

  // Render Guides List in Popup
  function renderGuidesList() {
    guidesList.innerHTML = '';
    if (currentSettings.guides.length === 0) {
      guidesList.innerHTML = '<div style="color: #999; text-align: center; padding: 8px;">No guides created</div>';
      return;
    }
    
    currentSettings.guides.forEach((guide) => {
      const item = document.createElement('div');
      item.className = 'guide-item';
      
      const typeLabel = document.createElement('span');
      typeLabel.textContent = `${guide.type === 'horizontal' ? 'H' : 'V'} - ${Math.round(guide.position)}px`;
      typeLabel.title = `Double click handle on page to toggle`;
      
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = guide.color || '#ff0000';
      colorInput.addEventListener('input', (e) => {
        guide.color = e.target.value;
        broadcastSettings();
      });
      
      const activeCheckbox = document.createElement('input');
      activeCheckbox.type = 'checkbox';
      activeCheckbox.checked = guide.active !== false;
      activeCheckbox.title = "Toggle active state";
      activeCheckbox.addEventListener('change', (e) => {
        guide.active = e.target.checked;
        broadcastSettings();
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.title = "Delete guide";
      deleteBtn.addEventListener('click', () => {
        currentSettings.guides = currentSettings.guides.filter(g => g.id !== guide.id);
        renderGuidesList();
        broadcastSettings();
      });
      
      item.appendChild(typeLabel);
      item.appendChild(colorInput);
      item.appendChild(activeCheckbox);
      item.appendChild(deleteBtn);
      guidesList.appendChild(item);
    });
  }

  let saveTimeout;
  // Send message to content script and auto-save settings to storage
  async function broadcastSettings() {
    if (!tab || !tab.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', settings: currentSettings });
    } catch (e) {
      console.log('Error sending message. Content script may not be running.', e);
    }

    // Auto-save settings to chrome.storage.local (debounced to avoid excessive writes during input/range dragging)
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const data = {};
        data[currentHost] = currentSettings;
        await chrome.storage.local.set(data);
      } catch (err) {
        console.error('Error auto-saving settings:', err);
      }
    }, 150);
  }

  // Event Listeners for Grid
  gridEnable.addEventListener('change', (e) => {
    currentSettings.gridEnabled = e.target.checked;
    broadcastSettings();
  });
  gridSpacing.addEventListener('input', (e) => {
    currentSettings.gridSpacing = e.target.value;
    broadcastSettings();
  });
  gridColor.addEventListener('input', (e) => {
    currentSettings.gridColor = e.target.value;
    broadcastSettings();
  });
  gridStyle.addEventListener('change', (e) => {
    currentSettings.gridStyle = e.target.value;
    broadcastSettings();
  });
  gridOffsetX.addEventListener('input', (e) => {
    currentSettings.gridOffsetX = parseInt(e.target.value) || 0;
    broadcastSettings();
  });
  gridOffsetY.addEventListener('input', (e) => {
    currentSettings.gridOffsetY = parseInt(e.target.value) || 0;
    broadcastSettings();
  });

  // Event Listeners for Guides
  addHGuideBtn.addEventListener('click', () => {
    const newGuide = {
      id: 'guide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: 'horizontal',
      position: 150, // default position
      color: '#ff0000',
      active: true
    };
    currentSettings.guides.push(newGuide);
    renderGuidesList();
    broadcastSettings();
  });

  addVGuideBtn.addEventListener('click', () => {
    const newGuide = {
      id: 'guide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: 'vertical',
      position: 150, // default position
      color: '#007bff',
      active: true
    };
    currentSettings.guides.push(newGuide);
    renderGuidesList();
    broadcastSettings();
  });

  activateAllGuidesBtn.addEventListener('click', () => {
    currentSettings.guides.forEach(g => g.active = true);
    renderGuidesList();
    broadcastSettings();
  });

  deactivateAllGuidesBtn.addEventListener('click', () => {
    currentSettings.guides.forEach(g => g.active = false);
    renderGuidesList();
    broadcastSettings();
  });

  deleteAllGuidesBtn.addEventListener('click', () => {
    currentSettings.guides = [];
    renderGuidesList();
    broadcastSettings();
  });

  // Listen to messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GUIDE_DRAGGED') {
      const guide = currentSettings.guides.find(g => g.id === message.id);
      if (guide) {
        guide.position = message.position;
        renderGuidesList();
      }
      sendResponse({ status: 'ok' });
    } else if (message.type === 'GUIDE_TOGGLED') {
      const guide = currentSettings.guides.find(g => g.id === message.id);
      if (guide) {
        guide.active = message.active;
        renderGuidesList();
      }
      sendResponse({ status: 'ok' });
    }
  });

  // Event Listeners for Image
  imageEnable.addEventListener('change', (e) => {
    currentSettings.imageEnabled = e.target.checked;
    broadcastSettings();
  });
  imageOpacity.addEventListener('input', (e) => {
    currentSettings.imageOpacity = parseFloat(e.target.value);
    opacityVal.textContent = currentSettings.imageOpacity;
    broadcastSettings();
  });
  imageScale.addEventListener('input', (e) => {
    currentSettings.imageScale = parseFloat(e.target.value);
    scaleVal.textContent = currentSettings.imageScale;
    broadcastSettings();
  });

  // Handle File Upload
  imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      currentSettings.imageDataDataUrl = event.target.result;
      currentSettings.imageEnabled = true;
      imageEnable.checked = true;
      currentSettings.imageX = 0;
      currentSettings.imageY = 0;
      broadcastSettings();
    };
    reader.readAsDataURL(file);
  });

  // Save Settings
  savePresetBtn.addEventListener('click', async () => {
    if (tab && tab.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
        if (response) {
          currentSettings.imageX = response.imageX;
          currentSettings.imageY = response.imageY;
          if (response.guides && Array.isArray(response.guides)) {
            response.guides.forEach((cg) => {
              const pg = currentSettings.guides.find(g => g.id === cg.id);
              if (pg) {
                pg.position = cg.position;
                pg.active = cg.active;
              }
            });
          }
        }
      } catch (e) {
        console.log('Could not sync latest state from content script.', e);
      }
    }

    const data = {};
    data[currentHost] = currentSettings;
    await chrome.storage.local.set(data);
    
    statusMessage.textContent = 'Saved for ' + currentHost;
    setTimeout(() => { statusMessage.textContent = ''; }, 2000);
  });

  // Clear Settings
  clearPresetBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(currentHost);
    currentSettings = {
      gridEnabled: false,
      gridSpacing: '1rem',
      gridColor: '#00ff00',
      gridStyle: 'dashed',
      gridOffsetX: 0,
      gridOffsetY: 0,
      imageEnabled: false,
      imageDataDataUrl: null,
      imageOpacity: 0.5,
      imageScale: 1.0,
      imageX: 0,
      imageY: 0,
      guides: []
    };
    updateUIFromSettings();
    broadcastSettings();
    
    statusMessage.textContent = 'Cleared for ' + currentHost;
    setTimeout(() => { statusMessage.textContent = ''; }, 2000);
  });
  
  broadcastSettings();
});
