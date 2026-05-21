/**
 * backend/middleware/multerCarousel.js
 *
 * Two independent multer configurations for the carousel upload routes.
 *
 *  carouselImageUpload  — images only,  max 1 MB,  field: "carousel"
 *  carouselVideoUpload  — videos only,  max 5 MB,  field: "carousel_video"
 *
 * Both store files in  /uploads/carousel/  with a timestamp-based filename.
 */

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEST = path.join(__dirname, "..", "uploads", "carousel");

if (!fs.existsSync(DEST)) {
  fs.mkdirSync(DEST, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DEST),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}${ext}`;
    cb(null, name);
  },
});

export const carouselImageUpload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(
        Object.assign(new Error("Only image files are accepted for carousel images."), {
          code: "WRONG_FILE_TYPE",
          status: 415,
        })
      );
    }
  },
});

export const carouselVideoUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(
        Object.assign(new Error("Only video files are accepted for carousel videos."), {
          code: "WRONG_FILE_TYPE",
          status: 415,
        })
      );
    }
  },
});

/**
 * Wraps a multer middleware so upload errors return structured JSON
 * instead of crashing Express.
 */
export function withMulterErrors(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) return next();

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: err.field === "carousel_video"
            ? "Video exceeds the 5 MB limit."
            : "Image exceeds the 1 MB limit.",
        });
      }
      if (err.code === "WRONG_FILE_TYPE") {
        return res.status(err.status ?? 415).json({
          success: false,
          message: err.message,
        });
      }
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.message });
      }

      next(err);
    });
  };
}