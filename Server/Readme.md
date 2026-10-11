# HyperClip — Backend

The backend powering HyperClip, a video-sharing application built with the MERN stack.

It handles authentication, media uploads, video management, social interactions and background video processing. A separate worker uses FFmpeg to generate multiple playback qualities from uploaded videos.

## Features

- JWT authentication with access and refresh tokens.
- HTTP-only authentication cookies and bcrypt password hashing.
- User profiles, avatars and cover images.
- Video uploads with thumbnails.
- Background video processing with status tracking and retry.
- Multiple MP4 quality variants.
- Video editing, publication controls and deletion.
- Account-based unique view tracking and watch history.
- Comments, likes and channel subscriptions.
- Playlists and community posts.
- Creator dashboard APIs.
- Temporary-file and Cloudinary media cleanup.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Node.js | Backend runtime |
| Express | HTTP server and API routing |
| MongoDB | Application database |
| Mongoose | Schemas and database operations |
| JWT | Access and refresh tokens |
| bcrypt | Password hashing |
| Multer | Multipart file uploads |
| Cloudinary | Media storage |
| FFmpeg | Video encoding |
| FFprobe | Video inspection |
| Nodemon | Development reloads |

## Project Structure

The repository contains `client/` and `Server/`.

| Backend path | Responsibility |
| --- | --- |
| `src/index.js` | Environment validation and server startup |
| `src/app.js` | Middleware, routes and production frontend serving |
| `src/db/` | Database connection |
| `src/models/` | Mongoose schemas |
| `src/controllers/` | Request handlers |
| `src/routes/` | API routes |
| `src/middlewares/` | Authentication, uploads and error handling |
| `src/services/` | Transcoding and media-file operations |
| `src/utils/` | Shared utilities and Cloudinary helpers |
| `src/workers/video.worker.js` | Background video processing |

## Getting Started

### 1. Prerequisites

- Node.js 22.12 or newer for the full project.
- MongoDB Atlas or a MongoDB replica set for transaction support.
- A Cloudinary account.
- FFmpeg and FFprobe installed on the machine running the worker.

### 2. Install Dependencies

From the repository root:

```bash
cd Server
npm ci
```

### 3. Configure Environment Variables

Create a `.env` file inside `Server/`:

```dotenv
NODE_ENV=development
PORT=8000
CORS_ORIGIN=http://localhost:5173

MONGODB_URI=your_mongodb_connection_string

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=15m

REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
```

Replace the placeholders with your own values. Keep `.env` out of version control.

Generate each token secret separately:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

If FFmpeg and FFprobe are not available through your system's `PATH`, provide their actual executable paths.

Windows example:

```dotenv
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe
FFPROBE_PATH=C:/ffmpeg/bin/ffprobe.exe
```

These paths must match your installation. Do not use Windows executable paths on a Linux server.

### 4. Start the API

Run inside `Server/`:

```bash
npm run dev
```

The default local API address is:

```text
http://localhost:8000
```

Health check:

```text
http://localhost:8000/api/v1/healthcheck
```

### 5. Start the Video Worker

Open a second terminal inside `Server/`:

```bash
npm run worker
```

The API and worker run separately. Starting the API does not automatically start the worker.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with Nodemon |
| `npm start` | Start the API with Node.js |
| `npm run worker` | Start the video processing worker |

## Video Processing

The upload and processing flow:

1. The API receives the original video and thumbnail.
2. Media is uploaded to Cloudinary.
3. A video record is saved with `pending` processing status.
4. The worker claims the job using a processing token and lease.
5. The original video is downloaded into a temporary workspace.
6. FFprobe checks the source dimensions and duration.
7. FFmpeg generates the configured MP4 variants.
8. The variants are uploaded to Cloudinary.
9. Their URLs and dimensions are saved in MongoDB.
10. Successful processing marks the video as `ready`.
11. Temporary workspace cleanup runs after processing.

### Processing States

| Status | Meaning |
| --- | --- |
| `pending` | Waiting for a worker |
| `processing` | Downloading, encoding or uploading variants |
| `ready` | Processing completed |
| `failed` | Processing failed or was interrupted |

Eligible failed jobs can be retried through the application.

### Playback Qualities

Available qualities depend on the source dimensions and the profiles configured in:

```text
src/services/transcoding.service.js
```

For example, a tested `848 × 480` source generated:

- 240p
- 360p
- 480p

Smaller source videos are not expected to provide genuine HD detail.

Each quality is a separate MP4 file encoded with H.264 video and AAC audio. The frontend provides manual quality switching.

This implementation does not use HLS or automatic adaptive bitrate streaming.

### Upload Limits

| Upload | Limit |
| --- | --- |
| Video size | 100 MB |
| Thumbnail size | 5 MB |
| Video duration | 10 minutes |

Supported video formats:

```text
MP4, WEBM, MOV
```

Supported image formats:

```text
JPG, JPEG, PNG, WEBP
```

Duration is validated during video processing.

## API Overview

Base path:

```text
/api/v1
```

### Route Groups

| Route | Responsibility |
| --- | --- |
| `/healthcheck` | Service health |
| `/users` | Authentication, profiles and watch history |
| `/videos` | Video management and processing |
| `/comments` | Video comments |
| `/likes` | Likes |
| `/subscriptions` | Channel subscriptions |
| `/playlist` | Playlists |
| `/tweets` | Community posts |
| `/dashboard` | Creator statistics and videos |

### Authentication Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/users/register` | Register an account |
| POST | `/users/login` | Log in |
| POST | `/users/logout` | Log out |
| POST | `/users/refresh-token` | Refresh the session |
| GET | `/users/current-user` | Get the authenticated user |
| PATCH | `/users/update-account` | Update account details |
| POST | `/users/change-password` | Change the password |

### Video Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/videos` | List videos |
| POST | `/videos` | Upload a video |
| GET | `/videos/:videoId` | Get video details |
| PATCH | `/videos/:videoId` | Update a video |
| DELETE | `/videos/:videoId` | Delete a video |
| GET | `/videos/:videoId/status` | Get processing status |
| POST | `/videos/:videoId/retry` | Retry eligible failed processing |
| PATCH | `/videos/toggle/publish/:videoId` | Toggle publication |

### Watch History

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/users/history` | Get watch history |
| POST | `/users/history/:videoId` | Record playback and account-based views |

Protected actions require authentication. Ownership checks apply to creator actions.

### Upload Request

Send video uploads as `multipart/form-data` with these fields:

| Field | Content |
| --- | --- |
| `videoFile` | Original video |
| `thumbnail` | Thumbnail image |
| `title` | Video title |
| `description` | Video description |

For authenticated browser requests, include cookies:

```js
fetch("/api/v1/users/current-user", {
  credentials: "include",
});
```

When sending `FormData`, let the browser set the multipart `Content-Type` header.

## Unique Views

View deduplication is handled by the backend.

- One account contributes one unique view per video.
- Repeated playback should not repeatedly increase the count.
- Quality switching should not add another unique view.
- The counting record is separate from watch history.

Previously accumulated view totals are not automatically recalculated.

## Deployment

The current deployment serves the Express API and compiled React frontend from one Render web service.

The frontend uses:

```text
/api/v1
```

This keeps the frontend and API on the same origin.

### Build Command

Run from the repository root:

```bash
npm ci --prefix Server && npm ci --prefix client --include=dev && npm run build --prefix client
```

### Start Command

```bash
npm start --prefix Server
```

### Configuration

- Keep the service root directory empty when using these commands.
- Set `NODE_ENV=production`.
- Configure MongoDB, JWT and Cloudinary environment variables.
- Ensure the build creates `client/dist`.
- Preserve the capital `S` in `Server` on Linux.
- Keep secrets in the hosting environment, not in GitHub.

The production Express application serves the frontend build and the API.

### Worker Deployment

In the current demo setup, the worker runs on the developer's laptop:

```bash
cd Server
npm run worker
```

It must use the same MongoDB database and Cloudinary account as the hosted API.

Keep the laptop awake and connected while processing uploads.

If the worker is stopped:

- New jobs remain pending until a worker starts.
- Already processed videos remain available through Cloudinary.

The local API and frontend development servers do not need to run for the hosted application to use this worker.

This setup does not provide an always-on hosted transcoding worker.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `EADDRINUSE` | Another process is using the server port |
| `ECONNREFUSED` during local development | API startup, port and frontend proxy target |
| JSON 404 at the hosted homepage | Production environment and frontend static-file serving |
| Video remains pending | Worker process and database connection |
| FFmpeg cannot start | Installation and executable paths |
| Only one quality appears | Source dimensions, configured profiles and saved variants |
| Cloudinary upload fails | Logs, credentials, connectivity and account limits |
| Temporary cleanup reports `EPERM` | File locks, open streams or Windows sync interference |

## Verification Checklist

- [ ] Health endpoint responds successfully.
- [ ] Login persists after refreshing the page.
- [ ] Logout clears the session.
- [ ] A new upload progresses from pending to ready.
- [ ] Generated qualities play successfully.
- [ ] Quality switching preserves playback position.
- [ ] Repeated playback from one account does not repeatedly increase views.
- [ ] A disposable test video can be deleted from Studio.
- [ ] Temporary processing workspaces are cleaned up.
- [ ] Refreshing a hosted frontend route loads the application.

## Author

**Shashank Sharma**

Built to explore full-stack application development, authentication, media storage, background video processing and deployment.
