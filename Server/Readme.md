HyperClip — Backend

The API and video processing service behind HyperClip, a full-stack video sharing application built with the MERN stack.

This backend handles authentication, uploads, video metadata, social interactions and creator tools. A separate Node.js worker processes uploaded videos into MP4 quality variants using FFmpeg.

Features

JWT authentication with access and refresh tokens, HTTP-only cookies and bcrypt password hashing.

User profiles, avatars, cover images and channel subscriptions.

Video upload, editing, publishing and deletion.

Background video transcoding with processing status and manual retry.

Multiple MP4 quality variants for manual playback quality selection.

Comments, likes, playlists and community posts.

Watch history and account-based unique view tracking.

Creator dashboard APIs.

Temporary-file cleanup and Cloudinary media cleanup utilities.

Technology

Purpose

Technology

Runtime

Node.js with ES modules

HTTP API

Express

Database

MongoDB and Mongoose

Authentication

JSON Web Tokens, bcrypt, cookie-parser

Upload handling

Multer

Media storage

Cloudinary

Media inspection

FFprobe

Video encoding

FFmpeg

Development reload

Nodemon

Project structure

The repository contains client/ and Server/. Keep the capital S in deployment commands on Linux.

Path inside Server/

Responsibility

src/index.js

Environment validation, database connection and HTTP startup

src/app.js

Middleware, API routes, errors and production frontend serving

src/db/

Database connection

src/models/

Mongoose schemas

src/controllers/

Request handlers

src/routes/

API route definitions

src/middlewares/

Authentication, uploads and error handling

src/services/transcoding.service.js

FFprobe inspection and FFmpeg encoding

src/services/media-files.service.js

Media downloads and temporary workspaces

src/workers/video.worker.js

Background processing loop

src/utils/cloudinary.js

Remote upload and cleanup helpers

Local setup

1. Prerequisites

Node.js 22.12 or newer for the full repository.

A MongoDB connection. Use Atlas or a replica set for operations that use transactions.

A Cloudinary account.

FFmpeg and FFprobe available to the worker through PATH or explicit environment paths.

2. Install dependencies

From the repository root:

cd Server
npm ci

3. Configure environment variables

Create Server/.env. Replace the placeholders with your own values; do not commit this file.

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

Use different random values for the two token secrets. Generate each locally with:

node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"

If the executables are not on your Windows PATH, provide their actual locations, for example:

FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe
FFPROBE_PATH=C:/ffmpeg/bin/ffprobe.exe

Verify that these paths exist on your computer. Windows paths must not be copied to a Linux deployment.

4. Start the API

In a terminal inside Server/:

npm run dev

Health check:

http://localhost:8000/api/v1/healthcheck

5. Start the worker

Open a second terminal inside Server/:

npm run worker

The API and worker are separate processes. Starting the API does not automatically start video processing.

Scripts

Command

Purpose

npm run dev

Start the API with Nodemon

npm start

Start the API with Node.js

npm run worker

Start the background video worker

Video processing flow

The API receives the video and thumbnail, uploads media to Cloudinary and creates a pending video record.

The worker atomically claims a pending record using a processing token and lease.

It downloads the original into a temporary workspace and inspects it with FFprobe.

FFmpeg generates the configured MP4 variants using H.264 video and AAC audio.

The worker uploads the variants and saves their URLs and dimensions in MongoDB.

Successful processing marks the video as ready. Failed jobs expose a status that can be retried through the application.

Local workspaces are cleaned up after processing; planned remote asset IDs support cleanup after interrupted jobs.

Processing states: pending, processing, ready, failed.

Quality options depend on the source dimensions and the profiles configured in transcoding.service.js. For example, the tested 848 × 480 source generated 240p, 360p and 480p variants. Smaller sources should not be expected to produce genuine HD detail.

The player switches between separate MP4 files manually. This pipeline does not implement HLS or automatic adaptive bitrate streaming.

Upload limits

Video: up to 100 MB.

Thumbnail: up to 5 MB.

Video duration: up to 10 minutes, checked during processing.

Accepted video formats: MP4, WEBM and MOV.

Accepted image formats: JPG, JPEG, PNG and WEBP.

API overview

Base path: /api/v1.

Route group

Purpose

/healthcheck

Service and database health

/users

Authentication, profiles, channels and watch history

/videos

Video management and processing status

/comments

Comments

/likes

Likes

/subscriptions

Channel subscriptions

/playlist

Playlists

/tweets

Community posts

/dashboard

Creator statistics and videos

Selected endpoints

Method

Endpoint

Purpose

POST

/users/register

Register an account

POST

/users/login

Log in

POST

/users/logout

Log out

POST

/users/refresh-token

Refresh the session

GET

/users/current-user

Retrieve the authenticated user

GET

/users/history

Retrieve watch history

POST

/users/history/:videoId

Record playback and unique-account views

GET

/videos

List videos

POST

/videos

Upload video and thumbnail

GET

/videos/:videoId

Retrieve a video

PATCH

/videos/:videoId

Update a video

DELETE

/videos/:videoId

Delete a video

GET

/videos/:videoId/status

Retrieve processing status

POST

/videos/:videoId/retry

Retry eligible failed processing

PATCH

/videos/toggle/publish/:videoId

Toggle publication

Send media uploads as multipart/form-data. Video uploads use videoFile, thumbnail, title and description. Authenticated browser requests include cookies with credentials: "include".

Route middleware and controllers define authentication and ownership requirements. View deduplication belongs to the backend; changing quality or repeatedly watching from the same account should not add another unique view. Existing historical view totals are not automatically recalculated.

Current deployment layout

The deployment uses one Render web service for the Express API and the compiled React frontend. Both use the same origin, and the frontend calls /api/v1.

From the repository root, the configured build command is:

npm ci --prefix Server && npm ci --prefix client --include=dev && npm run build --prefix client

Start command:

npm start --prefix Server

Keep the service root directory empty for these commands. Set NODE_ENV=production and configure database, token and Cloudinary values in the hosting environment. Production frontend serving requires the generated client/dist directory.

Worker in the demo setup

The current setup runs the FFmpeg worker on the developer's laptop. It must connect to the same MongoDB database and Cloudinary account as the deployed API.

Keep npm run worker running while processing new uploads.

Keep the laptop awake and connected to the internet.

If no worker is running, new jobs remain pending.

Already processed videos remain available from Cloudinary without the laptop worker.

The local frontend and local API do not need to run for the hosted application to use this worker.

This is a demo deployment arrangement, not an always-on hosted transcoding service.

Troubleshooting

Symptom

Check

EADDRINUSE at startup

Another process is already listening on the configured port.

Frontend proxy shows ECONNREFUSED

Start the local API and verify the proxy target and port.

Hosted root URL returns JSON 404

Check NODE_ENV=production, frontend build output and static-file serving in app.js.

Video remains pending

Check that a worker is running against the same database.

FFmpeg or FFprobe cannot start

Check executable installation and paths in the worker environment.

Only one quality is available

Inspect source dimensions, generated profiles and stored variants.

Cloudinary upload fails

Check worker/API logs, credentials, connectivity and account limits.

Temporary cleanup reports EPERM

Check file locks, open streams and sync/antivirus interference on Windows.

Verification checklist

Health endpoint responds successfully.

Login survives a page refresh; logout clears the session.

A new upload moves from pending to ready while the worker runs.

Generated qualities play and switching preserves the playback position.

Repeated playback from one account does not repeatedly increase unique views.

A disposable test video can be deleted from Studio.

Temporary workspaces are removed after processing.

Refreshing a frontend route on the hosted site loads the application.

Author

Built by Shashank Sharma as a full-stack project exploring authentication, media handling, background processing and deployment.
