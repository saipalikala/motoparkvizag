/**
 * backend/middleware/multerCarousel.js
 *
 * Two independent multer configurations for the carousel upload routes.
 *
 *  carouselImageUpload  — images only,  max 1 MB,  field: "carousel"
 *  carouselVideoUpload  — videos only,  max 5 MB,  field: "carousel_video"
 *
 * Both store files in  /uploads/carousel/  with a timestamp-based filename.
 * Both return { url: "/uploads/carousel/<filename>" } via the route handler.
 *
 * Size limits mirror the frontend constants in AdminCarouselManager.jsx:
 *   MAX_IMAGE_MB = 1
 *   MAX_VIDEO_MB = 5
 */

const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

/* ── Shared destination ── */
const DEST = path.join(__dirname, "..", "uploads", "carousel");

/* Ensure the directory exists at startup */
if (!fs.existsSync(DEST)) {
    fs.mkdirSync(DEST, { recursive: true });
}

/* ─── Disk storage (shared config) ─── */
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, DEST),
    filename:    (_req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}${ext}`;
        cb(null, name);
    },
});

/* ════════════════════════════════
   IMAGE UPLOAD CONFIG
   Field : "carousel"
   Accept: image/*  only
   Limit : 1 MB
════════════════════════════════ */
const carouselImageUpload = multer({
    storage,
    limits: { fileSize: 1 * 1024 * 1024 },   // 1 MB — strict
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

/* ════════════════════════════════
   VIDEO UPLOAD CONFIG
   Field : "carousel_video"
   Accept: video/*  only
   Limit : 5 MB
════════════════════════════════ */
const carouselVideoUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },   // 5 MB — strict
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

/* ── Multer error normaliser ── */
/**
 * Wraps a multer middleware so upload errors are forwarded as structured
 * JSON responses rather than crashing Express with an unhandled exception.
 *
 * Usage:
 *   router.post("/upload/carousel", auth, withMulterErrors(carouselImageUpload.single("carousel")), handler)
 */
function withMulterErrors(multerMiddleware) {
    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (!err) return next();

            /* Multer-specific errors */
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

            /* Generic multer error */
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ success: false, message: err.message });
            }

            /* Anything else */
            next(err);
        });
    };
}

module.exports = { carouselImageUpload, carouselVideoUpload, withMulterErrors };