import express from "express";
import Media from "../models/mediaModel.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

/* GET MEDIA */

router.get("/", async (req, res) => {

    const media = await Media.find().sort({ createdAt: -1 });

    res.json(media);

});

/* UPLOAD MEDIA */

router.post("/", upload.single("file"), async (req, res) => {

    const media = await Media.create({
        url: req.file.path
    });

    res.json(media);

});

/* DELETE MEDIA */

router.delete("/:id", async (req, res) => {

    await Media.findByIdAndDelete(req.params.id);

    res.json({ message: "Media deleted" });

});

export default router;