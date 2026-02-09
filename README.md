# AeroPulse Weather

A futuristic, responsive weather dashboard built with plain HTML, CSS, and JavaScript.

It shows live weather, wind intelligence, air quality, a 12-hour outlook, and a 14-day forecast with a polished UI designed for desktop, tablet, and mobile.

## Features

- Current weather conditions (temperature, feels-like, humidity, pressure, visibility, precipitation, cloud cover, UV index)
- Wind intelligence panel (speed, gusts, direction + compass dial)
- 12-hour forecast strip (temperature, condition, wind, rain chance)
- 14-day forecast grid (high/low temperature, wind peak, rain risk)
- Air quality section (EU AQI, US AQI, PM2.5, PM10, Ozone, CO)
- City search + geolocation (`Use My Location`)
- Recent search chips (stored locally)
- `deg C` / `deg F` unit toggle (stored locally)
- Manual refresh button + auto-refresh every 10 minutes
- Online/offline connection status handling
- Fully responsive layout for PC, smartphone, and tablet

## Tech Stack

- HTML5
- CSS3 (custom futuristic styling + responsive breakpoints)
- Vanilla JavaScript (ES6+)
- Open-Meteo APIs (no API key required)

## APIs Used

- Forecast API: `https://api.open-meteo.com/v1/forecast`
- Geocoding API: `https://geocoding-api.open-meteo.com/v1/search`
- Reverse Geocoding API: `https://geocoding-api.open-meteo.com/v1/reverse`
- Air Quality API: `https://air-quality-api.open-meteo.com/v1/air-quality`

## Project Structure

```text
.
├── index.html    # UI structure
├── styles.css    # Theme, layout, responsive behavior, animations
└── script.js     # Data fetching, rendering, state, interactions, persistence
```

## Getting Started

1. Open a terminal in the project directory:

```bash
cd /home/rahuljha/Documents/HabbitTrackerWebApp
```

2. Start a local server (recommended for geolocation support):

```bash
python3 -m http.server 8080
```

3. Open in browser:

```text
http://localhost:8080
```

## How to Use

1. Type a city in the search box and click `Search`.
2. Or click `Use My Location` to load weather by GPS.
3. Switch between `deg C` and `deg F` from the unit toggle.
4. Click `Refresh` for an instant data refresh.
5. Tap a recent-search chip to quickly reload a city.

## Local Persistence

The app stores these preferences in `localStorage`:

- `aeropulse_unit`
- `aeropulse_recent_cities`
- `aeropulse_last_location`

## Configuration

In `script.js`, you can tune:

- `DEFAULT_CITY`
- `HOURLY_WINDOW`
- `DAILY_WINDOW`
- `RECENT_CITY_LIMIT`
- `AUTO_REFRESH_INTERVAL_MS`

## Notes / Limitations

- Internet is required (all weather/air data is fetched live).
- Geolocation requires browser permission and works best on secure contexts (`https` or `localhost`).
- Air quality values may be unavailable for some locations/times.

