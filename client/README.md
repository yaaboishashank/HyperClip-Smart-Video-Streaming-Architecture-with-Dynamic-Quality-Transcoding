# HyperClip — client

The complete React frontend for your existing HyperClip Express backend. Red Signal theme, light/dark mode, responsive layouts, and real API data. This archive contains only `client/`; it does not change your `Server` folder.

## Start locally

Use Node.js 22.12+ (Node 24 also works).

1. Extract this ZIP into your `hyperClip` project so `client` and `Server` sit beside each other. Open `client/package.json` to confirm you did not accidentally create `client/client`.
2. Start your existing backend in one terminal:

   ```bash
   cd Server
   npm run dev
   ```

3. Open another terminal at the `hyperClip` root:

   ```bash
   cd client
   npm ci
   npm run dev
   ```

4. Open **http://localhost:5173**. Register with a profile image or sign in with your existing account.

Run install commands inside `client`. There is no root package or workspace configuration. Dependencies go into `client/node_modules`, which is intentionally excluded from this ZIP.

## Backend connection

The default connection works without a client `.env` file:

- Browser: `http://localhost:5173`
- Browser API requests: `/api/v1/...`
- Vite proxy target: `http://127.0.0.1:8000`
- Backend response: `{ statusCode, data, message, success }`

Your server should already have `PORT=8000`, `CORS_ORIGIN=http://localhost:5173`, and development cookie settings (`NODE_ENV=development`). Keep MongoDB, JWT and Cloudinary credentials exclusively in `Server/.env`.

To change the backend address, copy `.env.example` to `.env`, edit `HYPERCLIP_PROXY_TARGET`, then restart Vite. Leave `VITE_API_BASE_URL=/api/v1` for the included proxy setup. No secrets belong in client environment variables.

Use `localhost` consistently in the browser. Vite deliberately keeps port 5173: if it is occupied, stop your other frontend terminal with Ctrl+C before starting this one.

## Included pages and features

- Login, registration, cookie-based session restoration, token refresh, logout.
- Home feed, title/description search, sorting, pagination.
- Video upload with thumbnail and matching backend file limits.
- Watch page, native video controls, views/history recording on playback.
- Video/comment/community-post likes; comments with owner edit/delete.
- Channel profiles, subscriptions and community posts.
- Playlists: create, edit, delete, save/remove videos.
- Watch history and liked videos.
- Creator studio: statistics, uploads, edit details/thumbnail, publish/unpublish, delete.
- Settings: profile details, avatar, cover image, password and appearance.
- Loading, empty, error, retry and confirmation states.

The feed and product pages require login, matching your backend's protected routes. An empty database shows an empty state. No fake users, videos, statistics or demo media are included.

## Source guide

| Location                      | Responsibility                                         |
| ----------------------------- | ------------------------------------------------------ |
| `src/main.jsx`, `src/App.jsx` | Application entry and session initialization           |
| `src/routes/`                 | URLs and protected routes                              |
| `src/pages/`                  | Page composition and forms                             |
| `src/components/layout/`      | Header, sidebar and responsive application layout      |
| `src/components/common/`      | Shared controls, dialogs, feedback and community posts |
| `src/components/video/`       | Player, cards, grids and save-to-playlist dialog       |
| `src/components/comments/`    | Comments and editing                                   |
| `src/services/`               | API calls grouped by backend module                    |
| `src/context/`                | Authentication and theme state                         |
| `src/hooks/`                  | Reusable auth, theme and request hooks                 |
| `src/styles/`                 | Theme tokens and responsive styles                     |
| `src/utils/`                  | Formatting and upload validation                       |

Start learning with `main.jsx`, then `routes/AppRoutes.jsx`, `services/api.js`, and `pages/Home.jsx`. Every API service returns the backend's `data` property. Forms send the exact field names expected by your server. The playlist API base is singular: `/api/v1/playlist`.

`fetch` sends cookies with `credentials: 'include'`. Parallel expired requests share one refresh request, then each retries once. Tokens are not stored in localStorage; only the selected theme is stored there. Server validation and ownership checks remain authoritative.

## Backend behavior reflected in the interface

- Profile/thumbnail images: JPG, JPEG, PNG, WEBP; maximum 5 MiB each.
- Videos: MP4, WEBM, MOV; maximum 100,000,000 bytes. Browser codec support can vary; an MP4 with H.264/AAC is a useful first upload.
- Uploads show a busy state. There is no invented percentage or background upload queue.
- Your likes API provides toggle results but no initial read-only status. The initial button says **Like / unlike**; after clicking, it displays the server's actual status and count.
- Watch history uses `POST /api/v1/users/history/:videoId`, once on the first play during each watch-page visit. History saving errors do not block playback. Your server returns the latest 100 history entries.
- Community posts use the existing `/tweets` endpoints.
- This frontend does not add FFmpeg transcoding, selectable output resolutions, HLS streaming, password-reset emails, notifications or other features absent from your backend.

## Verify with your server

1. Register with a small JPG/PNG avatar, then sign in.
2. Upload a small MP4 with a thumbnail, title and description.
3. Play it and check Watch history. Add/edit a comment and save the video to a playlist.
4. Use a second account to subscribe to your first channel.
5. In Creator studio, edit your own video and try publish/unpublish.
6. In Settings, update your details and check both themes. Changing your password signs you out.

The production build and browser flows were checked against isolated API fixtures matching the reviewed server contracts, including authentication refresh, multipart uploads, comments, playlists, subscriptions, community posts, studio editing, settings and mobile navigation. Live MongoDB/Cloudinary operations and actual media playback still need the local verification above. QA fixtures and tools are not included in this ZIP.

## Build

```bash
npm run build
```

This generates `client/dist`. To inspect the build locally, stop the dev server and run `npm run preview`, also at port 5173 with the local API proxy.

For deployment, host `dist` with a fallback to `index.html` for frontend routes and route `/api` to your running backend. Use HTTPS and the server's production cookie settings. Vite's development proxy is not a production server.

## Common issues

| Symptom                                      | What to check                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| Cannot reach HyperClip / unreadable response | Backend is listening on 8000; check its terminal and the proxy target.                  |
| Repeated sign-in / 401                       | Sign in again, use `localhost` consistently, check development cookies and JWT secrets. |
| CORS error                                   | Backend origin matches `http://localhost:5173`; avoid `*` with credentialed requests.   |
| Upload fails                                 | File format/size, required fields, Cloudinary setup and backend terminal.               |
| API route not found                          | Use your completed backend controllers/routes, including the history POST route.        |
| No videos                                    | Upload one; the frontend displays real backend records.                                 |

No backend source, credentials, `node_modules`, generated `dist`, test folders or root-level scripts are shipped.
