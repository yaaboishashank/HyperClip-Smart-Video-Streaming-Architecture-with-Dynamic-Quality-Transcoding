const asyncHandler = (requestHandler) => {
  return async (req, res, next) => {
    // Capture only the cleanup available when this handler starts.
    const cleanup = req.cleanupUploads;
    let delegated = false;

    try {
      return await requestHandler(req, res, (...args) => {
        delegated = true;
        return next(...args);
      });
    } catch (error) {
      next(error);
    } finally {
      // Middleware calling next() must not clean another handler's files.
      if (cleanup && !delegated) {
        try {
          await cleanup();
        } catch (error) {
          console.error("Upload cleanup:", error.message);
        }
      }
    }
  };
};

export { asyncHandler };