/**
 * Volunteer Dashboard Frontend Logic
 */

let map;
let markers = {};
let currentPath = null;
let userMarker = null;
let selectedRequestId = null;

const initVolunteerDashboard = async () => {
  initMap();
  await loadRequests();
  setupEventListeners();
  
  // Update location periodically
  startLocationTracking();

  // Auto-refresh SOS list every 60 seconds
  setInterval(loadRequests, 60000);
};

const initMap = () => {
  map = L.map('volunteerMap', {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([20.5937, 78.9629], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);
};

let lastPendingCount = 0;

const loadRequests = async () => {
  const status = document.getElementById('statusFilter').value;
  const sortBy = document.getElementById('sortControl').value;
  
  try {
    const response = await fetch(`/volunteer/sos?status=${status}&sortBy=${sortBy}`);
    const data = await response.json();
    
    if (data.success) {
      const pendingRequests = data.requests.filter(r => r.status === 'Pending');
      
      // If new SOS arrived since last load, notify volunteer
      if (pendingRequests.length > lastPendingCount) {
        showToast(`🚨 ALERT: ${pendingRequests.length - lastPendingCount} new SOS request(s) nearby!`, 'high');
        // Optional: play alert sound
      }
      lastPendingCount = pendingRequests.length;

      renderRequestCards(data.requests);
      updateMarkers(data.requests);
      updateStats(data.requests);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
};

const renderRequestCards = (requests) => {
  const container = document.getElementById('sosList');
  if (requests.length === 0) {
    container.innerHTML = '<div class="empty-state">No requests found.</div>';
    return;
  }

  container.innerHTML = requests.map(req => `
    <div class="sos-card ${selectedRequestId === req._id ? 'selected' : ''} ${req.status === 'In Progress' ? 'in-progress' : ''}" 
         onclick="selectRequest('${req._id}', ${req.latitude}, ${req.longitude})"
         id="card-${req._id}">
      <span class="urgency-tag ${req.urgency.toLowerCase()}">${req.urgency}</span>
      <div class="card-header">
        <strong>${req.userName}</strong>
        <span class="time-ago">${formatTimeAgo(req.createdAt)}</span>
      </div>
      <p class="msg-preview">${req.distressMessage.substring(0, 60)}${req.distressMessage.length > 60 ? '...' : ''}</p>
      <div class="card-footer">
        <span class="status-dot ${req.status.toLowerCase().replace(' ', '-')}"></span>
        <span class="status-text">${req.status}</span>
        <span class="distance-text">${calculateDistance(req.latitude, req.longitude)}</span>
      </div>
    </div>
  `).join('');
};

const updateMarkers = (requests) => {
  // Clear old markers
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};

  const sosIcon = L.divIcon({
    className: 'custom-sos-marker',
    html: '<div style="background: #ef4444; width: 16px; height: 16px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);"></div>',
    iconSize: [16, 16]
  });

  requests.forEach(req => {
    if (req.latitude && req.longitude) {
      const m = L.marker([req.latitude, req.longitude], { icon: sosIcon })
        .addTo(map)
        .bindPopup(`<strong>${req.userName}</strong><br>${req.status}`);
      
      markers[req._id] = m;
      
      m.on('click', () => {
        selectRequest(req._id, req.latitude, req.longitude);
      });
    }
  });
};

const selectRequest = async (id, lat, lng) => {
  selectedRequestId = id;
  
  // Highlight card
  document.querySelectorAll('.sos-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById(`card-${id}`);
  if (card) card.classList.add('selected');

  // Center Map
  if (lat && lng) {
    map.flyTo([lat, lng], 14);
    if (markers[id]) markers[id].openPopup();
  }

  // Load Details
  await loadDetails(id);
};

const loadDetails = async (id) => {
  try {
    const response = await fetch(`/volunteer/sos/${id}`);
    const data = await response.json();
    
    if (data.success) {
      const req = data.request;
      const panel = document.getElementById('detailPanel');
      const content = document.getElementById('detailContent');
      
      content.innerHTML = `
        <h2 style="margin-bottom: 20px;">Request Details</h2>
        <div class="detail-row"><span>User:</span> <strong>${req.userName}</strong></div>
        <div class="detail-row"><span>Status:</span> <span class="badge ${req.status.toLowerCase().replace(' ', '-')}">${req.status}</span></div>
        <div class="detail-row"><span>Urgency:</span> <span class="urgency-tag ${req.urgency.toLowerCase()}">${req.urgency}</span></div>
        <div class="detail-row"><span>Time:</span> ${new Date(req.createdAt).toLocaleString()}</div>
        <div class="detail-row"><span>Location:</span> ${req.state}</div>
        <div class="detail-row"><span>Coordinates:</span> ${req.latitude ? `${req.latitude}, ${req.longitude}` : 'No GPS'}</div>
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
        <h3>Distress Message</h3>
        <p style="background: #f1f5f9; padding: 15px; border-radius: 10px; margin-top: 10px;">${req.distressMessage}</p>
        
        <div class="panel-actions" style="margin-top: 30px; display: flex; flex-direction: column; gap: 10px;">
          ${req.status === 'Pending' ? `
            <button onclick="handleAction('${req._id}', 'accept')" class="btn btn-primary">Accept Request</button>
          ` : ''}
          ${req.status === 'In Progress' ? `
            <button onclick="handleAction('${req._id}', 'resolve')" class="btn btn-success">Mark Resolved</button>
          ` : ''}
          ${req.latitude ? `
            <a href="https://www.google.com/maps/dir/?api=1&destination=${req.latitude},${req.longitude}" target="_blank" class="btn btn-secondary">🧭 Get Route</a>
          ` : ''}
        </div>
      `;
      
      panel.classList.add('is-visible');
    }
  } catch (err) {
    console.error('Error loading details:', err);
  }
};

const handleAction = async (id, action) => {
  try {
    const response = await fetch(`/volunteer/requests/${id}/${action}`, { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      await loadRequests();
      await loadDetails(id);
    }
  } catch (err) {
    console.error(`Action ${action} failed:`, err);
  }
};

const setupEventListeners = () => {
  document.getElementById('statusFilter').addEventListener('change', loadRequests);
  document.getElementById('sortControl').addEventListener('change', loadRequests);
  document.getElementById('closeDetailPanel').addEventListener('click', () => {
    document.getElementById('detailPanel').classList.remove('is-visible');
  });

  document.getElementById('toggleAvailabilityBtn').addEventListener('click', async () => {
    try {
      const res = await fetch('/volunteer/availability', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const btn = document.getElementById('toggleAvailabilityBtn');
        btn.textContent = data.isAvailable ? 'Available' : 'On Break';
        btn.className = `btn btn-small ${data.isAvailable ? 'btn-primary' : 'btn-secondary'}`;
      }
    } catch (err) {
      console.error('Availability toggle failed:', err);
    }
  });

  // Tour Logic
  const tourSteps = [
    {
      title: "Monitor Local Requests",
      text: "The sidebar on the left shows all SOS requests in your state. You can sort them by Urgency or Distance to prioritize your response.",
      icon: "📋"
    },
    {
      title: "View Exact Location",
      text: "Click any request to see the user's message and location on the map. The map uses live GPS coordinates when available.",
      icon: "📍"
    },
    {
      title: "Accept & Respond",
      text: "Open the details panel and click 'Accept Request' to let the victim know help is coming. You can then use the 'Get Route' button for directions.",
      icon: "🤝"
    },
    {
      title: "Stay Available",
      text: "Keep your status as 'Available' to receive new alerts. The dashboard refreshes every minute to keep you updated.",
      icon: "🛡️"
    }
  ];

  let currentStep = 0;
  const tourModal = document.getElementById('tourModal');
  const nextBtn = document.getElementById('nextTourStep');
  
  const showStep = (step) => {
    const s = tourSteps[step];
    document.getElementById('tourStepContent').innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 4rem; margin-bottom: 20px;">${s.icon}</div>
        <h3 style="margin-bottom: 10px; font-size: 1.4rem;">${s.title}</h3>
        <p style="line-height: 1.6; color: #475569;">${s.text}</p>
      </div>
    `;
    document.getElementById('tourProgress').textContent = `Step ${step + 1} of ${tourSteps.length}`;
    nextBtn.textContent = step === tourSteps.length - 1 ? "Finish Training" : "Next Step";
  };

  const startTour = () => {
    currentStep = 0;
    tourModal.style.display = 'flex';
    showStep(currentStep);
  };

  nextBtn.onclick = () => {
    if (currentStep < tourSteps.length - 1) {
      currentStep++;
      showStep(currentStep);
    } else {
      tourModal.style.display = 'none';
      localStorage.setItem('hasSeenVolunteerTour', 'true');
    }
  };

  document.getElementById('skipTour').onclick = () => {
    tourModal.style.display = 'none';
    localStorage.setItem('hasSeenVolunteerTour', 'true');
  };

  document.getElementById('showHelpBtn').onclick = startTour;

  // Auto-start for first-timers
  if (!localStorage.getItem('hasSeenVolunteerTour')) {
    setTimeout(startTour, 1000);
  }
};

const startLocationTracking = () => {
  if (!navigator.geolocation) return;

  const vIcon = L.divIcon({
    className: 'v-marker',
    html: '<div style="background: #2563eb; width: 20px; height: 20px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(37, 99, 235, 0.6);"></div>',
    iconSize: [20, 20]
  });

  navigator.geolocation.watchPosition((pos) => {
    const { latitude, longitude } = pos.coords;
    window.currentVolunteerLoc = { lat: latitude, lng: longitude };
    
    if (userMarker) {
      userMarker.setLatLng([latitude, longitude]);
    } else {
      userMarker = L.marker([latitude, longitude], { icon: vIcon }).addTo(map).bindPopup('You are here');
    }
  }, (err) => console.warn(err), { enableHighAccuracy: true });
};

// Utils
const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "just now";
};

const calculateDistance = (lat, lng) => {
  if (!window.currentVolunteerLoc || !lat || !lng) return "";
  const R = 6371;
  const dLat = (lat - window.currentVolunteerLoc.lat) * Math.PI / 180;
  const dLon = (lng - window.currentVolunteerLoc.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(window.currentVolunteerLoc.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  
  if (d < 0.05) return "Target at your location"; // Less than 50m
  return d.toFixed(1) + " km";
};

const updateStats = (requests) => {
  document.getElementById('nearbyCount').textContent = requests.filter(r => r.status === 'Pending').length;
  document.getElementById('activeCount').textContent = requests.filter(r => r.status === 'In Progress').length;
  document.getElementById('resolvedCount').textContent = requests.filter(r => r.status === 'Resolved').length;
};

document.addEventListener('DOMContentLoaded', initVolunteerDashboard);
