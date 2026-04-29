// This file is intentionally a thin pass-through to Cloudinary.
// All upload logic lives in backend/config/cloudinary.js.
// Import from there directly — do NOT use this file for new routes.
//
// Kept only for legacy compatibility. Audit all routes that import
// from this file and migrate them to cloudinary.js exports.

import { uploadProducts } from "../config/cloudinary.js";
export default uploadProducts;