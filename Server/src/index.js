import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./db/index.js";
import { app } from "./app.js";

const startServer = async () => {
  const required = [
    "MONGODB_URI",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const missing = required.filter(
    (key) => !process.env[key]?.trim()
  );

  if (missing.length) {
    throw new Error(
      "Missing environment variables: " + missing.join(", ")
    );
  }

  const port = Number(process.env.PORT || 8000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      "PORT must be a number between 1 and 65535"
    );
  }

  await connectDB();

  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init())
  );

  const server = app.listen(port);

  // Time allowed to receive a complete incoming request.
  server.requestTimeout = 10 * 60 * 1000;
  server.headersTimeout = 60 * 1000;

  // Maximum socket inactivity while processing a request.
  server.setTimeout(10 * 60 * 1000);

  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error);

    server.once("error", onError);

    server.once("listening", () => {
      server.off("error", onError);
      resolve();
    });
  });

  server.on("error", (error) => {
    console.error("HTTP server error:", error.message);
  });

  console.log("Server is running on port:", port);
};

startServer().catch(async (error) => {
  console.error(
    "Server startup failed:",
    error.code === "EADDRINUSE"
      ? "Port is already in use. Stop the other server first."
      : error.message
  );

  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});