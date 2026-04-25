/* ── Globals & State ── */
let currentAudio = null;
let currentVoiceButton = null;
let playbackCancelled = false;
let autoRefreshInterval = null;
let isAutoRefreshPaused = false;

/* ── UI Elements ── */
const darkModeToggle = document.getElementById('darkModeToggle');
const contrastToggle = document.getElementById('contrastToggle');
const refreshToggle = document.getElementById('refreshToggle');
const filterForm = document.getElementById('filterForm');
const alertContent = document.getElementById('alertContent');

/* ── Constants ── */
const DARK_MODE_KEY = 'rakshakDarkMode';
const ACCESSIBILITY_MODE_KEY = 'disasterhelpAccessibilityMode';

const stateCenters = [
  { state: 'Maharashtra', latitude: 19.75, longitude: 75.71 },
  { state: 'Gujarat', latitude: 22.26, longitude: 71.19 },
  { state: 'Karnataka', latitude: 15.31, longitude: 75.71 },
  { state: 'Kerala', latitude: 10.85, longitude: 76.27 },
  { state: 'Tamil Nadu', latitude: 11.13, longitude: 78.65 },
  { state: 'Delhi', latitude: 28.61, longitude: 77.20 },
  { state: 'Rajasthan', latitude: 27.02, longitude: 74.21 },
  { state: 'West Bengal', latitude: 22.98, longitude: 87.85 }
];

/* ── 1. Accessibility & Dark Mode ── */
const applyDarkMode = (enabled) => {
  document.body.classList.toggle('dark-mode', enabled);
  if (darkModeToggle) {
    darkModeToggle.textContent = enabled ? '☀️ Light Mode' : '🌙 Dark Mode';
  }
};

const applyAccessibilityMode = (enabled) => {
  document.body.classList.toggle('accessibility-mode', enabled);
  if (contrastToggle) {
    contrastToggle.textContent = enabled ? 'Standard Mode' : 'Accessibility Mode';
  }
};

if (darkModeToggle) {
  const savedDark = window.localStorage.getItem(DARK_MODE_KEY) === 'true';
  applyDarkMode(savedDark);
  darkModeToggle.addEventListener('click', () => {
    const nextValue = !document.body.classList.contains('dark-mode');
    applyDarkMode(nextValue);
    window.localStorage.setItem(DARK_MODE_KEY, String(nextValue));
  });
}

if (contrastToggle) {
  const savedAccess = window.localStorage.getItem(ACCESSIBILITY_MODE_KEY) === 'true';
  applyAccessibilityMode(savedAccess);
  contrastToggle.addEventListener('click', () => {
    const nextValue = !document.body.classList.contains('accessibility-mode');
    applyAccessibilityMode(nextValue);
    window.localStorage.setItem(ACCESSIBILITY_MODE_KEY, String(nextValue));
  });
}

/* ── 2. Toasts ── */
const showToast = (message, type = 'info') => {
  const container = document.getElementById('siteToastContainer') || (() => {
    const div = document.createElement('div');
    div.id = 'siteToastContainer';
    div.className = 'toast-container';
    document.body.appendChild(div);
    return div;
  })();

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
};

/* ── 3. Voice / TTS ── */
const chunkText = (text, maxLength = 160) => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  
  const chunks = [];
  let currentChunk = '';
  
  // Split by sentences first
  const sentences = cleaned.split(/(?<=[.?!।])\s+/);
  
  sentences.forEach(sentence => {
    if ((currentChunk + ' ' + sentence).length <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      
      if (sentence.length <= maxLength) {
        currentChunk = sentence;
      } else {
        // Long sentence: split by words
        const words = sentence.split(' ');
        currentChunk = '';
        words.forEach(word => {
          if ((currentChunk + ' ' + word).length <= maxLength) {
            currentChunk += (currentChunk ? ' ' : '') + word;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = word;
          }
        });
      }
    }
  });
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
};

const stopAudio = () => {
  playbackCancelled = true;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentVoiceButton) {
    currentVoiceButton.textContent = currentVoiceButton.dataset.defaultLabel || 'Listen';
    currentVoiceButton.classList.remove('is-speaking');
    currentVoiceButton = null;
  }
};

const speakText = async (button) => {
  if (currentVoiceButton === button) return stopAudio();
  stopAudio();

  const text = button.dataset.speak;
  const language = button.dataset.language || 'English';
  if (!text) return;

  button.dataset.defaultLabel = button.textContent;
  button.textContent = 'Stop';
  button.classList.add('is-speaking');
  currentVoiceButton = button;
  playbackCancelled = false;

  try {
    const chunks = chunkText(text);
    console.log(`Speaking ${chunks.length} chunks in ${language}`);
    
    for (const chunk of chunks) {
      if (playbackCancelled) break;
      const url = `/tts?language=${encodeURIComponent(language)}&text=${encodeURIComponent(chunk)}`;
      
      await new Promise((res, rej) => {
        currentAudio = new Audio(url);
        currentAudio.onended = res;
        currentAudio.onerror = (e) => {
          console.error('Audio error:', e);
          rej(e);
        };
        currentAudio.play().catch(err => {
          console.error('Playback block:', err);
          rej(err);
        });
      });
    }
  } catch (err) {
    console.error('TTS execution error:', err);
    showToast('Voice playback failed. Please check your internet or try again.', 'error');
  } finally {
    if (currentVoiceButton === button) stopAudio();
  }
};

/* ── 4. Maps (Leaflet + Clustering) ── */
const mapIcons = {
  severity: (sev) => L.divIcon({
    className: '',
    html: `<span class="map-severity-marker ${(sev || 'low').toLowerCase()}"></span>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -8]
  }),
  center: () => L.divIcon({
    className: '',
    html: '<span class="map-center-marker"></span>',
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -8]
  }),
  user: () => L.divIcon({
    className: '',
    html: '<span class="map-user-marker"></span>',
    iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -10]
  }),
  sos: (status) => L.divIcon({
    className: '',
    html: `<span class="map-sos-marker ${status?.toLowerCase().replace(' ', '-') || 'new'}"></span>`,
    iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -9]
  }),
  resource: (type) => L.divIcon({
    className: '',
    html: `<span class="map-resource-marker ${type.toLowerCase().replace(' ', '-')}"></span>`,
    iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -9]
  })
};

const initLeafletMap = (elId, options = {}) => {
  const el = document.getElementById(elId);
  if (!el || typeof L === 'undefined') return null;

  const map = L.map(el, {
    zoomControl: true, scrollWheelZoom: false, dragging: false,
    attributionControl: true, ...options
  });

  const base = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);

  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
  });

  L.control.layers({ "Street View": base, "Satellite": satellite }, {}, { collapsed: true }).addTo(map);
  return map;
};

const resetMapView = (map, center, markers) => {
  if (!map || !center) return;
  const bounds = [[center.latitude, center.longitude], ...markers.map(m => [m.latitude, m.longitude])];
  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [36, 36] });
  } else {
    map.setView([center.latitude, center.longitude], 6);
  }
};

const addUserLocationToMap = (map, btn) => {
  if (!navigator.geolocation) return showToast('Geolocation not supported.', 'warning');
  const label = btn.textContent;
  btn.textContent = 'Locating...';
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const latLng = [pos.coords.latitude, pos.coords.longitude];
      if (map.userLayer) map.removeLayer(map.userLayer);
      map.userLayer = L.featureGroup([
        L.circle(latLng, { radius: pos.coords.accuracy || 100, color: '#2563eb', weight: 1, fillOpacity: 0.1 }),
        L.marker(latLng, { icon: mapIcons.user() }).bindPopup('Your Position')
      ]).addTo(map);
      map.fitBounds(map.userLayer.getBounds(), { padding: [40, 40], maxZoom: 14 });
      showToast('Position updated on map.', 'success');
      btn.textContent = label; btn.disabled = false;
    },
    () => {
      showToast('Location access denied.', 'error');
      btn.textContent = label; btn.disabled = false;
    }
  );
};

const setupAlertMap = (mapEl) => {
  const center = JSON.parse(mapEl.dataset.center || 'null');
  const markers = JSON.parse(mapEl.dataset.markers || '[]');
  if (!center) return;

  const map = initLeafletMap(mapEl.id, { center: [center.latitude, center.longitude], zoom: 6 });
  const cluster = L.markerClusterGroup({ showCoverageOnHover: false });
  
  L.marker([center.latitude, center.longitude], { icon: mapIcons.center() })
    .bindPopup('State Center Reference').addTo(map);

  markers.forEach(m => {
    L.marker([m.latitude, m.longitude], { icon: mapIcons.severity(m.severity) })
      .bindPopup(`<strong>${m.title}</strong><br>${m.disasterType}<br>Severity: ${m.severity}`)
      .addTo(cluster);
  });
  
  const resources = JSON.parse(mapEl.dataset.resources || '[]');
  const resourceLayer = L.featureGroup();
  resources.forEach(r => {
    L.marker([r.latitude, r.longitude], { icon: mapIcons.resource(r.type) })
      .bindPopup(`<strong>${r.name}</strong><br>${r.type}<br>Capacity: ${r.capacity}<br>${r.contact}`)
      .addTo(resourceLayer);
  });
  
  map.addLayer(cluster);
  map.addLayer(resourceLayer);

  L.control.layers(null, { "Alerts": cluster, "Safe Zones": resourceLayer }, { collapsed: false, position: 'bottomleft' }).addTo(map);

  const overlay = document.getElementById('mapActivateOverlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      overlay.classList.add('is-hidden');
      map.dragging.enable();
      map.scrollWheelZoom.enable();
    });
  }

  // Bind Control Buttons - Search globally within alertContent or document
  const resetBtn = document.getElementById('resetMapBtn');
  if (resetBtn) resetBtn.onclick = () => resetMapView(map, center, markers);

  const locateBtn = document.getElementById('locateOnMapBtn');
  if (locateBtn) locateBtn.onclick = () => addUserLocationToMap(map, locateBtn);

  const expandBtn = document.getElementById('expandMapBtn');
  const modal = document.getElementById('fullMapModal');
  if (expandBtn) {
    expandBtn.onclick = () => {
      if (modal) {
        modal.classList.add('is-visible');
        modal.setAttribute('aria-hidden', 'false');
        // Trigger resize for Leaflet in modal
        setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
      } else {
        const shell = mapEl.closest('.map-shell');
        if (shell) {
          const isExpanded = shell.classList.toggle('is-expanded');
          expandBtn.textContent = isExpanded ? 'Collapse Map' : 'Expand Map';
          setTimeout(() => map.invalidateSize(), 150);
        }
      }
    };
  }

  const closeMapBtn = document.getElementById('closeMapModalBtn');
  if (closeMapBtn && modal) {
    closeMapBtn.onclick = () => {
      modal.classList.remove('is-visible');
      modal.setAttribute('aria-hidden', 'true');
    };
  }
  
  return map;
};

let activeSosMap = null;
let activeRoutingLayer = null;

const setupSosMap = (mapEl) => {
  if (!mapEl) return;
  console.log('Initializing SOS Map...');

  let markers = [];
  let center = null;
  try {
    markers = JSON.parse(mapEl.dataset.markers || '[]');
    center = JSON.parse(mapEl.dataset.center || 'null');
  } catch (e) {
    console.error('Failed to parse SOS map data', e);
  }

  if (!markers.length && !center) {
    console.log('No markers or center for SOS map');
    return;
  }

  const initialCenter = center ? [center.latitude, center.longitude] : (markers.length ? [markers[0].latitude, markers[0].longitude] : [20.5937, 78.9629]);
  const map = initLeafletMap(mapEl.id, { center: initialCenter, zoom: 6, dragging: true, scrollWheelZoom: true });
  
  if (!map) {
    console.error('initLeafletMap returned null for', mapEl.id);
    const errEl = document.getElementById('mapError');
    if (errEl) errEl.style.display = 'block';
    return;
  }

  activeSosMap = map;
  
  const mapMarkers = {};
  markers.forEach(m => {
    const marker = L.marker([m.latitude, m.longitude], { icon: mapIcons.sos(m.status) })
      .bindPopup(`<strong>${m.userName}</strong><br>${m.distressMessage}<br><small>Status: ${m.status}</small>`)
      .addTo(map);
    
    if (m.id) mapMarkers[m.id] = marker;
  });

  const resetBtn = document.getElementById('resetMapBtn');
  if (resetBtn) resetBtn.onclick = () => {
    if (center) map.setView([center.latitude, center.longitude], 6);
    else if (markers.length) map.setView([markers[0].latitude, markers[0].longitude], 6);
    if (activeRoutingLayer) map.removeLayer(activeRoutingLayer);
  };

  const locateBtn = document.getElementById('locateOnMapBtn');
  if (locateBtn) locateBtn.onclick = () => addUserLocationToMap(map, locateBtn);

  // Expose focus function
  window.focusOnSosRequest = (id, lat, lng) => {
    if (!activeSosMap) return;
    
    activeSosMap.setView([lat, lng], 14);
    if (mapMarkers[id]) mapMarkers[id].openPopup();
    
    // Attempt to draw a path if we have user location
    if (activeSosMap.userLayer) {
      const userLatLng = activeSosMap.userLayer.getBounds().getCenter();
      if (activeRoutingLayer) activeSosMap.removeLayer(activeRoutingLayer);
      
      activeRoutingLayer = L.polyline([userLatLng, [lat, lng]], {
        color: '#ef4444', weight: 4, dashArray: '10, 10', opacity: 0.8
      }).addTo(activeSosMap);
      
      activeSosMap.fitBounds(activeRoutingLayer.getBounds(), { padding: [40, 40] });
      showToast('Path drawn on map.', 'info');
    } else {
      showToast('Click "My Position" first to see the path.', 'warning');
    }
    
    // Smooth scroll to map
    const mapContainer = document.getElementById('sosMap');
    if (mapContainer) mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return map;
};

const initAllMaps = () => {
  const alertMapEl = document.getElementById('alertMap');
  if (alertMapEl) setupAlertMap(alertMapEl);

  const sosMapEl = document.getElementById('sosMap');
  if (sosMapEl) setupSosMap(sosMapEl);

  const fullMapEl = document.getElementById('fullAlertMap');
  if (fullMapEl) setupAlertMap(fullMapEl);
};

/* ── 5. AJAX & Transitions ── */
const handleFilterSubmit = async (e) => {
  if (e) e.preventDefault();
  const form = document.getElementById('filterForm');
  const container = document.getElementById('alertContent');
  if (!container) return;

  container.classList.add('is-loading');
  
  const formData = new FormData(form);
  const params = new URLSearchParams(formData);
  const url = `${form.action || window.location.pathname}?${params.toString()}`;

  try {
    const response = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const html = await response.text();
    
    // Smooth transition
    container.style.opacity = '0';
    setTimeout(() => {
      container.innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('alertContent').innerHTML;
      container.style.opacity = '1';
      container.classList.remove('is-loading');
      initAllMaps();
      rebindEvents();
    }, 200);
    
    window.history.pushState({}, '', url);
  } catch (error) {
    console.error('Filter update failed:', error);
    container.classList.remove('is-loading');
    container.style.opacity = '1';
    showToast('Failed to update alerts.', 'error');
  }
};

/* ── 6. Sharing ── */
const shareWhatsApp = (title, url) => {
  const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
  const text = encodeURIComponent(`🚨 *Rakshak Alert*: ${title}\nCheck details here: ${fullUrl}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  });
};

/* ── 7. Lifecycle & Binding ── */
const rebindEvents = () => {
  document.querySelectorAll('.voice-btn').forEach(btn => {
    btn.onclick = () => speakText(btn);
  });

  document.querySelectorAll('.share-btn.whatsapp').forEach(btn => {
    btn.onclick = () => shareWhatsApp(btn.dataset.title, btn.dataset.url);
  });

  document.querySelectorAll('.share-btn.copy').forEach(btn => {
    btn.onclick = () => copyToClipboard(btn.dataset.text);
  });

  const instantClose = document.getElementById('closeInstantAlert');
  if (instantClose) {
    instantClose.onclick = () => {
      const modal = document.getElementById('instantAlertModal');
      if (modal) modal.classList.remove('is-visible');
    };
  }

  const useLoc = document.getElementById('useLocationBtn');
  if (useLoc) {
    useLoc.onclick = () => {
      if (!navigator.geolocation) return showToast('Geolocation not supported.', 'warning');
      useLoc.textContent = 'Detecting...';
      useLoc.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const nearest = stateCenters.map(s => ({
            ...s, dist: Math.sqrt(Math.pow(s.latitude - lat, 2) + Math.pow(s.longitude - lon, 2))
          })).sort((a, b) => a.dist - b.dist)[0];
          
          const stateSelect = document.getElementById('stateSelect');
          if (stateSelect) {
            stateSelect.value = nearest.state;
            handleFilterSubmit(); // Use AJAX to switch
          } else {
            window.location.href = `/alerts?state=${nearest.state}`;
          }
          useLoc.textContent = 'Use My Location'; useLoc.disabled = false;
        },
        () => {
          showToast('Location denied.', 'warning');
          useLoc.textContent = 'Use My Location'; useLoc.disabled = false;
        }
      );
    };
  }
};

const init = () => {
  initAllMaps();
  rebindEvents();

  const form = document.getElementById('filterForm');
  if (form) {
    form.addEventListener('submit', handleFilterSubmit);
  }

  // Auto Refresh logic
  const startAutoRefresh = () => {
    autoRefreshInterval = setInterval(() => {
      if (!isAutoRefreshPaused) handleFilterSubmit();
    }, 60000); // 1 minute
  };

  const refreshBtn = document.getElementById('refreshToggle');
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      isAutoRefreshPaused = !isAutoRefreshPaused;
      refreshBtn.textContent = isAutoRefreshPaused ? 'Resume Refresh' : 'Pause Refresh';
      const statusText = document.getElementById('refreshStatus');
      if (statusText) statusText.textContent = isAutoRefreshPaused ? 'Updates paused' : 'Live updates active';
    };
    startAutoRefresh();
  }
};

window.onload = init;
window.onbeforeunload = stopAudio;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW Registered', reg.scope);
    }).catch(err => {
      console.log('SW Failed', err);
    });
  });
}
