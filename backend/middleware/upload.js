import multer from "multer";
import path from "path";
import fs from "fs";

/* ===============================
ENSURE UPLOAD FOLDER EXISTS
=============================== */

const uploadDir = "uploads/products";

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/* ===============================
STORAGE CONFIG
=============================== */

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() + "-" + file.originalname.replace(/\s+/g, "-");

        cb(null, uniqueName);

    }

});

/* ===============================
FILE FILTER
=============================== */

const fileFilter = (req, file, cb) => {

    const allowedTypes = /jpg|jpeg|png|webp/;

    const ext = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
    );

    if (ext) {
        cb(null, true);
    } else {
        cb(new Error("Only images are allowed"));
    }

};

/* ===============================
UPLOAD INSTANCE
=============================== */

const upload = multer({
    storage,
    fileFilter
});

export default upload;