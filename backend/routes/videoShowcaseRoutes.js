/* ================================================
   backend/routes/videoShowcaseRoutes.js

   Register in server.js:
     import videoShowcaseRoutes from "./routes/videoShowcaseRoutes.js";
     app.use("/api/video-showcase", videoShowcaseRoutes);
   ================================================ */
import express from "express";
import VideoShowcaseConfig from "../models/videoShowcaseModel.js";

const router = express.Router();

/* ── GET — load slides ── */
router.get("/", async (req, res) => {
    try {
        const config = await VideoShowcaseConfig.findOne();
        res.json(config ? config.slides : []);
    } catch (err) {
        res.status(500).json({ message: "Failed to load video showcase config", error: err.message });
    }
});

/* ── POST — save slides ── */
router.post("/", async (req, res) => {
    try {
        const slides = req.body;
        if (!Array.isArray(slides)) {
            return res.status(400).json({ message: "Expected array of slides" });
        }

        const config = await VideoShowcaseConfig.findOneAndUpdate(
            {},
            { slides },
            { returnDocument: "after", upsert: true }
        );

        res.json({ ok: true, count: config.slides.length });
    } catch (err) {
        res.status(500).json({ message: "Failed to save video showcase config", error: err.message });
    }
});

export default router;