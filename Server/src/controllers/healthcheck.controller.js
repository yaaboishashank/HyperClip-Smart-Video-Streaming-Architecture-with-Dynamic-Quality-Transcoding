import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";

const healthcheck = (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;
    const statusCode = isConnected ? 200 : 503;

    return res.status(statusCode).json(
        new ApiResponse(
            statusCode,
            {
                app: "HyperClip",
                database: isConnected ? "connected" : "disconnected",
            },
            isConnected
                ? "Backend is running"
                : "Database connection unavailable"
        )
    );
};

export { healthcheck };