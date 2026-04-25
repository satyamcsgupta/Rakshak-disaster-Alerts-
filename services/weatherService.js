exports.getWeatherData = async (state) => {
  const stateCoordinates = require('../config/stateCoordinates');
  const coords = stateCoordinates[state];
  
  if (!coords) return null;

  const apiKey = process.env.WEATHER_API_KEY;
  
  if (!apiKey) {
    return {
      temp: 28,
      desc: 'Partly Cloudy',
      icon: '🌤️',
      status: 'Normal',
      windSpeed: '12 km/h'
    };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&units=metric&appid=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API error');
    
    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      desc: data.weather[0].main,
      icon: getWeatherIcon(data.weather[0].icon),
      status: data.main.temp > 40 ? 'Extreme Heat' : (data.wind.speed > 20 ? 'High Winds' : 'Normal'),
      windSpeed: `${Math.round(data.wind.speed * 3.6)} km/h`
    };
  } catch (error) {
    console.error('Weather fetch error:', error.message);
    return null;
  }
};

const getWeatherIcon = (code) => {
  const map = {
    '01': '☀️', '02': '⛅', '03': '☁️', '04': '☁️',
    '09': '🌧️', '10': '🌦️', '11': '⛈️', '13': '❄️', '50': '🌫️'
  };
  return map[code.substring(0, 2)] || '🌤️';
};
