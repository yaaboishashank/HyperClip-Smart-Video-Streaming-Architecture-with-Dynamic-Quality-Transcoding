import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ApiError } from "../utils/ApiError.js";
import { removeLocalFile } from "../utils/cloudinary.js";

const IMAGE_LIMIT = 5 * 1024 * 1024;
const VIDEO_LIMIT = 100 * 1000 * 1000;

// Avoid storing active uploads inside the OneDrive project folder.
const tempDirectory = path.join(tmpdir(), "hyperclip-uploads");

mkdirSync(tempDirectory, { recursive: true });

const imageTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const videoTypes = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

const storage = multer.diskStorage({
  destination: tempDirectory,

  filename(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const createUploader = (hasVideo) =>
  multer({
    storage,

    limits: {
      fileSize: hasVideo ? VIDEO_LIMIT : IMAGE_LIMIT,
      files: 2,
      fields: 10,
      fieldSize: 16 * 1024,
    },

    fileFilter(req, file, callback) {
      const isVideo = file.fieldname === "videoFile";
      const allowedTypes = isVideo ? videoTypes : imageTypes;
      const extension = path.extname(file.originalname).toLowerCase();

      if (allowedTypes[extension] !== file.mimetype) {
        return callback(
          new ApiError(
            400,
            isVideo
              ? "Upload an MP4, WEBM or MOV video."
              : "Upload a JPG, PNG or WEBP image."
          )
        );
      }

      callback(null, true);
    },
  });

function getFiles(req) {
  return [
    ...(req.file ? [req.file] : []),
    ...Object.values(req.files || {}).flat(),
  ];
}

const withCleanup = (middleware) => (req, res, next) => {
  middleware(req, res, (error) => {
    const files = getFiles(req);
    let cleanupPromise;

    req.cleanupUploads = () => {
      if (!cleanupPromise) {
        cleanupPromise = Promise.all(
          files.map((file) => removeLocalFile(file.path))
        );
      }

      return cleanupPromise;
    };

    if (error) {
      void req.cleanupUploads();
      return next(error);
    }

    // Do not start a controller for an already disconnected client.
    if (req.aborted || res.destroyed) {
      void req.cleanupUploads();
      return;
    }

    const oversizedImage = files.some(
      (file) =>
        file.fieldname !== "videoFile" &&
        file.size > IMAGE_LIMIT
    );

    if (oversizedImage) {
      void req.cleanupUploads();

      return next(
        new ApiError(413, "Each image must be 5 MB or smaller.")
      );
    }

    // asyncHandler cleans these files when the controller settles.
    // Do not delete them on response "close" during an active upload.
    next();
  });
};

export const upload = {
  single(fieldName) {
    return withCleanup(
      createUploader(fieldName === "videoFile").single(fieldName)
    );
  },

  fields(fields) {
    const hasVideo = fields.some(
      (field) => field.name === "videoFile"
    );

    return withCleanup(createUploader(hasVideo).fields(fields));
  },
};