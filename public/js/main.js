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
const USER_LOCATION_KEY = 'rakshakLastKnownLocation';
const LOCATION_MAX_AGE_MS = 5 * 60 * 1000;

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

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const canUsePreciseLocation = () => window.isSecureContext || isLocalhost;

const saveLastKnownLocation = (coords, source = 'gps') => {
  if (!coords) return;

  const payload = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy || '',
    source,
    capturedAt: Date.now()
  };

  try {
    window.localStorage.setItem(USER_LOCATION_KEY, JSON.stringify(payload));
  } catch (error) {
    // Location still submits even if browser storage is unavailable.
  }
};

const getLastKnownLocation = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(USER_LOCATION_KEY) || 'null');
    if (!saved || !saved.latitude || !saved.longitude) return null;
    if (Date.now() - saved.capturedAt > LOCATION_MAX_AGE_MS) return null;
    return saved;
  } catch (error) {
    return null;
  }
};

const requestAndCacheUserLocation = ({ showStatus = false } = {}) => new Promise((resolve) => {
  if (!navigator.geolocation || !canUsePreciseLocation()) {
    resolve(null);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      saveLastKnownLocation(pos.coords, 'gps');
      if (showStatus) {
        showToast(`Location ready within about ${Math.round(pos.coords.accuracy || 0)} meters.`, 'success');
      }
      resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        source: 'gps'
      });
    },
    () => {
      resolve(null);
    },
    { timeout: 15000, maximumAge: 0, enableHighAccuracy: true }
  );
});

const getLocationPermissionState = async () => {
  if (!navigator.permissions?.query) return 'unknown';

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch (error) {
    return 'unknown';
  }
};

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
  setTimeout(() => map.invalidateSize(), 150);
  setTimeout(() => map.invalidateSize(), 600);
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

const setSosLocationFields = (form, { latitude, longitude, accuracy = '', source = 'unavailable' }) => {
  const latitudeInput = form.querySelector('[name="latitude"]');
  const longitudeInput = form.querySelector('[name="longitude"]');
  const accuracyInput = form.querySelector('[name="locationAccuracy"]');
  const sourceInput = form.querySelector('[name="locationSource"]');

  if (latitudeInput) latitudeInput.value = latitude ?? '';
  if (longitudeInput) longitudeInput.value = longitude ?? '';
  if (accuracyInput) accuracyInput.value = accuracy ?? '';
  if (sourceInput) sourceInput.value = source;
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
      .bindPopup(`<strong>${escapeHtml(m.title)}</strong><br>${escapeHtml(m.disasterType)}<br>Severity: ${escapeHtml(m.severity)}`)
      .addTo(cluster);
  });
  
  const resources = JSON.parse(mapEl.dataset.resources || '[]');
  const resourceLayer = L.featureGroup();
  resources.forEach(r => {
    L.marker([r.latitude, r.longitude], { icon: mapIcons.resource(r.type) })
      .bindPopup(`<strong>${escapeHtml(r.name)}</strong><br>${escapeHtml(r.type)}<br>Capacity: ${escapeHtml(r.capacity)}<br>${escapeHtml(r.contact)}`)
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

const setupAdminSosMap = (mapEl) => {
  if (!mapEl) return;
  
  let markers = [];
  try {
    markers = JSON.parse(mapEl.dataset.markers || '[]');
  } catch (e) {
    console.error('Failed to parse admin map data', e);
  }

  const center = markers.length ? [markers[0].latitude, markers[0].longitude] : [20.5937, 78.9629];
  const map = initLeafletMap(mapEl.id, { center, zoom: 6 });
  if (!map) return;

  const markersLayer = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 50
  });

  const bounds = L.latLngBounds();

  markers.forEach(m => {
    if (m.latitude && m.longitude) {
      const latLng = [m.latitude, m.longitude];
      const isPending = m.status === 'Pending';
      const inProgress = m.status === 'In Progress';
      const color = m.usedFallback ? '#64748b' : (isPending ? '#ef4444' : (inProgress ? '#f59e0b' : '#10b981'));
      
      const markerHtml = `
        <div class="custom-marker" style="background-color: ${color}; border: 2px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
      `;

      const icon = L.divIcon({ html: markerHtml, className: '', iconSize: [16, 16], iconAnchor: [8, 8] });
      const marker = L.marker(latLng, { icon });
      
      const locationLabel = m.usedFallback
        ? 'Approximate state fallback'
        : (m.locationSource === 'gps'
          ? `GPS exact${m.locationAccuracy ? ` ~${Math.round(m.locationAccuracy)}m` : ''}`
          : (m.locationSource === 'ip' ? 'Approximate IP location' : 'Shared coordinates'));
      const directionsLink = m.directionsUrl
        ? `<br><a href="${escapeHtml(m.directionsUrl)}" target="_blank" rel="noopener">Open directions</a>`
        : '';

      marker.bindPopup(`<strong>${escapeHtml(m.userName)}</strong><br>${escapeHtml(m.status)}<br>${escapeHtml(m.distressMessage)}<br>${escapeHtml(locationLabel)}${directionsLink}`);
      markersLayer.addLayer(marker);
      bounds.extend(latLng);
    }
  });

  map.addLayer(markersLayer);
  if (markers.length > 0 && bounds.isValid()) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
  }
};const initAllMaps = () => {
  const alertMapEl = document.getElementById('alertMap');
  if (alertMapEl) setupAlertMap(alertMapEl);

  const adminSosMapEl = document.getElementById('sosMap');
  if (adminSosMapEl && adminSosMapEl.hasAttribute('data-markers')) {
    setupAdminSosMap(adminSosMapEl);
  }

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

  const sosForm = document.getElementById('sosForm');
  if (sosForm) {
    sosForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = sosForm.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending...';
      }

      const submitWithoutExactLocation = (message) => {
        setSosLocationFields(sosForm, { source: 'unavailable' });
        alert(message);
        sosForm.submit();
      };

      const requestPermissionAndRetry = async (message) => {
        const shouldRetry = confirm(`${message}\n\nPress OK after turning on phone Location/GPS and allowing location permission. Press Cancel to send SOS without exact location.`);
        if (!shouldRetry) {
          submitWithoutExactLocation('SOS sent without exact GPS location.');
          return;
        }

        if (btn) btn.textContent = 'Getting location...';
        const freshLocation = await requestAndCacheUserLocation({ showStatus: true });

        if (freshLocation) {
          setSosLocationFields(sosForm, freshLocation);
          sosForm.submit();
          return;
        }

        submitWithoutExactLocation('Still could not get exact GPS location. Please check browser permission and phone Location settings.');
      };

      if (!canUsePreciseLocation()) {
        submitWithoutExactLocation('Exact GPS needs HTTPS. SOS will be sent, but exact location is not available.');
        return;
      }

      if (navigator.geolocation) {
        const permissionState = await getLocationPermissionState();
        if (permissionState === 'denied') {
          await requestPermissionAndRetry('Location permission is blocked for this website. Please enable location permission from browser/site settings.');
          return;
        }

        if (btn) btn.textContent = 'Getting location...';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            saveLastKnownLocation(pos.coords, 'gps');
            setSosLocationFields(sosForm, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              source: 'gps'
            });
            showToast(`GPS location captured within about ${Math.round(pos.coords.accuracy || 0)} meters.`, 'success');
            sosForm.submit();
          },
          (err) => {
            console.warn('GPS failed or blocked:', err);
            const cachedLocation = getLastKnownLocation();
            if (cachedLocation) {
              setSosLocationFields(sosForm, cachedLocation);
              const useCached = confirm('Exact live GPS is not available right now. Use your recent GPS location for SOS? Press Cancel to retry location permission.');
              if (useCached) {
                showToast('Using your recent GPS location for SOS.', 'info');
                sosForm.submit();
              } else {
                requestPermissionAndRetry('Please allow location permission and keep phone GPS on for exact SOS location.');
              }
              return;
            }
            requestPermissionAndRetry('Exact GPS location was not available. Please allow location permission and keep phone GPS on for exact SOS location.');
          },
          { timeout: 15000, maximumAge: 0, enableHighAccuracy: true }
        );
      } else {
        submitWithoutExactLocation('This browser does not support GPS location. SOS will be sent without exact location.');
      }
    });
  }

  requestAndCacheUserLocation({ showStatus: false });

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
