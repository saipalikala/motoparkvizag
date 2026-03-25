import express from "express";
import StoreConfig from "../models/storeConfigModel.js";

const router = express.Router();

// GET config
router.get("/", async (req, res) => {
    let config = await StoreConfig.findOne();

    if (!config) {
        config = await StoreConfig.create({});
    }

    res.json(config);
});

// UPDATE config
router.put("/", async (req, res) => {
    let config = await StoreConfig.findOne();

    if (!config) {
        config = new StoreConfig(req.body);
    } else {
        Object.assign(config, req.body);
    }

    await config.save();

    res.json(config);
});

export default router;