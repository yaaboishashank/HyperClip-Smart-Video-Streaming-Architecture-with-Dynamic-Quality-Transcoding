import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { ApiError } from "./utils/ApiError.js";
import { errorHandler } from "./middlewares/error.middleware.js";

import userRouter from "./routes/user.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

const configuredOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (configuredOrigins.includes("*")) {
  throw new Error("CORS_ORIGIN must contain specific website URLs.");
}

const allowedOrigins = new Set(
  configuredOrigins.map((origin) => new URL(origin).origin)
);

// Render supplies this variable for its public web service URL.
if (process.env.RENDER_EXTERNAL_URL) {
  allowedOrigins.add(
    new URL(process.env.RENDER_EXTERNAL_URL).origin
  );
}

app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(
        new ApiError(403, "Origin is not allowed")
      );
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);
app.use(cookieParser());

app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

// Unknown API requests must return JSON, not the React page.
app.use("/api", (req, res) => {
  return res.status(404).json({
    statusCode: 404,
    data: null,
    success: false,
    message: "API route not found",
    errors: [],
  });
});

if (isProduction) {
  const clientDirectory = fileURLToPath(
    new URL("../../client/dist/", import.meta.url)
  );

  const indexFile = path.join(clientDirectory, "index.html");

  if (!existsSync(indexFile)) {
    throw new Error(
      "Frontend build missing. Build the client before starting production."
    );
  }

  app.use(express.static(clientDirectory));

  // Missing build assets should return 404.
  app.use("/assets", (req, res) => {
    res.status(404).end();
  });

  // Support refreshing React routes such as /watch/:videoId.
  app.get("*", (req, res, next) => {
    if (!req.accepts("html")) {
      return next();
    }

    res.set("Cache-Control", "no-cache");

    return res.sendFile(indexFile, (error) => {
      if (error) next(error);
    });
  });
}

app.use((req, res) => {
  return res.status(404).json({
    statusCode: 404,
    data: null,
    success: false,
    message: "Route not found",
    errors: [],
  });
});

app.use(errorHandler);

export { app };