# HyperClip — Frontend

The React frontend for HyperClip, a full-stack video-sharing application.

HyperClip brings video playback, creator tools and community interactions into a responsive interface. The design uses a red accent, clear typography and light and dark themes.

## Features

- Account registration and login.
- Video browsing and watch pages.
- Video playback with manual quality selection.
- Playback position preservation during quality changes.
- Video uploads with thumbnail previews.
- Background processing status and retry controls.
- Creator Studio for managing uploaded videos.
- Video editing, publication controls and deletion.
- Channel profiles and subscriptions.
- Comments and likes.
- Playlists and watch history.
- Profile and account settings.
- Light and dark themes.
- Loading states and error feedback.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| React | Component-based interface |
| Vite | Development server and production builds |
| React Router | Client-side navigation |
| Context and custom hooks | Authentication and shared application behavior |
| Fetch API | Backend requests |
| Lucide React | Interface icons |
| CSS | Styling, layout and responsive design |

The frontend is written in JavaScript and JSX.

## Project Structure

| Path | Responsibility |
| --- | --- |
| `src/App.jsx` | Application composition |
| `src/main.jsx` | React entry point |
| `src/components/common/` | Shared buttons, feedback and interface components |
| `src/components/layout/` | Application layout and navigation |
| `src/components/video/` | Video player, cards and playlist controls |
| `src/components/comments/` | Comment interface |
| `src/context/` | Shared application context |
| `src/hooks/` | Authentication, data loading and processing hooks |
| `src/pages/` | Application pages |
| `src/services/` | API request helpers and endpoint services |
| `src/utils/` | Formatting, validation and media helpers |
| `src/styles/` | Application styling |
| `public/` | Public static assets |

## Getting Started

### 1. Prerequisites

- Node.js 22.12 or newer.
- npm.
- The HyperClip backend configured and running for local API access.

### 2. Install Dependencies

From the repository root:

```bash
cd client
npm ci
```

### 3. Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The configured development port is `5173`. With `strictPort` enabled, Vite reports an error if this port is already occupied.

### 4. Start the Backend

Open another terminal from the repository root:

```bash
cd Server
npm run dev
```

The frontend development proxy forwards `/api` requests to:

```text
http://127.0.0.1:8000
```

### 5. Start Video Processing When Needed

To process new uploads, open another terminal:

```bash
cd Server
npm run worker
```

The worker belongs to the backend. The frontend displays processing progress returned by the API.

Without a running worker, newly uploaded videos can remain pending.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create the production build |
| `npm run preview` | Preview the production build locally |

## API Configuration

The application uses the relative API base:

```js
const base = "/api/v1";
```

### Local Development

Vite proxies `/api` requests to the backend.

The default target is:

```text
http://127.0.0.1:8000
```

To use a different local backend address, create `client/.env.local`:

```dotenv
HYPERCLIP_PROXY_TARGET=http://127.0.0.1:8000
```

Restart Vite after changing this value.

### Production

The current deployment serves the frontend and API from the same Express service.

Browser requests to `/api/v1` reach the API on the same domain.

The Vite proxy is used for local development and preview; it is not included as a server in the generated production files.

Never place database credentials, Cloudinary API secrets or JWT signing secrets in frontend code or environment variables exposed to the browser.

## Authentication

Authentication is managed through the backend using HTTP-only cookies.

The shared API helper:

- Includes cookies using `credentials: "include"`.
- Sends JSON or multipart request bodies.
- Handles API and connection errors.
- Attempts session refresh after eligible `401` responses.
- Coordinates concurrent token-refresh requests.
- Notifies the application when the session expires.

HTTP-only authentication cookies are managed by the browser and cannot be read directly by React.

## Video Playback

The video player reads available qualities from the video's `variants` array.

Each variant contains a playback URL and a label such as:

```text
240p
360p
480p
720p
```

The options shown depend on what the backend generated for that video.

### Quality Switching

When changing quality, the player preserves playback state, including the position and whether the video was playing.

Older videos without generated variants can fall back to their original video URL.

The frontend does not generate video qualities. Encoding happens in the backend worker.

Playback uses separate MP4 files with manual quality selection. This implementation does not provide automatic adaptive bitrate streaming.

## Upload Flow

1. Choose a video.
2. Choose a thumbnail.
3. Enter a title and description.
4. Submit the upload.
5. The API saves the media and queues processing.
6. Open Creator Studio to follow the processing status.
7. Play the video after processing completes.

The upload page provides a thumbnail preview and basic client-side validation. The backend also validates uploads.

### Upload Limits

| Field | Limit |
| --- | --- |
| Video | 100 MB |
| Thumbnail | 5 MB |
| Video duration | 10 minutes |
| Title | 120 characters |
| Description | 5,000 characters |

Supported video formats:

```text
MP4, WEBM, MOV
```

Supported thumbnail formats:

```text
JPG, JPEG, PNG, WEBP
```

Video duration is checked during backend processing.

If an upload connection is interrupted, check Creator Studio before submitting again—the backend may already have saved the upload.

## Processing Status

The interface displays the processing state returned by the API.

| Status | Meaning |
| --- | --- |
| `pending` | Waiting for a worker |
| `processing` | Preparing video qualities |
| `ready` | Available for playback |
| `failed` | Processing failed or was interrupted |

Eligible failed jobs can be retried through the application.

The processing hook is located at:

```text
src/hooks/useVideoProcessing.js
```

## Main Application Areas

### Watch Page

Combines video playback with:

- Quality selection.
- Creator information.
- Subscription controls.
- Likes and playlist actions.
- Video description and view count.
- Comments.
- Recommended videos.

### Creator Studio

Provides access to uploaded videos, processing status and video management actions.

### Channels

Displays creator profiles and their available content.

### Playlists and History

Helps users organize videos and revisit previously watched content.

### Account Settings

Provides account and profile management controls.

## Build and Preview

Create a production build:

```bash
npm run build
```

Generated files are written to:

```text
client/dist/
```

Preview the build locally:

```bash
npm run preview
```

The configured preview server uses port `5173`, so stop the development server first if it is already using that port.

For API requests during local preview, keep the backend running.

## Current Deployment

The project uses one Render web service to serve:

- The Express API.
- The compiled React frontend.

Build command from the repository root:

```bash
npm ci --prefix Server && npm ci --prefix client --include=dev && npm run build --prefix client
```

Start command:

```bash
npm start --prefix Server
```

The backend must use:

```dotenv
NODE_ENV=production
```

Its production configuration serves `client/dist` and returns the frontend entry page for application routes.

This allows direct links and browser refreshes on frontend pages to work.

### Background Worker

In the current demo setup, video processing runs on the developer's laptop.

The worker must use the same database and Cloudinary account as the hosted API.

The hosted frontend remains separate from the laptop's development server. Already processed videos do not require the laptop worker for playback.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `ECONNREFUSED` in the Vite terminal | Backend startup, port and proxy target |
| Login fails | API response, cookies and backend configuration |
| Upload connection is interrupted | Check Studio before retrying, then inspect backend logs |
| Video remains pending | Whether the backend worker is running |
| Only one quality appears | Generated variants and source dimensions |
| A quality does not play | Its media URL and browser network errors |
| Hosted homepage returns JSON 404 | Backend production static-file serving |
| Refreshing a hosted page returns 404 | Frontend route fallback in the hosting server |
| Port `5173` is unavailable | Another development or preview server may be running |

## Verification Checklist

- [ ] `npm run build` completes successfully.
- [ ] Registration and login work.
- [ ] Login persists after refreshing the page.
- [ ] Logout clears the session.
- [ ] Video browsing and playback work.
- [ ] Quality switching preserves playback position.
- [ ] Upload validation displays helpful feedback.
- [ ] Processing status updates in the interface.
- [ ] Eligible failed jobs can be retried.
- [ ] A disposable video can be deleted from Studio.
- [ ] Comments, likes and subscriptions work.
- [ ] Playlists and watch history load correctly.
- [ ] Light and dark themes display correctly.
- [ ] Layouts work on desktop and mobile.
- [ ] Direct links and page refreshes work after deployment.

## What I Learned

Building HyperClip helped me connect a React interface to a backend with authentication, file uploads and background processing.

I worked on reusable components, API integration, custom hooks and handling loading and error states. The video player also gave me experience with browser media events and preserving playback state when switching sources.

I enjoy building frontend interfaces, and this project helped me think beyond appearance: how users understand progress, recover from errors and move through an application.

## Author

**Shashank Sharma**

MERN Stack Developer · MCA Student

Interested in building thoughtful interfaces and practical full-stack applications.
