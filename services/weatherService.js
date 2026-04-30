const stateCoordinates = require('../config/stateCoordinates');

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const weatherCache = new Map();

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

const getWeatherStatus = ({ temperature, feelsLike, windSpeed, windGust, precipitation, weatherCode }) => {
  const heatIndex = Number.isFinite(feelsLike) ? feelsLike : temperature;
  if (heatIndex >= 42 || temperature >= 40) return 'Extreme Heat';
  if (windGust >= 60 || windSpeed >= 50) return 'High Winds';
  if (precipitation >= 20) return 'Heavy Rain';
  if ([65, 80, 81, 82, 95, 96, 99].includes(weatherCode)) return 'Severe Weather';
  if ([51, 53, 55, 61, 63].includes(weatherCode)) return 'Rain Alert';
  return 'Normal';
};

const buildFallbackWeather = (state, reason = 'Weather temporarily unavailable') => {
  const cached = weatherCache.get(state);
  if (cached?.data) {
    return {
      ...cached.data,
      isCached: true,
      sourceLabel: 'Cached weather',
      note: 'Live weather temporarily unavailable. Showing last successful update.'
    };
  }

  return {
    temp: '--',
    desc: reason,
    icon: '🌤️',
    status: 'Unavailable',
    windSpeed: '--',
    humidity: '--',
    feelsLike: '--',
    updatedAt: new Date().toISOString(),
    isUnavailable: true,
    sourceLabel: 'Weather service'
  };
};

exports.getWeatherData = async (state) => {
  const coords = stateCoordinates[state];
  if (!coords) return null;

  const cached = weatherCache.get(state);
  if (cached && Date.now() - cached.savedAt < WEATHER_CACHE_TTL_MS) {
    return {
      ...cached.data,
      isCached: true,
      sourceLabel: 'Cached weather'
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', coords.latitude);
    url.searchParams.set('longitude', coords.longitude);
    url.searchParams.set('current', [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'rain',
      'weather_code',
      'wind_speed_10m',
      'wind_gusts_10m'
    ].join(','));
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '1');

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data = await response.json();
    const current = data.current || {};
    const temperature = Number(current.temperature_2m);
    const feelsLike = Number(current.apparent_temperature);
    const humidity = Number(current.relative_humidity_2m);
    const precipitation = Number(current.precipitation ?? current.rain ?? 0);
    const weatherCode = Number(current.weather_code);
    const windSpeed = Number(current.wind_speed_10m);
    const windGust = Number(current.wind_gusts_10m || windSpeed);
    const codeInfo = weatherCodes[weatherCode] || { desc: 'Current Weather', icon: '🌤️' };

    if (!Number.isFinite(temperature) || !Number.isFinite(windSpeed)) {
      throw new Error('Weather API returned incomplete current data');
    }

    const weather = {
      temp: Math.round(temperature),
      feelsLike: Number.isFinite(feelsLike) ? Math.round(feelsLike) : Math.round(temperature),
      desc: codeInfo.desc,
      icon: codeInfo.icon,
      status: getWeatherStatus({ temperature, feelsLike, windSpeed, windGust, precipitation, weatherCode }),
      windSpeed: `${Math.round(windSpeed)} km/h`,
      humidity: Number.isFinite(humidity) ? `${Math.round(humidity)}%` : '--',
      precipitation: `${Math.round(precipitation)} mm`,
      updatedAt: current.time || new Date().toISOString(),
      sourceLabel: 'Live weather'
    };

    weatherCache.set(state, {
      savedAt: Date.now(),
      data: weather
    });

    return weather;
  } catch (error) {
    console.error('Weather fetch error:', error.message);
    return buildFallbackWeather(state, error.name === 'AbortError' ? 'Weather request timed out' : 'Weather temporarily unavailable');
  } finally {
    clearTimeout(timeout);
  }
};
