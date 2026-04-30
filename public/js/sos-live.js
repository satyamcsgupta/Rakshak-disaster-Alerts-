(() => {
  const sosId = window.RAKSHAK_SOS_ID;
  if (!sosId) return;

  const startBtn = document.getElementById('startLiveLocationBtn');
  const stopBtn = document.getElementById('stopLiveLocationBtn');
  const statusEl = document.getElementById('liveLocationStatus');

  let watchId = null;
  let lastSentAt = 0;
  let lastSentCoords = null;

  const setStatus = (message, type = 'info') => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.type = type;
  };

  const distanceMeters = (a, b) => {
    if (!a || !b) return Infinity;
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };

  const sendLocation = async ({ latitude, longitude, accuracy }) => {
    const now = Date.now();
    const movedMeters = lastSentCoords ? distanceMeters(lastSentCoords, { latitude, longitude }) : Infinity;
    const shouldSend = (now - lastSentAt) > 12000 || movedMeters >= 12;
    if (!shouldSend) return;

    lastSentAt = now;
    lastSentCoords = { latitude, longitude };

    setStatus(`Sharing live location... accuracy ~${Math.round(Number(accuracy || 0))}m`, 'success');

    const response = await fetch(`/sos/${encodeURIComponent(sosId)}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ latitude, longitude, accuracy })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      const message = data?.message || 'Could not update live location.';
      throw new Error(message);
    }
  };

  const start = () => {
    if (!navigator.geolocation) {
      setStatus('This browser does not support GPS location.', 'error');
      return;
    }

    if (watchId !== null) return;

    setStatus('Starting live GPS tracking. Keep Location/GPS ON...', 'info');
    startBtn && (startBtn.disabled = true);
    stopBtn && (stopBtn.disabled = false);

    watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await sendLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        } catch (error) {
          console.warn('Live SOS location update failed:', error);
          setStatus(error.message || 'Live location update failed.', 'warning');
        }
      },
      (error) => {
        setStatus(error.message || 'GPS permission denied or unavailable.', 'error');
        stop();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      }
    );
  };

  const stop = () => {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
    watchId = null;
    startBtn && (startBtn.disabled = false);
    stopBtn && (stopBtn.disabled = true);
    setStatus('Live location is off.', 'info');
  };

  startBtn?.addEventListener('click', start);
  stopBtn?.addEventListener('click', stop);
})();

