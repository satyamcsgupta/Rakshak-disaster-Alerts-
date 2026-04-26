const stateCoordinates = require('../config/stateCoordinates');

const weatherCodes = {
  0: { desc: 'Clear Sky', icon: '☀️' },
  1: { desc: 'Mainly Clear', icon: '🌤️' },
  2: { desc: 'Partly Cloudy', icon: '⛅' },
  3: { desc: 'Overcast', icon: '☁️' },
  45: { desc: 'Fog', icon: '🌫️' },
  48: { desc: 'Depositing Rime Fog', icon: '🌫️' },
  51: { desc: 'Light Drizzle', icon: '🌦️' },
  53: { desc: 'Moderate Drizzle', icon: '🌦️' },
  55: { desc: 'Dense Drizzle', icon: '🌧️' },
  61: { desc: 'Slight Rain', icon: '🌧️' },
  63: { desc: 'Moderate Rain', icon: '🌧️' },
  65: { desc: 'Heavy Rain', icon: '🌧️' },
  71: { desc: 'Slight Snow', icon: '❄️' },
  73: { desc: 'Moderate Snow', icon: '❄️' },
  75: { desc: 'Heavy Snow', icon: '❄️' },
  80: { desc: 'Rain Showers', icon: '🌦️' },
  81: { desc: 'Heavy Showers', icon: '🌧️' },
  82: { desc: 'Violent Showers', icon: '🌧️' },
  95: { desc: 'Thunderstorm', icon: '⛈️' },
  96: { desc: 'Thunderstorm With Hail', icon: '⛈️' },
  99: { desc: 'Severe Thunderstorm With Hail', icon: '⛈️' }
};

const getWeatherStatus = ({ temperature, windSpeed, weatherCode }) => {
  if (temperature >= 40) return 'Extreme Heat';
  if (windSpeed >= 50) return 'High Winds';
  if ([65, 80, 81, 82, 95, 96, 99].includes(weatherCode)) return 'Severe Weather';
  if ([51, 53, 55, 61, 63].includes(weatherCode)) return 'Rain Alert';
  return 'Normal';
};

exports.getWeatherData = async (state) => {
  const coords = stateCoordinates[state];
  if (!coords) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', coords.latitude);
    url.searchParams.set('longitude', coords.longitude);
    url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data = await response.json();
    const current = data.current || {};
    const temperature = Number(current.temperature_2m);
    const weatherCode = Number(current.weather_code);
    const windSpeed = Number(current.wind_speed_10m);
    const codeInfo = weatherCodes[weatherCode] || { desc: 'Current Weather', icon: '🌤️' };

    if (!Number.isFinite(temperature) || !Number.isFinite(windSpeed)) {
      throw new Error('Weather API returned incomplete current data');
    }

    return {
      temp: Math.round(temperature),
      desc: codeInfo.desc,
      icon: codeInfo.icon,
      status: getWeatherStatus({ temperature, windSpeed, weatherCode }),
      windSpeed: `${Math.round(windSpeed)} km/h`,
      updatedAt: current.time || null
    };
  } catch (error) {
    console.error('Weather fetch error:', error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
