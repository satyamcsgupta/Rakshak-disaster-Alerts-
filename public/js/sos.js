document.addEventListener('DOMContentLoaded', () => {
  const sosList = document.getElementById('sosList');
  const statusFilter = document.getElementById('statusFilter');
  const refreshBtn = document.getElementById('refreshBtn');
  const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
  const liveStatus = document.getElementById('liveStatus');
  
  let map, markersLayer, currentRequests = [];
  let markerRefs = {};
  let userLocation = null;
  let activeRouteLayer = null;
  let userMarkerLayer = null;
  let accuracyLayer = null;
  let knownRequestIds = new Set();
  let hasLoadedOnce = false;
  let livePollTimer = null;
  let eventSource = null;
  const SOS_CACHE_KEY = 'rakshakNearbySOSCache';

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  }

  function getCurrentResponderLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        reject,
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0
        }
      );
    });
  }

  function clearActiveRoute() {
    if (activeRouteLayer) {
      map.removeLayer(activeRouteLayer);
      activeRouteLayer = null;
    }
  }

  function setMapOverlay(message) {
    const overlay = document.getElementById('mapOverlay');
    if (!overlay) return;
    overlay.textContent = message;
    overlay.classList.remove('is-hidden');
  }

  function addOrUpdateUserMarker(location) {
    if (!map || !location) return;

    const latLng = [location.lat, location.lng];
    const userIcon = L.divIcon({
      html: '<div class="nearby-user-marker"></div>',
      className: '',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    if (userMarkerLayer) {
      userMarkerLayer.setLatLng(latLng);
      return;
    }

    userMarkerLayer = L.marker(latLng, { icon: userIcon })
      .bindPopup('<strong>Your Location</strong>')
      .addTo(map);
  }

  function drawRouteOnMap(origin, request, routeCoordinates = null) {
    clearActiveRoute();

    const destination = [Number(request.latitude), Number(request.longitude)];
    const originLatLng = [Number(origin.latitude), Number(origin.longitude)];
    const coordinates = routeCoordinates?.length
      ? routeCoordinates.map(([lng, lat]) => [lat, lng])
      : [originLatLng, destination];

    activeRouteLayer = L.featureGroup([
      L.polyline(coordinates, {
        color: '#f97316',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }),
      L.polyline(coordinates, {
        color: '#ffffff',
        weight: 2,
        opacity: 0.85,
        dashArray: '8, 12',
        lineCap: 'round'
      })
    ]).addTo(map);

    addOrUpdateUserMarker({ lat: origin.latitude, lng: origin.longitude });
    map.fitBounds(activeRouteLayer.getBounds(), { padding: [42, 42], maxZoom: 15 });
  }

  async function openRouteFromCurrentLocation(request, button) {
    if (!request || !request.latitude || !request.longitude || request.usedFallback) {
      alert('Exact victim GPS location is not available for route navigation.');
      return;
    }

    const oldLabel = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Getting your location...';
    }

    try {
      const origin = await getCurrentResponderLocation();
      userLocation = { lat: origin.latitude, lng: origin.longitude };
      addOrUpdateUserMarker(userLocation);

      if (button) button.textContent = 'Drawing route...';
      setMapOverlay('Drawing route on this map...');

      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${request.longitude},${request.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(routeUrl);
      const data = await response.json();
      const route = data?.routes?.[0];

      if (!response.ok || !route?.geometry?.coordinates?.length) {
        throw new Error('Routing service did not return a route.');
      }

      drawRouteOnMap(origin, request, route.geometry.coordinates);
      const distanceKm = route.distance ? (route.distance / 1000).toFixed(1) : null;
      const durationMin = route.duration ? Math.round(route.duration / 60) : null;
      const routeSummary = [
        distanceKm ? `${distanceKm} km` : null,
        durationMin ? `${durationMin} min` : null
      ].filter(Boolean).join(' • ');

      setMapOverlay(routeSummary ? `Route shown here: ${routeSummary}` : 'Route shown on this map.');
      focusRequestOnMap(request._id, { keepRoute: true, zoomToMarker: false });
    } catch (error) {
      console.warn('Responder route failed:', error);

      if (userLocation) {
        drawRouteOnMap(
          { latitude: userLocation.lat, longitude: userLocation.lng },
          request
        );
        setMapOverlay('Route service unavailable. Showing direct line on this map.');
      } else {
        alert('Could not get your current location. Allow location access to draw the route on this map.');
        setMapOverlay('Allow location access, then tap Get Route again.');
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = oldLabel || 'Get Route';
      }
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function setLiveStatus(message, type = 'info') {
    if (!liveStatus) return;
    liveStatus.textContent = message;
    liveStatus.dataset.type = type;
  }

  function canNotify() {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  function showBrowserNotification(title, body) {
    if (!canNotify()) return;

    if (navigator.serviceWorker?.ready) {
      navigator.serviceWorker.ready
        .then((registration) => registration.showNotification(title, { body }))
        .catch(() => new Notification(title, { body }));
      return;
    }

    new Notification(title, { body });
  }

  function notifyNewRequests(requests) {
    if (!hasLoadedOnce) return;

    requests.forEach((request) => {
      const id = String(request._id);
      if (knownRequestIds.has(id) || request.isOwner || request.status !== 'Pending') return;
      knownRequestIds.add(id);

      showBrowserNotification('New SOS nearby', `${request.userName || 'Someone'}: ${request.distressMessage || 'Needs help'}`);
    });
  }

  function cacheRequests(requests) {
    try {
      localStorage.setItem(SOS_CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        requests
      }));
    } catch (error) {
      // Live mode should continue even if storage is blocked.
    }
  }

  function loadCachedRequests() {
    try {
      const cached = JSON.parse(localStorage.getItem(SOS_CACHE_KEY) || 'null');
      if (!cached?.requests?.length) return null;
      return cached;
    } catch (error) {
      return null;
    }
  }
  
  // Initialize Leaflet Map
  function initMap() {
    map = L.map('sosMap').setView([20.5937, 78.9629], 5); // Default India center

    const street = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      detectRetina: true
    });

    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
      detectRetina: true
    });

    L.control.layers({
      "Street View": street,
      "Satellite": satellite
    }, {}, { collapsed: false, position: 'topright' }).addTo(map);
    street.addTo(map);

    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);

    markersLayer = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50
    });
    map.addLayer(markersLayer);

    accuracyLayer = L.featureGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 150);
    setTimeout(() => map.invalidateSize(), 600);
    
    // Attempt to center on user state if coordinate mapping exists
    // (This would normally use the stateCoordinates from the backend)
  }

  function fetchRequests({ notify = false, silent = false } = {}) {
    if (!silent) sosList.innerHTML = '<div class="list-loading">Loading requests...</div>';
    const status = statusFilter.value;
    
    fetch(`/sos/api/requests?status=${encodeURIComponent(status)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          currentRequests = data.requests;
          cacheRequests(currentRequests);
          if (notify) notifyNewRequests(currentRequests);
          currentRequests.forEach((request) => knownRequestIds.add(String(request._id)));
          hasLoadedOnce = true;
          renderRequests(currentRequests);
          updateMap(currentRequests, { preserveView: silent });
          setLiveStatus(`Live SOS updates active. Last checked ${new Date().toLocaleTimeString()}.`, 'success');
        }
      })
      .catch(err => {
        const cached = loadCachedRequests();
        if (cached) {
          currentRequests = cached.requests;
          renderRequests(currentRequests);
          updateMap(currentRequests, { preserveView: silent });
          setLiveStatus(`Offline mode: showing cached SOS from ${new Date(cached.savedAt).toLocaleTimeString()}.`, 'warning');
          return;
        }

        sosList.innerHTML = '<div class="error-box">Failed to load requests.</div>';
        setLiveStatus('Connection issue. Retrying live SOS updates...', 'error');
      });
  }

  function connectLiveStream() {
    if (!window.EventSource || eventSource) return;

    eventSource = new EventSource('/sos/api/stream');

    eventSource.addEventListener('connected', () => {
      setLiveStatus('Realtime SOS stream connected.', 'success');
    });

    eventSource.addEventListener('sos', (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'created' && payload.request) {
        notifyNewRequests([payload.request]);
      }
      fetchRequests({ notify: false, silent: true });
    });

    eventSource.onerror = () => {
      setLiveStatus('Realtime stream interrupted. Polling backup is active.', 'warning');
    };
  }

  function renderRequests(requests) {
    if (requests.length === 0) {
      sosList.innerHTML = `
        <div class="empty-state">
          <h3>No SOS requests found</h3>
          <p class="muted">There are currently no matching requests in your area.</p>
        </div>
      `;
      return;
    }

    sosList.innerHTML = requests.map(req => {
      const isPending = req.status === 'Pending';
      const inProgress = req.status === 'In Progress';
      const resolved = req.status === 'Resolved';
      
      const statusClass = isPending ? 'pending' : (inProgress ? 'in-progress' : 'resolved');
      
      let actionsHtml = '';
      if (req.isOwner) {
        actionsHtml = `<button class="btn btn-danger btn-small w-full action-btn cancel-btn" data-id="${req._id}">Cancel My SOS</button>`;
      } else if (isPending) {
        actionsHtml = `<button class="btn btn-primary btn-small w-full action-btn accept-btn" data-id="${req._id}">Help Now</button>`;
      } else if (inProgress) {
        actionsHtml = `<button class="btn btn-success btn-small w-full action-btn resolve-btn" data-id="${req._id}">Mark Resolved</button>`;
      }

      const mapLink = req.latitude && req.longitude && !req.usedFallback
        ? `<button type="button" class="btn btn-secondary btn-small w-full route-btn" data-id="${req._id}" style="grid-column: 1 / -1;">Get Route</button>`
        : '';
        
      let distanceHtml = '';
      if (userLocation && req.latitude && req.longitude && !req.usedFallback) {
        const dist = calculateDistance(userLocation.lat, userLocation.lng, req.latitude, req.longitude);
        if (dist < 0.05) {
          distanceHtml = `<div style="font-size: 0.85rem; color: #10b981; margin-top: 5px; font-weight: 600;">📍 You and the victim are at the exact same position</div>`;
        } else {
          distanceHtml = `<div style="font-size: 0.85rem; color: #64748b; margin-top: 5px;">📍 Distance: ${dist.toFixed(2)} km away</div>`;
        }
      }

      const fallbackBadge = req.usedFallback ? `<div style="font-size: 0.75rem; color: #f59e0b; margin-top: 5px;">⚠️ Exact GPS not available. Map shows approximate state area.</div>` : '';
      const accuracyBadge = !req.usedFallback && req.locationSource === 'gps'
        ? `<div style="font-size: 0.75rem; color: #10b981; margin-top: 5px;">GPS exact${req.locationAccuracy ? ` (~${Math.round(req.locationAccuracy)}m)` : ''}</div>`
        : (!req.usedFallback && req.locationSource === 'ip'
          ? `<div style="font-size: 0.75rem; color: #f59e0b; margin-top: 5px;">Approximate IP location</div>`
          : '');

      return `
        <div class="sos-card modern-card" data-id="${req._id}">
          <div class="card-header">
            <span class="status-badge ${statusClass}">${req.status}</span>
            <span class="time-ago">${new Date(req.createdAt).toLocaleDateString()}</span>
          </div>
          <h3 class="requester-name">${escapeHtml(req.userName)}</h3>
          <p class="distress-msg">"${escapeHtml(req.distressMessage)}"</p>
          <div class="contact-info">
            <strong>Contact:</strong> ${escapeHtml(req.contactNumber || 'N/A')}
          </div>
          <div class="contact-info">
            <strong>Verification:</strong> ${escapeHtml(req.verificationStatus || 'Unverified')}
          </div>
          ${distanceHtml}
          ${fallbackBadge}
          ${accuracyBadge}
          <div class="card-actions-grid mt-3">
            ${actionsHtml}
            <button class="btn btn-secondary btn-small view-map-btn w-full" data-id="${req._id}">📍 Locate on Map</button>
            ${mapLink}
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners
    document.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', (e) => updateRequestStatus(e.target.dataset.id, 'accept'));
    });
    
    document.querySelectorAll('.resolve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => updateRequestStatus(e.target.dataset.id, 'resolve'));
    });

    document.querySelectorAll('.cancel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm('Are you sure you want to cancel your SOS request? This will remove it from the map.')) {
          updateRequestStatus(e.target.dataset.id, 'cancel');
        }
      });
    });

    document.querySelectorAll('.view-map-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        focusRequestOnMap(id);
      });
    });

    document.querySelectorAll('.route-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const request = currentRequests.find(r => r._id === e.currentTarget.dataset.id);
        openRouteFromCurrentLocation(request, e.currentTarget);
      });
    });

    document.querySelectorAll('.sos-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button, a')) return;
        focusRequestOnMap(card.dataset.id);
      });
    });
  }

  function focusRequestOnMap(id, options = {}) {
    const { keepRoute = false, zoomToMarker = true } = options;
    const marker = markerRefs[id];
    const reqData = currentRequests.find(r => r._id === id);

    if (marker && reqData && reqData.latitude && reqData.longitude) {
      markersLayer.zoomToShowLayer(marker, () => {
        if (zoomToMarker) {
          map.setView([reqData.latitude, reqData.longitude], reqData.usedFallback ? 8 : 15);
        }
        marker.openPopup();
      });

      if (!keepRoute) clearActiveRoute();

      if (userLocation && !reqData.usedFallback && !keepRoute) {
        activeRouteLayer = L.polyline([
          [userLocation.lat, userLocation.lng],
          [reqData.latitude, reqData.longitude]
        ], {
          color: '#ef4444', weight: 4, dashArray: '10, 10', opacity: 0.8
        }).addTo(map);
      }

      window.scrollTo({ top: document.querySelector('.sos-map-section').offsetTop, behavior: 'smooth' });
    } else {
      alert('Precise location not provided for this request.');
    }
  }

  function updateRequestStatus(id, action) {
    fetch(`/sos/${id}/${action}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchRequests();
        }
      });
  }

  function updateMap(requests, { preserveView = false } = {}) {
    if (!map) return;
    map.removeLayer(markersLayer);
    markersLayer.clearLayers();
    markerRefs = {};
    if (accuracyLayer) accuracyLayer.clearLayers();

    const bounds = L.latLngBounds();
    let hasValidCoords = false;

    requests.forEach(req => {
      if (req.latitude && req.longitude) {
        hasValidCoords = true;
        const latLng = [req.latitude, req.longitude];
        
        const color = req.usedFallback
          ? '#64748b'
          : (req.status === 'Resolved' ? '#10b981' : (req.status === 'In Progress' ? '#f59e0b' : '#ef4444'));
        
        const markerHtml = `
          <div class="custom-marker" style="background-color: ${color}; border: 2px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker(latLng, { icon });
        const locationAge = req.locationCapturedAt
          ? `${new Date(req.locationCapturedAt).toLocaleString()}`
          : 'Unknown';

        marker.bindPopup(`
          <strong>${escapeHtml(req.userName)}</strong><br>
          Message: ${escapeHtml(req.distressMessage)}<br>
          Time: ${escapeHtml(new Date(req.createdAt).toLocaleString())}<br>
          Location updated: ${escapeHtml(locationAge)}<br>
          Status: ${escapeHtml(req.status)}<br>
          ${req.usedFallback ? 'Approximate state location' : escapeHtml(req.locationSource === 'gps' ? `GPS location${req.locationAccuracy ? ` ~${Math.round(req.locationAccuracy)}m` : ''}` : 'Shared location')}
        `);
        
        markersLayer.addLayer(marker);
        markerRefs[req._id] = marker;
        bounds.extend(latLng);

        if (!req.usedFallback && req.locationSource === 'gps' && Number(req.locationAccuracy) > 0 && accuracyLayer) {
          const circle = L.circle(latLng, {
            radius: Number(req.locationAccuracy),
            color: 'rgba(239, 68, 68, 0.65)',
            fillColor: 'rgba(239, 68, 68, 0.12)',
            weight: 2
          });
          circle.addTo(accuracyLayer);
        }
      }
    });

    map.addLayer(markersLayer);

    if (hasValidCoords && !preserveView) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }

  statusFilter.addEventListener('change', fetchRequests);
  refreshBtn.addEventListener('click', () => fetchRequests());

  if (enableNotificationsBtn && 'Notification' in window) {
    enableNotificationsBtn.addEventListener('click', () => {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          setLiveStatus('Notifications enabled for nearby SOS.', 'success');
          enableNotificationsBtn.textContent = 'Notifications Enabled';
          enableNotificationsBtn.disabled = true;
        } else {
          setLiveStatus('Notifications blocked. You can still refresh/poll nearby SOS.', 'warning');
        }
      });
    });
  } else if (enableNotificationsBtn) {
    enableNotificationsBtn.disabled = true;
    enableNotificationsBtn.textContent = 'Notifications Unavailable';
  }

  window.addEventListener('online', () => {
    setLiveStatus('Back online. Refreshing SOS requests...', 'success');
    fetchRequests({ notify: true });
  });

  window.addEventListener('offline', () => {
    setLiveStatus('Offline. Map tiles and live SOS updates may not load.', 'error');
  });

  // Init
  initMap();
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      
      addOrUpdateUserMarker(userLocation);

      fetchRequests(); // Refetch to calculate and show distances
    }, err => {
      console.warn('Location for distance not available.', err);
    }, { timeout: 10000, enableHighAccuracy: true });
  }

  fetchRequests();
  connectLiveStream();
  livePollTimer = setInterval(() => {
    if (!document.hidden && navigator.onLine) {
      fetchRequests({ notify: true, silent: true });
    }
  }, 30000);
});
