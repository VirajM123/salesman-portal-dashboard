# Salesman Portal — Delivery Tracking Dashboard

Premium React/Vite dashboard matching the supplied reference direction.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

`npm run dev` starts both the authenticated Express API on port 4000 and the
Vite application. Vite proxies `/api` requests to the API server.

Set your Google Maps JavaScript API key:

```env
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

Enable the Google Maps JavaScript API in Google Cloud. For production, also restrict the key by HTTP referrer and API.

Configure MongoDB and authentication only with server-side environment names
(never with the `VITE_` prefix):

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=TotalApp
MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1
SESSION_SECRET=a_long_random_secret
SERVER_PORT=4000
```

Authentication reads mobile-app credentials from `Mas_Register`, then checks
the linked active profile in `mas_distributor`. The authenticated distributor
ID is enforced by the API when reading
`mas_customer` and `mas_salesman`; the frontend cannot select another
distributor ID.

## Production

```bash
npm run build
npm start
```

## Production architecture

The current UI uses realistic local mock data. Replace the arrays in `src/App.jsx` with your API/service layer.

Recommended structure when connecting your existing backend:

- `services/api.js` — REST calls
- `services/socket.js` — Socket.IO connection
- `hooks/useLiveLocations.js` — live GPS state
- `hooks/useLoads.js` — load state
- `components/` — move reusable dashboard sections into separate files

Socket events expected by the UI:

- `salesman-location-updated`
- `delivery-progress-updated`
- `alert-created`

Example GPS payload:

```js
{
  salesmanId: 101,
  loadId: 1848,
  latitude: 18.5912,
  longitude: 73.7389,
  speed: 28,
  heading: 120,
  accuracy: 8,
  battery: 72,
  timestamp: new Date().toISOString()
}
```

The Google map is deliberately not replaced with an image. Without a configured key, the app displays a development fallback so the rest of the UI can still be developed.
