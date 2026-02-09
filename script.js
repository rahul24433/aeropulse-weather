const DEFAULT_CITY = "Bettiah";
const HOURLY_WINDOW = 12;
const DAILY_WINDOW = 14;
const RECENT_CITY_LIMIT = 6;
const AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const STORAGE_KEYS = {
  unit: "aeropulse_unit",
  recentCities: "aeropulse_recent_cities",
  lastLocation: "aeropulse_last_location",
};

const WIND_DIRECTIONS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

const WEATHER_DETAILS = {
  0: { label: "Clear sky", icon: "CLEAR", tone: "clear" },
  1: { label: "Mainly clear", icon: "CLEAR", tone: "clear" },
  2: { label: "Partly cloudy", icon: "CLOUD", tone: "clouds" },
  3: { label: "Overcast", icon: "CLOUD", tone: "clouds" },
  45: { label: "Fog", icon: "FOG", tone: "clouds" },
  48: { label: "Freezing fog", icon: "FOG", tone: "clouds" },
  51: { label: "Light drizzle", icon: "RAIN", tone: "rain" },
  53: { label: "Drizzle", icon: "RAIN", tone: "rain" },
  55: { label: "Dense drizzle", icon: "RAIN", tone: "rain" },
  56: { label: "Freezing drizzle", icon: "RAIN", tone: "rain" },
  57: { label: "Dense freezing drizzle", icon: "RAIN", tone: "rain" },
  61: { label: "Slight rain", icon: "RAIN", tone: "rain" },
  63: { label: "Rain", icon: "RAIN", tone: "rain" },
  65: { label: "Heavy rain", icon: "RAIN", tone: "rain" },
  66: { label: "Freezing rain", icon: "RAIN", tone: "rain" },
  67: { label: "Heavy freezing rain", icon: "RAIN", tone: "rain" },
  71: { label: "Slight snow", icon: "SNOW", tone: "snow" },
  73: { label: "Snow", icon: "SNOW", tone: "snow" },
  75: { label: "Heavy snow", icon: "SNOW", tone: "snow" },
  77: { label: "Snow grains", icon: "SNOW", tone: "snow" },
  80: { label: "Rain showers", icon: "RAIN", tone: "rain" },
  81: { label: "Rain showers", icon: "RAIN", tone: "rain" },
  82: { label: "Violent showers", icon: "RAIN", tone: "storm" },
  85: { label: "Snow showers", icon: "SNOW", tone: "snow" },
  86: { label: "Heavy snow showers", icon: "SNOW", tone: "snow" },
  95: { label: "Thunderstorm", icon: "STORM", tone: "storm" },
  96: { label: "Thunderstorm and hail", icon: "STORM", tone: "storm" },
  99: { label: "Severe thunderstorm", icon: "STORM", tone: "storm" },
};

const refs = {
  searchForm: document.getElementById("search-form"),
  cityInput: document.getElementById("city-input"),
  searchButton: document.getElementById("search-btn"),
  locationButton: document.getElementById("location-btn"),
  refreshButton: document.getElementById("refresh-btn"),
  recentCities: document.getElementById("recent-cities"),
  unitButtons: Array.from(document.querySelectorAll("[data-unit-toggle]")),
  connectionPill: document.getElementById("connection-pill"),
  updatedAt: document.getElementById("updated-at"),
  locationName: document.getElementById("location-name"),
  weatherSummary: document.getElementById("weather-summary"),
  weatherIcon: document.getElementById("weather-icon"),
  temperature: document.getElementById("temperature"),
  temperatureUnit: document.getElementById("temperature-unit"),
  feelsLike: document.getElementById("feels-like"),
  sunrise: document.getElementById("sunrise"),
  sunset: document.getElementById("sunset"),
  humidity: document.getElementById("humidity"),
  pressure: document.getElementById("pressure"),
  visibility: document.getElementById("visibility"),
  precipitation: document.getElementById("precipitation"),
  cloudCover: document.getElementById("cloud-cover"),
  uvIndex: document.getElementById("uv-index"),
  windCategory: document.getElementById("wind-category"),
  windSpeed: document.getElementById("wind-speed"),
  windDirection: document.getElementById("wind-direction"),
  windGust: document.getElementById("wind-gust"),
  windPointer: document.getElementById("wind-pointer"),
  hourlyStrip: document.getElementById("hourly-strip"),
  dailyGrid: document.getElementById("daily-grid"),
  aqiBadge: document.getElementById("aqi-badge"),
  aqiEu: document.getElementById("aqi-eu"),
  aqiUs: document.getElementById("aqi-us"),
  pm25: document.getElementById("pm25"),
  pm10: document.getElementById("pm10"),
  ozone: document.getElementById("ozone"),
  co: document.getElementById("co"),
};

const appState = {
  unit: "C",
  payload: null,
  airPayload: null,
  locationLabel: "",
  timezoneTag: "local",
  lastCoords: null,
  recentCities: [],
  activeRequestId: 0,
  isBusy: false,
  autoRefreshTimer: null,
};

function readStoredJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (!value) {
      return fallback;
    }
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors in private browsing modes.
  }
}

function normalizeCityText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ");
}

function setStatus(state, text) {
  refs.connectionPill.dataset.state = state;
  refs.connectionPill.textContent = text;
}

function setBusyState(isBusy) {
  appState.isBusy = isBusy;
  document.body.dataset.busy = isBusy ? "true" : "false";
  refs.cityInput.disabled = isBusy;
  refs.searchButton.disabled = isBusy;
  refs.locationButton.disabled = isBusy;
  refs.refreshButton.disabled = isBusy || !appState.lastCoords;
  refs.unitButtons.forEach((button) => {
    button.disabled = isBusy;
  });
  refs.recentCities.querySelectorAll(".chip-btn").forEach((button) => {
    button.disabled = isBusy;
  });
}

function tempUnitLabel() {
  return appState.unit === "F" ? "deg F" : "deg C";
}

function convertTemperature(celsiusValue) {
  if (!Number.isFinite(celsiusValue)) {
    return null;
  }
  if (appState.unit === "F") {
    return (celsiusValue * 9) / 5 + 32;
  }
  return celsiusValue;
}

function renderTemp(celsiusValue, precision = 0) {
  const converted = convertTemperature(celsiusValue);
  if (!Number.isFinite(converted)) {
    return "--";
  }
  return precision > 0 ? converted.toFixed(precision) : String(Math.round(converted));
}

function syncUnitButtons() {
  refs.unitButtons.forEach((button) => {
    const active = button.dataset.unit === appState.unit;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function toCompass(degrees) {
  if (!Number.isFinite(degrees)) {
    return "--";
  }
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return WIND_DIRECTIONS[index];
}

function describeWind(speed) {
  if (!Number.isFinite(speed)) {
    return "Unknown";
  }
  if (speed < 5) {
    return "Calm flow";
  }
  if (speed < 15) {
    return "Light breeze";
  }
  if (speed < 30) {
    return "Steady wind";
  }
  if (speed < 50) {
    return "Strong wind";
  }
  return "Severe wind";
}

function parseIsoDateTime(isoText) {
  if (!isoText || typeof isoText !== "string") {
    return null;
  }
  const [datePart, timePart = "00:00"] = isoText.split("T");
  const [yearText, monthText, dayText] = datePart.split("-");
  const [hourText = "0", minuteText = "0"] = timePart.split(":");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  return { year, month, day, hour, minute };
}

function formatClock(isoText) {
  const parts = parseIsoDateTime(isoText);
  if (!parts) {
    return "--";
  }
  const suffix = parts.hour >= 12 ? "PM" : "AM";
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  return `${hour12}:${String(parts.minute).padStart(2, "0")} ${suffix}`;
}

function formatDateTime(isoText) {
  const parts = parseIsoDateTime(isoText);
  if (!parts) {
    return "--";
  }
  const date = new Date(parts.year, parts.month - 1, parts.day);
  const dateText = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${dateText}, ${formatClock(isoText)}`;
}

function formatHourLabel(isoTime, isFirst) {
  if (isFirst) {
    return "Now";
  }
  const parts = parseIsoDateTime(isoTime);
  if (!parts) {
    return "--";
  }
  const suffix = parts.hour >= 12 ? "pm" : "am";
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  return `${hour12}${suffix}`;
}

function formatDayLabel(isoDate, index) {
  if (!isoDate || typeof isoDate !== "string") {
    return "--";
  }
  if (index === 0) {
    return "Today";
  }
  const [yearText, monthText, dayText] = isoDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return "--";
  }
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function weatherInfo(code) {
  return WEATHER_DETAILS[code] || { label: "Unknown", icon: "DATA", tone: "clouds" };
}

function pickHourlyStart(times, currentTime) {
  if (!Array.isArray(times) || times.length === 0) {
    return 0;
  }
  const exactIndex = times.indexOf(currentTime);
  if (exactIndex >= 0) {
    return exactIndex;
  }

  const nowMs = Date.now();
  for (let i = 0; i < times.length; i += 1) {
    const slotTime = Date.parse(times[i]);
    if (Number.isFinite(slotTime) && slotTime >= nowMs) {
      return i;
    }
  }
  return 0;
}

function makeLocationLabel(record) {
  if (!record) {
    return "Unknown location";
  }
  return [record.name, record.admin1, record.country].filter(Boolean).join(", ");
}

function aqiCategoryAndTone(aqiValue) {
  if (!Number.isFinite(aqiValue)) {
    return { label: "Unavailable", tone: "" };
  }
  if (aqiValue <= 20) {
    return { label: "Good", tone: "good" };
  }
  if (aqiValue <= 40) {
    return { label: "Fair", tone: "moderate" };
  }
  if (aqiValue <= 60) {
    return { label: "Moderate", tone: "moderate" };
  }
  if (aqiValue <= 80) {
    return { label: "Poor", tone: "poor" };
  }
  if (aqiValue <= 100) {
    return { label: "Very poor", tone: "very-poor" };
  }
  return { label: "Severe", tone: "severe" };
}

function saveUnitPreference() {
  writeStoredJson(STORAGE_KEYS.unit, appState.unit);
}

function saveRecentCities() {
  writeStoredJson(STORAGE_KEYS.recentCities, appState.recentCities);
}

function saveLastLocation() {
  if (!appState.lastCoords) {
    return;
  }
  writeStoredJson(STORAGE_KEYS.lastLocation, {
    latitude: appState.lastCoords.latitude,
    longitude: appState.lastCoords.longitude,
    label: appState.locationLabel,
  });
}

function loadSavedState() {
  const storedUnit = readStoredJson(STORAGE_KEYS.unit, "C");
  if (storedUnit === "C" || storedUnit === "F") {
    appState.unit = storedUnit;
  }

  const storedRecent = readStoredJson(STORAGE_KEYS.recentCities, []);
  if (Array.isArray(storedRecent)) {
    appState.recentCities = storedRecent
      .map((city) => normalizeCityText(city))
      .filter(Boolean)
      .slice(0, RECENT_CITY_LIMIT);
  }

  const storedLocation = readStoredJson(STORAGE_KEYS.lastLocation, null);
  if (
    storedLocation &&
    Number.isFinite(storedLocation.latitude) &&
    Number.isFinite(storedLocation.longitude)
  ) {
    appState.lastCoords = {
      latitude: storedLocation.latitude,
      longitude: storedLocation.longitude,
    };
    appState.locationLabel = normalizeCityText(storedLocation.label) || "";
  }
}

function renderRecentCities() {
  refs.recentCities.innerHTML = "";
  if (!appState.recentCities.length) {
    const empty = document.createElement("span");
    empty.className = "chip-placeholder";
    empty.textContent = "No recent searches yet";
    refs.recentCities.append(empty);
    return;
  }

  appState.recentCities.forEach((city) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip-btn";
    button.dataset.city = city;
    button.textContent = city;
    button.disabled = appState.isBusy;
    refs.recentCities.append(button);
  });
}

function addRecentCity(city) {
  const normalized = normalizeCityText(city);
  if (!normalized) {
    return;
  }
  const deduped = appState.recentCities.filter(
    (storedCity) => storedCity.toLowerCase() !== normalized.toLowerCase()
  );
  appState.recentCities = [normalized, ...deduped].slice(0, RECENT_CITY_LIMIT);
  saveRecentCities();
  renderRecentCities();
}

async function geocodeCity(query) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("City lookup failed.");
  }

  const payload = await response.json();
  const result = payload.results && payload.results[0];
  if (!result) {
    throw new Error("City not found.");
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    cityName: result.name || query,
    label: makeLocationLabel(result),
  };
}

async function reverseGeocode(latitude, longitude) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  const result = payload.results && payload.results[0];
  return result ? makeLocationLabel(result) : null;
}

function buildForecastUrl(latitude, longitude) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "cloud_cover",
      "visibility",
    ].join(",")
  );
  url.searchParams.set(
    "hourly",
    ["temperature_2m", "precipitation_probability", "wind_speed_10m", "weather_code"].join(",")
  );
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "uv_index_max",
      "sunrise",
      "sunset",
    ].join(",")
  );
  url.searchParams.set("forecast_days", String(DAILY_WINDOW));
  url.searchParams.set("timezone", "auto");
  return url.toString();
}

function buildAirQualityUrl(latitude, longitude) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    [
      "european_aqi",
      "us_aqi",
      "pm10",
      "pm2_5",
      "ozone",
      "carbon_monoxide",
      "nitrogen_dioxide",
    ].join(",")
  );
  url.searchParams.set("timezone", "auto");
  return url.toString();
}

async function getForecast(latitude, longitude) {
  const response = await fetch(buildForecastUrl(latitude, longitude));
  if (!response.ok) {
    throw new Error("Weather request failed.");
  }
  return response.json();
}

async function getAirQuality(latitude, longitude) {
  const response = await fetch(buildAirQualityUrl(latitude, longitude));
  if (!response.ok) {
    throw new Error("Air quality request failed.");
  }
  return response.json();
}

function createHourlyCard(timeLabel, temp, weatherText, wind, rainChance) {
  const card = document.createElement("article");
  card.className = "hour-card";

  const time = document.createElement("span");
  time.className = "hour-time";
  time.textContent = timeLabel;

  const temperature = document.createElement("strong");
  temperature.className = "hour-temp";
  temperature.textContent = `${renderTemp(temp)} ${tempUnitLabel()}`;

  const condition = document.createElement("span");
  condition.className = "hour-meta";
  condition.textContent = weatherText;

  const windInfo = document.createElement("span");
  windInfo.className = "hour-meta";
  windInfo.textContent = `Wind ${Math.round(wind)} km/h`;

  const rain = document.createElement("span");
  rain.className = "hour-meta";
  rain.textContent = `Rain chance ${Math.round(rainChance)}%`;

  card.append(time, temperature, condition, windInfo, rain);
  return card;
}

function renderHourly(data) {
  refs.hourlyStrip.innerHTML = "";
  const hourly = data.hourly;
  if (!hourly || !Array.isArray(hourly.time)) {
    return;
  }

  const start = pickHourlyStart(hourly.time, data.current && data.current.time);
  const max = Math.min(start + HOURLY_WINDOW, hourly.time.length);

  for (let i = start; i < max; i += 1) {
    const isFirst = i === start;
    const timeLabel = formatHourLabel(hourly.time[i], isFirst);
    const temp = hourly.temperature_2m && Number(hourly.temperature_2m[i]);
    const wind = hourly.wind_speed_10m && Number(hourly.wind_speed_10m[i]);
    const rainChance =
      hourly.precipitation_probability && Number(hourly.precipitation_probability[i]);
    const code = hourly.weather_code && Number(hourly.weather_code[i]);
    const weatherText = weatherInfo(code).label;

    refs.hourlyStrip.append(
      createHourlyCard(
        timeLabel,
        Number.isFinite(temp) ? temp : 0,
        weatherText,
        Number.isFinite(wind) ? wind : 0,
        Number.isFinite(rainChance) ? rainChance : 0
      )
    );
  }
}

function createDailyCard(dayLabel, details, minTemp, maxTemp, windPeak, rainRisk) {
  const card = document.createElement("article");
  card.className = "daily-card";

  const day = document.createElement("span");
  day.className = "daily-day";
  day.textContent = dayLabel;

  const condition = document.createElement("span");
  condition.className = "daily-condition";
  condition.textContent = details.label;

  const temperature = document.createElement("strong");
  temperature.className = "daily-temp";
  temperature.textContent = `${renderTemp(maxTemp)} / ${renderTemp(minTemp)} ${tempUnitLabel()}`;

  const wind = document.createElement("span");
  wind.className = "daily-meta";
  wind.textContent = `Wind peak ${Math.round(windPeak)} km/h`;

  const rain = document.createElement("span");
  rain.className = "daily-meta";
  rain.textContent = `Rain risk ${Math.round(rainRisk)}%`;

  card.append(day, condition, temperature, wind, rain);
  return card;
}

function renderDaily(data) {
  refs.dailyGrid.innerHTML = "";

  const daily = data.daily;
  if (!daily || !Array.isArray(daily.time)) {
    return;
  }

  const max = Math.min(DAILY_WINDOW, daily.time.length);
  for (let i = 0; i < max; i += 1) {
    const dayLabel = formatDayLabel(daily.time[i], i);
    const weatherCode = daily.weather_code && Number(daily.weather_code[i]);
    const details = weatherInfo(weatherCode);
    const minTemp = daily.temperature_2m_min && Number(daily.temperature_2m_min[i]);
    const maxTemp = daily.temperature_2m_max && Number(daily.temperature_2m_max[i]);
    const windPeak = daily.wind_speed_10m_max && Number(daily.wind_speed_10m_max[i]);
    const rainRisk =
      daily.precipitation_probability_max && Number(daily.precipitation_probability_max[i]);

    refs.dailyGrid.append(
      createDailyCard(
        dayLabel,
        details,
        Number.isFinite(minTemp) ? minTemp : 0,
        Number.isFinite(maxTemp) ? maxTemp : 0,
        Number.isFinite(windPeak) ? windPeak : 0,
        Number.isFinite(rainRisk) ? rainRisk : 0
      )
    );
  }
}

function resetAirQuality() {
  refs.aqiBadge.textContent = "AQI unavailable";
  delete refs.aqiBadge.dataset.aqiTone;
  refs.aqiEu.textContent = "--";
  refs.aqiUs.textContent = "--";
  refs.pm25.textContent = "-- ug/m3";
  refs.pm10.textContent = "-- ug/m3";
  refs.ozone.textContent = "-- ug/m3";
  refs.co.textContent = "-- ug/m3";
}

function renderAirQuality(airPayload) {
  const current = airPayload && airPayload.current;
  if (!current) {
    resetAirQuality();
    return;
  }

  const euAqi = Number(current.european_aqi);
  const usAqi = Number(current.us_aqi);
  const pm25 = Number(current.pm2_5);
  const pm10 = Number(current.pm10);
  const ozone = Number(current.ozone);
  const co = Number(current.carbon_monoxide);
  const { label, tone } = aqiCategoryAndTone(euAqi);

  if (Number.isFinite(euAqi)) {
    refs.aqiBadge.textContent = `AQI ${Math.round(euAqi)} - ${label}`;
    if (tone) {
      refs.aqiBadge.dataset.aqiTone = tone;
    } else {
      delete refs.aqiBadge.dataset.aqiTone;
    }
  } else {
    refs.aqiBadge.textContent = "AQI unavailable";
    delete refs.aqiBadge.dataset.aqiTone;
  }

  refs.aqiEu.textContent = Number.isFinite(euAqi) ? String(Math.round(euAqi)) : "--";
  refs.aqiUs.textContent = Number.isFinite(usAqi) ? String(Math.round(usAqi)) : "--";
  refs.pm25.textContent = Number.isFinite(pm25) ? `${pm25.toFixed(1)} ug/m3` : "-- ug/m3";
  refs.pm10.textContent = Number.isFinite(pm10) ? `${pm10.toFixed(1)} ug/m3` : "-- ug/m3";
  refs.ozone.textContent = Number.isFinite(ozone) ? `${ozone.toFixed(1)} ug/m3` : "-- ug/m3";
  refs.co.textContent = Number.isFinite(co) ? `${co.toFixed(1)} ug/m3` : "-- ug/m3";
}

function renderCurrent(data, label) {
  const current = data.current;
  const daily = data.daily;
  if (!current) {
    throw new Error("Incomplete weather payload.");
  }

  const details = weatherInfo(Number(current.weather_code));
  const windSpeed = Number(current.wind_speed_10m);
  const windGust = Number(current.wind_gusts_10m);
  const windDirection = Number(current.wind_direction_10m);
  const humidity = Number(current.relative_humidity_2m);
  const pressure = Number(current.surface_pressure);
  const visibility = Number(current.visibility);
  const precipitation = Number(current.precipitation);
  const cloudCover = Number(current.cloud_cover);
  const uvMax = daily && Array.isArray(daily.uv_index_max) ? Number(daily.uv_index_max[0]) : null;

  document.body.dataset.tone = details.tone;

  refs.locationName.textContent = label;
  refs.weatherSummary.textContent = details.label;
  refs.weatherIcon.textContent = details.icon;
  refs.temperature.textContent = renderTemp(current.temperature_2m);
  refs.temperatureUnit.textContent = tempUnitLabel();
  refs.feelsLike.textContent = Number.isFinite(current.apparent_temperature)
    ? `Feels like ${renderTemp(current.apparent_temperature)} ${tempUnitLabel()}`
    : "Feels like --";
  refs.sunrise.textContent = daily && daily.sunrise ? `Sunrise ${formatClock(daily.sunrise[0])}` : "Sunrise --";
  refs.sunset.textContent = daily && daily.sunset ? `Sunset ${formatClock(daily.sunset[0])}` : "Sunset --";

  refs.humidity.textContent = Number.isFinite(humidity) ? `${Math.round(humidity)}%` : "--%";
  refs.pressure.textContent = Number.isFinite(pressure) ? `${Math.round(pressure)} hPa` : "-- hPa";
  refs.visibility.textContent = Number.isFinite(visibility) ? `${(visibility / 1000).toFixed(1)} km` : "-- km";
  refs.precipitation.textContent = Number.isFinite(precipitation)
    ? `${precipitation.toFixed(1)} mm`
    : "-- mm";
  refs.cloudCover.textContent = Number.isFinite(cloudCover) ? `${Math.round(cloudCover)}%` : "--%";
  refs.uvIndex.textContent = Number.isFinite(uvMax) ? uvMax.toFixed(1) : "--";

  refs.windCategory.textContent = describeWind(windSpeed);
  refs.windSpeed.textContent = Number.isFinite(windSpeed) ? `${windSpeed.toFixed(1)} km/h` : "-- km/h";
  refs.windDirection.textContent = Number.isFinite(windDirection)
    ? `${Math.round(windDirection)} deg (${toCompass(windDirection)})`
    : "--";
  refs.windGust.textContent = Number.isFinite(windGust) ? `${windGust.toFixed(1)} km/h` : "-- km/h";
  refs.windPointer.style.setProperty(
    "--rotation",
    Number.isFinite(windDirection) ? `${windDirection}deg` : "0deg"
  );

  const timezoneTag = data.timezone_abbreviation || data.timezone || "local";
  appState.timezoneTag = timezoneTag;
  refs.updatedAt.textContent = `Updated ${formatDateTime(current.time)} (${timezoneTag})`;
}

function showError(message) {
  setStatus("error", "Connection issue");
  refs.weatherSummary.textContent = message;
  refs.updatedAt.textContent = "Unable to refresh weather data";
}

async function refreshByCoordinates(latitude, longitude, labelHint, options = {}) {
  const requestId = ++appState.activeRequestId;
  setStatus("loading", options.statusText || "Syncing weather");
  setBusyState(true);

  try {
    const [weatherResult, airResult] = await Promise.allSettled([
      getForecast(latitude, longitude),
      getAirQuality(latitude, longitude),
    ]);

    if (requestId !== appState.activeRequestId) {
      return;
    }

    if (weatherResult.status !== "fulfilled") {
      throw weatherResult.reason instanceof Error
        ? weatherResult.reason
        : new Error("Weather request failed.");
    }

    let resolvedLabel = normalizeCityText(labelHint);
    if (!resolvedLabel) {
      resolvedLabel = (await reverseGeocode(latitude, longitude)) || "Unknown location";
    }

    if (requestId !== appState.activeRequestId) {
      return;
    }

    appState.payload = weatherResult.value;
    appState.airPayload = airResult.status === "fulfilled" ? airResult.value : null;
    appState.locationLabel = resolvedLabel;
    appState.lastCoords = { latitude, longitude };

    renderCurrent(appState.payload, resolvedLabel);
    renderHourly(appState.payload);
    renderDaily(appState.payload);
    renderAirQuality(appState.airPayload);
    saveLastLocation();

    setStatus("ready", options.readyText || "Live stream");
  } catch (error) {
    if (requestId !== appState.activeRequestId) {
      return;
    }
    showError(error && error.message ? error.message : "Unable to load weather.");
  } finally {
    if (requestId === appState.activeRequestId) {
      setBusyState(false);
    }
  }
}

function setTemperatureUnit(nextUnit) {
  if (nextUnit !== "C" && nextUnit !== "F") {
    return;
  }
  if (appState.unit === nextUnit) {
    return;
  }
  appState.unit = nextUnit;
  saveUnitPreference();
  syncUnitButtons();
  if (!appState.payload) {
    return;
  }
  renderCurrent(appState.payload, appState.locationLabel);
  renderHourly(appState.payload);
  renderDaily(appState.payload);
}

async function refreshByCity(cityInputValue, options = {}) {
  const city = normalizeCityText(cityInputValue);
  if (!city) {
    return;
  }
  setStatus("loading", "Resolving location");
  const location = await geocodeCity(city);
  await refreshByCoordinates(location.latitude, location.longitude, location.label, {
    statusText: options.statusText || "Syncing weather",
    readyText: options.readyText || "Live stream",
  });
  refs.cityInput.value = location.cityName;
  if (options.saveRecent !== false) {
    addRecentCity(location.cityName);
  }
}

function getDevicePosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unsupported."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 600000,
    });
  });
}

async function useCurrentLocation() {
  setStatus("loading", "Detecting your location");
  const position = await getDevicePosition();
  const { latitude, longitude } = position.coords;
  await refreshByCoordinates(latitude, longitude, appState.locationLabel || "My Location", {
    statusText: "Syncing local weather",
    readyText: "Live stream",
  });
}

function startAutoRefresh() {
  if (appState.autoRefreshTimer) {
    clearInterval(appState.autoRefreshTimer);
  }
  appState.autoRefreshTimer = setInterval(() => {
    if (!appState.lastCoords || appState.isBusy || document.hidden) {
      return;
    }
    void refreshByCoordinates(
      appState.lastCoords.latitude,
      appState.lastCoords.longitude,
      appState.locationLabel,
      { statusText: "Auto refreshing", readyText: "Live stream" }
    );
  }, AUTO_REFRESH_INTERVAL_MS);
}

async function initialize() {
  loadSavedState();
  syncUnitButtons();
  renderRecentCities();
  resetAirQuality();
  setBusyState(false);

  try {
    if (appState.lastCoords) {
      await refreshByCoordinates(
        appState.lastCoords.latitude,
        appState.lastCoords.longitude,
        appState.locationLabel,
        { statusText: "Restoring last location", readyText: "Live stream" }
      );
    } else {
      await useCurrentLocation();
    }
  } catch {
    try {
      await refreshByCity(DEFAULT_CITY, { saveRecent: false });
    } catch (fallbackError) {
      showError(fallbackError.message || "Unable to load weather.");
    }
  }

  startAutoRefresh();
}

refs.searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = refs.cityInput.value;
  if (!normalizeCityText(city)) {
    return;
  }
  try {
    await refreshByCity(city);
  } catch (error) {
    showError(error.message || "City lookup failed.");
  }
});

refs.locationButton.addEventListener("click", async () => {
  try {
    await useCurrentLocation();
  } catch {
    showError("Could not access your location.");
  }
});

refs.refreshButton.addEventListener("click", async () => {
  if (!appState.lastCoords) {
    return;
  }
  await refreshByCoordinates(
    appState.lastCoords.latitude,
    appState.lastCoords.longitude,
    appState.locationLabel,
    { statusText: "Refreshing now", readyText: "Live stream" }
  );
});

refs.unitButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTemperatureUnit(button.dataset.unit);
  });
});

refs.recentCities.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const chip = target.closest(".chip-btn");
  if (!chip || !chip.dataset.city) {
    return;
  }
  try {
    await refreshByCity(chip.dataset.city, { saveRecent: true });
  } catch (error) {
    showError(error.message || "Could not load saved city.");
  }
});

window.addEventListener("online", () => {
  if (appState.payload && !appState.isBusy) {
    setStatus("ready", "Back online");
  }
});

window.addEventListener("offline", () => {
  setStatus("error", "Offline");
});

initialize();
