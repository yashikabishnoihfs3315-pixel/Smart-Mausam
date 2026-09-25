// ==========================================================================
// COMPACT WEATHER TRACKER LOGIC
// ==========================================================================

const CONFIG = {
  DEFAULT_CITY: "Bhopal",
  GEOCODING_API: "https://geocoding-api.open-meteo.com/v1/search",
  WEATHER_API: "https://api.open-meteo.com/v1/forecast"
};

const state = {
  currentCity: "",
  country: "",
  lat: null,
  lon: null,
  unit: localStorage.getItem("weather_unit")  "C",
  theme: localStorage.getItem("weather_theme")  "light",
  favorites: JSON.parse(localStorage.getItem("weather_favorites")) || ["Bhopal", "Delhi", "London"]
};

const DOM = {
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  locationBtn: document.getElementById("location-btn"),
  themeToggle: document.getElementById("theme-toggle"),
  themeIcon: document.getElementById("theme-icon"),
  unitToggle: document.getElementById("unit-toggle"),
  unitLabel: document.getElementById("unit-label"),
  statusMsg: document.getElementById("status-message"),
  favList: document.getElementById("fav-list"),
  favBtn: document.getElementById("fav-btn"),
  favIcon: document.getElementById("fav-icon"),
  
  cityName: document.getElementById("city-name"),
  countryCode: document.getElementById("country-code"),
  localTime: document.getElementById("local-time"),
  weatherCondition: document.getElementById("weather-condition"),
  currentTemp: document.getElementById("current-temp"),
  heroWeatherIcon: document.getElementById("hero-weather-icon"),
  feelsLike: document.getElementById("feels-like"),
  lastUpdated: document.getElementById("last-updated"),
  
  valHumidity: document.getElementById("val-humidity"),
  valWind: document.getElementById("val-wind"),
  valPressure: document.getElementById("val-pressure"),
  valVisibility: document.getElementById("val-visibility"),
  valUv: document.getElementById("val-uv"),
  valPrecip: document.getElementById("val-precip"),
  valSunrise: document.getElementById("val-sunrise"),
  valSunset: document.getElementById("val-sunset"),
  
  hourlyContainer: document.getElementById("hourly-container"),
  dailyContainer: document.getElementById("daily-container")
};

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initUnit();
  renderFavorites();
  
  getCityCoordinates(CONFIG.DEFAULT_CITY);

  DOM.searchForm.addEventListener("submit", handleSearch);
  DOM.locationBtn.addEventListener("click", handleGeolocation);
  DOM.themeToggle.addEventListener("click", toggleTheme);
  DOM.unitToggle.addEventListener("click", toggleUnit);
  DOM.favBtn.addEventListener("click", toggleFavoriteCurrentCity);
});

// GEOCODING & API
async function getCityCoordinates(cityName) {
  try {
    showStatus("Fetching city position...", "info");
    const response = await fetch(${CONFIG.GEOCODING_API}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      showStatus(City "${cityName}" not found!, "error");
      return;
    }

    const result = data.results[0];
    state.currentCity = result.name;
    state.country = result.country_code  result.country  "";
    state.lat = result.latitude;
    state.lon = result.longitude;

    hideStatus();
    fetchWeatherData(state.lat, state.lon);
  } catch (error) {
    showStatus("Network error while searching city.", "error");
  }
}

async function fetchWeatherData(lat, lon) {
  try {
    showStatus("Loading weather...", "info");
    const url = ${CONFIG.WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto;

    const response = await fetch(url);
    if (!response.ok) throw new Error("API Failed");
    
    const data = await response.json();
    hideStatus()
    ;
    renderDashboard(data);
  } catch (error) {
    showStatus("Failed to load weather data.", "error");
  }
}

// RENDER DASHBOARD
function renderDashboard(data) {
  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;
  const weatherInfo = mapWmoCodeToCondition(current.weather_code);

  DOM.cityName.textContent = state.currentCity;
  DOM.countryCode.textContent = state.country.toUpperCase();
  DOM.weatherCondition.textContent = weatherInfo.label;
  DOM.heroWeatherIcon.className = ${weatherInfo.icon} weather-hero-icon;

  const temp = convertTemp(current.temperature_2m);
  const feels = convertTemp(current.apparent_temperature);
  DOM.currentTemp.textContent = Math.round(temp);
  DOM.feelsLike.textContent = ${Math.round(feels)}°${state.unit};

  const now = new Date();
  DOM.localTime.textContent = now.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  DOM.lastUpdated.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  DOM.valHumidity.textContent = ${current.relative_humidity_2m}%;
  DOM.valWind.textContent = ${Math.round(current.wind_speed_10m)} km/h;
  DOM.valPressure.textContent = ${Math.round(current.surface_pressure)} hPa;
  DOM.valVisibility.textContent = 10 km;
  DOM.valUv.textContent = daily.uv_index_max ? daily.uv_index_max[0] : "N/A";
  DOM.valPrecip.textContent = ${current.precipitation} mm;

  if (daily.sunrise && daily.sunset) {
    DOM.valSunrise.textContent = formatTime(daily.sunrise[0]);
    DOM.valSunset.textContent = formatTime(daily.sunset[0]);
  }

  updateFavStarIcon();
  renderHourlyForecast(hourly);
  renderDailyForecast(daily);
}

function renderHourlyForecast(hourly) {
  DOM.hourlyContainer.innerHTML = "";
  const currentHour = new Date().getHours();

  for (let i = currentHour; i < currentHour + 10; i++) {
    if (!hourly.time[i]) break;

    const timeStr = formatTime(hourly.time[i]);
    const temp = Math.round(convertTemp(hourly.temperature_2m[i]));
    const iconClass = mapWmoCodeToCondition(hourly.weather_code[i]).icon;

    const item = document.createElement("div");
    item.className = "hourly-item";
    item.innerHTML = 
      <span class="time">${i === currentHour ? 'Now' : timeStr}</span>
      <i class="${iconClass}"></i>
      <span class="temp">${temp}°${state.unit}</span>
    ;
    DOM.hourlyContainer.appendChild(item);
  }
}

function renderDailyForecast(daily) {
  DOM.dailyContainer.innerHTML = "";

  for (let i = 0; i < daily.time.length; i++) {
    const dateObj = new Date(daily.time[i]);
    const dayName = i === 0 ? "Today" : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const maxTemp = Math.round(convertTemp(daily.temperature_2m_max[i]));
    const minTemp = Math.round(convertTemp(daily.temperature_2m_min[i]));
    const iconClass = mapWmoCodeToCondition(daily.weather_code[i]).icon;

    const row = document.createElement("div");
    row.className = "daily-row";
    row.innerHTML = 
      <span class="day-name">${dayName}</span>
      <span class="day-date">${dateStr}</span>
      <i class="${iconClass}"></i>
      <span class="temp-range">${maxTemp}° <span class="min-temp">/ ${minTemp}°</span></span>
    ;
    DOM.dailyContainer.appendChild(row);
  }
}

// UTILS
function mapWmoCodeToCondition(code) {
  const map = {
    0: { label: "Clear Sky", icon: "ri-sun-line" },
    1: { label: "Mainly Clear", icon: "ri-sun-cloudy-line" },
    2: { label: "Partly Cloudy", icon: "ri-cloudy-line" },
    3: { label: "Overcast", icon: "ri-cloudy-2-line" },
    45: { label: "Foggy", icon: "ri-mist-line" },
    51: { label: "Drizzle", icon: "ri-drizzle-line" },
    61: { label: "Slight Rain", icon: "ri-rainy-line" },
    63: { label: "Rain", icon: "ri-heavy-showers-line" },
    71: { label: "Snow", icon: "ri-snowy-line" },
    95: { label: "Thunderstorm", icon: "ri-thunderstorms-line" }
  };
  return map[code] || { label: "Cloudy", icon: "ri-cloud-line" };
}

function con
vertTemp(celsius) {
  return state.unit === "F" ? (celsius * 9/5) + 32 : celsius;
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showStatus(text, type) {
  DOM.statusMsg.textContent = text;
  DOM.statusMsg.className = status-message ${type};
}

function hideStatus() {
  DOM.statusMsg.className = "status-message hidden";
}

// EVENT HANDLERS
function handleSearch(e) {
  e.preventDefault();
  const query = DOM.searchInput.value.trim();
  if (query) {
    getCityCoordinates(query);
    DOM.searchInput.value = "";
  }
}

function handleGeolocation() {
  if (!navigator.geolocation) {
    showStatus("Geolocation not supported.", "error");
    return;
  }
  showStatus("Detecting GPS position...", "info");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.lat = pos.coords.latitude;
      state.lon = pos.coords.longitude;
      state.currentCity = "My Location";
      state.country = "GPS";
      hideStatus();
      fetchWeatherData(state.lat, state.lon);
    },
    () => showStatus("Location access denied.", "error")
  );
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  document.body.setAttribute("data-theme", state.theme);
  DOM.themeIcon.className = state.theme === "light" ? "ri-moon-line" : "ri-sun-line";
  localStorage.setItem("weather_theme", state.theme);
}

function initTheme() {
  document.body.setAttribute("data-theme", state.theme);
  DOM.themeIcon.className = state.theme === "light" ? "ri-moon-line" : "ri-sun-line";
}

function toggleUnit() {
  state.unit = state.unit === "C" ? "F" : "C";
  DOM.unitLabel.textContent = °${state.unit};
  localStorage.setItem("weather_unit", state.unit);
  if (state.lat && state.lon) fetchWeatherData(state.lat, state.lon);
}

function initUnit() {
  DOM.unitLabel.textContent = °${state.unit};
}

function toggleFavoriteCurrentCity() {
  const city = state.currentCity;
  if (!city || city === "My Location") return;

  const index = state.favorites.indexOf(city);
  if (index > -1) state.favorites.splice(index, 1);
  else state.favorites.push(city);

  localStorage.setItem("weather_favorites", JSON.stringify(state.favorites));
  updateFavStarIcon();
  renderFavorites();
}

function updateFavStarIcon() {
  const isFav = state.favorites.includes(state.currentCity);
  DOM.favIcon.className = isFav ? "ri-star-fill" : "ri-star-line";
}

function renderFavorites() {
  DOM.favList.innerHTML = "";
  state.favorites.forEach((city) => {
    const chip = document.createElement("div");
    chip.className = "fav-chip";
    chip.innerHTML = <span>${city}</span><i class="ri-close-line remove-fav"></i>;
    chip.querySelector("span").addEventListener("click", () => getCityCoordinates(city));
    chip.querySelector(".remove-fav").addEventListener("click", (e) => {
      e.stopPropagation();
      state.favorites = state.favorites.filter((c) => c !== city);
      localStorage.setItem("weather_favorites", JSON.stringify(state.favorites));
      renderFavorites();
      updateFavStarIcon();
    });
    DOM.favList.appendChild(chip);
  });
}
