import express from "express";
import Collection from "../models/collectionModel.js";

const router = express.Router();

/* GET COLLECTIONS */

router.get("/", async (req, res) => {

    const collections = await Collection
        .find()
        .populate("products");

    res.json(collections);

});
/* CREATE COLLECTION */

router.post("/", async (req, res) => {

    const { name, slug } = req.body;

    const collection = await Collection.create({
        name,
        slug
    });

    res.json(collection);

});

/* UPDATE COLLECTION */

router.put("/:id", async (req, res) => {

    const updated = await Collection.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    res.json(updated);

});

/* DELETE COLLECTION */

router.delete("/:id", async (req, res) => {

    await Collection.findByIdAndDelete(req.params.id);

    res.json({ message: "Collection deleted" });

});

export default router;