const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = Number(error.statusCode || error.status || 500);
  let message = error.message || "Something went wrong";

  if (error.code === 11000) {
    statusCode = 409;
    message = "A record with these details already exists";
  } else if (error.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(error.errors)
      .map((item) => item.message)
      .join(", ");
  } else if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID or field value";
  } else if (error.name === "MulterError") {
    statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;

    message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file is too large"
        : "Invalid upload field or too many files";
  } else if (error.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON request body";
  } else if (error.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  }

  if (
    !Number.isInteger(statusCode) ||
    statusCode < 400 ||
    statusCode > 599
  ) {
    statusCode = 500;
  }

  if (statusCode >= 500) {
    console.error("Request failed:", {
      method: req.method,
      path: req.path,
      statusCode,
      message: error.message,
      stack: error.stack,
    });

    if (error.expose !== true) {
      message = "Something went wrong on the server";
    }
  }

  if (res.destroyed) return;

  return res.status(statusCode).json({
    statusCode,
    data: null,
    success: false,
    message,
    errors:
      statusCode < 500 && Array.isArray(error.errors)
        ? error.errors
        : [],
  });
};

export { errorHandler };