# HyperClip

### A full-stack video-sharing application with background video processing.

HyperClip lets users upload videos, watch them in multiple qualities, follow creators and organize content into playlists.

Built with the MERN stack, the project connects a React interface with an Express API, Cloudinary media storage and a separate FFmpeg worker for video processing.

**[Open HyperClip](https://hyperclip-smart-video-streaming.onrender.com)**

> Demo note: New uploads require the background worker to be running. In the current deployment, this worker runs on the developer's laptop. Already processed videos can play without it.

---

## Overview

HyperClip explores the complete journey of a video—from upload to playback.

The API accepts the original media, stores it remotely and queues processing in MongoDB. A worker generates compatible MP4 variants and saves their playback URLs. The frontend displays processing progress and lets viewers switch between the available qualities.

Alongside this pipeline, the application includes authentication, creator profiles, comments, subscriptions, playlists and a creator dashboard.

## Features

### Watch and Discover

- Browse videos and creator channels.
- Play videos with manual quality selection.
- Preserve playback position when switching quality.
- Like videos and participate in comments.
- Subscribe to creators.
- Save videos to playlists.
- Revisit content through watch history.

### Create and Manage

- Upload videos with custom thumbnails.
- Track background processing status.
- Retry eligible failed processing jobs.
- Manage uploads through Creator Studio.
- Edit video details.
- Control publication status.
- Delete uploaded videos.

### Accounts and Interface

- Registration and login.
- JWT authentication with HTTP-only cookies.
- Access-token refresh.
- Profile, avatar and cover-image updates.
- Account-based unique view tracking.
- Light and dark themes.
- Responsive layouts with loading and error feedback.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, Vite, React Router, CSS, Lucide React |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt, HTTP-only cookies |
| File uploads | Multer |
| Media storage | Cloudinary |
| Video processing | FFmpeg, FFprobe |
| Deployment | Render web service and a separately running worker |

The application is written in **JavaScript and JSX**.

## Architecture

HyperClip has three application processes:

| Component | Responsibility |
| --- | --- |
| React frontend | User interface, playback and API requests |
| Express API | Authentication, uploads, permissions and application data |
| Video worker | Claiming queued jobs, encoding variants and saving results |

MongoDB stores application data and processing state. Cloudinary stores original media, thumbnails and generated video variants.

During local development, React and Express run separately. In the current deployment, Express serves both the API and the compiled React frontend from the same origin.

### Video Processing Flow

1. A creator uploads a video and thumbnail.
2. The API stores the media in Cloudinary and creates a pending video record.
3. The worker claims the pending job using a processing token and lease.
4. It downloads the original video into a temporary workspace.
5. FFprobe inspects the source.
6. FFmpeg encodes the configured output qualities.
7. The worker uploads the generated files to Cloudinary.
8. MongoDB is updated with the variant URLs and processing result.
9. The frontend makes the completed video available for playback.
10. Temporary workspace cleanup runs after processing.

### Processing States

| State | Meaning |
| --- | --- |
| `pending` | Waiting for a worker |
| `processing` | Downloading, encoding or uploading |
| `ready` | Processing completed |
| `failed` | Processing failed or was interrupted |

### Quality Selection

Available qualities depend on the source dimensions and configured output profiles.

For example, a tested `848 × 480` video produced:

- 240p
- 360p
- 480p

The frontend displays the variants returned by the backend. It does not generate higher-quality video itself.

Each variant is a separate MP4 file with H.264 video and AAC audio. Quality selection is manual; the project does not currently implement HLS or automatic adaptive bitrate streaming.

## Repository Structure

| Location | Contents |
| --- | --- |
| `client/` | React frontend |
| `Server/` | Express API and background worker |
| `client/README.md` | Frontend setup and implementation details |
| `Server/README.md` | Backend setup, API overview and processing details |
| `README.md` | Project overview and complete setup |

The backend folder is named **`Server`** with a capital **S**. Preserve this casing in deployment commands.

## Run Locally

### Prerequisites

- Node.js 22.12 or newer.
- npm.
- MongoDB Atlas or a MongoDB replica set for transaction support.
- A Cloudinary account.
- FFmpeg and FFprobe installed on the machine running the worker.

### 1. Install Dependencies

Open a terminal in the repository root:

```bash
npm ci --prefix Server
npm ci --prefix client
```

### 2. Configure the Backend

Create `Server/.env`:

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

Replace the placeholders with your own values. Never commit `.env` files or credentials.

Generate each token secret separately:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

If FFmpeg and FFprobe are not on your system's `PATH`, provide their actual executable locations.

Windows example:

```dotenv
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe
FFPROBE_PATH=C:/ffmpeg/bin/ffprobe.exe
```

Use paths that match your installation.

### 3. Start the API

In the first terminal, from the repository root:

```bash
npm run dev --prefix Server
```

Default API address:

```text
http://localhost:8000
```

Health endpoint:

```text
http://localhost:8000/api/v1/healthcheck
```

### 4. Start the Worker

In a second terminal:

```bash
npm run worker --prefix Server
```

The worker runs separately from the API. New uploads need an active worker to finish processing.

### 5. Start the Frontend

In a third terminal:

```bash
npm run dev --prefix client
```

Open:

```text
http://localhost:5173
```

The frontend uses `/api/v1`. During local development, Vite forwards API requests to `http://127.0.0.1:8000`.

## Commands

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev --prefix client` | Start the frontend development server |
| `npm run dev --prefix Server` | Start the API with Nodemon |
| `npm run worker --prefix Server` | Start video processing |
| `npm run build --prefix client` | Build the frontend |
| `npm run preview --prefix client` | Preview the frontend build locally |
| `npm start --prefix Server` | Start the API with Node.js |

## Upload Requirements

| Property | Limit |
| --- | --- |
| Video size | 100 MB |
| Thumbnail size | 5 MB |
| Video duration | 10 minutes |
| Title | 120 characters |
| Description | 5,000 characters |

**Video formats:** MP4, WEBM and MOV.

**Image formats:** JPG, JPEG, PNG and WEBP.

The frontend provides basic validation, while the backend validates uploaded files. Video duration is checked during processing.

## API Areas

All route groups use the `/api/v1` prefix.

| Route group | Purpose |
| --- | --- |
| `/healthcheck` | Service health |
| `/users` | Authentication, profiles and watch history |
| `/videos` | Video management and processing |
| `/comments` | Comments |
| `/likes` | Likes |
| `/subscriptions` | Creator subscriptions |
| `/playlist` | Playlists |
| `/tweets` | Community posts |
| `/dashboard` | Creator statistics and videos |

See [the backend README](./Server/README.md) for endpoint details.

## Authentication and Views

Authentication uses access and refresh tokens delivered through HTTP-only cookies. The frontend includes cookies in API requests and attempts session refresh when appropriate.

Protected actions are checked by the backend. Creator actions also require ownership checks.

Unique views are tracked per account and video. Repeated playback from the same account should not repeatedly increase the view count. The counting record is maintained separately from watch history.

Previously accumulated view totals are not automatically recalculated.

## Deployment

The current deployment uses one Render web service for the API and frontend.

### Build Command

```bash
npm ci --prefix Server && npm ci --prefix client --include=dev && npm run build --prefix client
```

### Start Command

```bash
npm start --prefix Server
```

For this configuration:

- Leave the service root directory empty.
- Set `NODE_ENV=production`.
- Configure MongoDB, JWT and Cloudinary values in the hosting environment.
- Ensure the frontend build generates `client/dist`.
- Keep frontend API requests relative to `/api/v1`.

Express serves the frontend build in production, including the fallback needed for client-side page refreshes.

### Current Worker Arrangement

The video worker runs on the developer's laptop and connects to the same database and Cloudinary account as the hosted API.

While processing new uploads:

- Keep the worker running.
- Keep the laptop awake.
- Maintain an internet connection.

When the worker is stopped, new jobs remain pending until a worker starts. Already processed media can still play through Cloudinary.

This deployment does not provide an always-on hosted transcoding worker.

## Verification Checklist

Use these checks after setup or deployment:

- [ ] The health endpoint responds successfully.
- [ ] Registration, login and logout work.
- [ ] Login persists after a page refresh.
- [ ] A new upload moves from pending to ready.
- [ ] Generated qualities play successfully.
- [ ] Quality switching preserves playback position.
- [ ] Repeated playback from one account does not repeatedly increase views.
- [ ] Comments, likes and subscriptions work.
- [ ] Playlists and watch history load correctly.
- [ ] A disposable test video can be deleted from Studio.
- [ ] Temporary processing workspaces are cleaned up.
- [ ] Hosted frontend routes work after refreshing the browser.
- [ ] The interface works on desktop and mobile.

## Troubleshooting

| Issue | What to check |
| --- | --- |
| Local frontend cannot reach the API | Backend process, port and Vite proxy |
| Server reports `EADDRINUSE` | Another process is using the configured port |
| Hosted homepage returns JSON 404 | Production environment and frontend static-file serving |
| Video remains pending | Worker process and database configuration |
| Processing fails | Worker logs, FFmpeg paths and Cloudinary upload results |
| Only one quality appears | Source dimensions and generated variants |
| Upload connection is interrupted | Check Studio before uploading the same video again |
| Temporary cleanup reports `EPERM` | File locks, open streams or Windows sync interference |

## What I Learned

HyperClip helped me connect frontend development with the backend work required to support media uploads and playback.

I worked with authentication cookies, API integration, file validation, remote media storage and database updates. Building the processing worker introduced me to job ownership, interrupted work, retries and cleanup.

On the frontend, I focused on reusable components, responsive layouts and useful feedback during operations that take time. Implementing quality switching also helped me understand browser media events and playback state.

Deploying the application brought these pieces together and showed me how local development differs from a hosted environment.

## Future Improvements

- Move video processing to an always-on hosted worker.
- Add automated integration tests for critical flows.
- Improve processing observability and job diagnostics.
- Explore resumable uploads.
- Explore HLS and adaptive bitrate playback.
- Improve accessibility and keyboard interactions.

These are planned improvements, not claims about the current implementation.

## Author

**Shashank Sharma**

MERN Stack Developer · MCA Student

I enjoy building thoughtful interfaces and learning how the systems behind them work.
