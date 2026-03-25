import express from "express";
import Category from "../models/categoryModel.js";

const router = express.Router();

/* GET ALL */

router.get("/", async (req, res) => {

    const categories = await Category.find().sort({ name: 1 });

    res.json(categories);

});

/* CREATE */

router.post("/", async (req, res) => {

    const { name, image, description } = req.body;

    const slug = name.toLowerCase().replaceAll(" ", "-");

    const category = await Category.create({
        name,
        slug,
        image,
        description
    });

    res.json(category);

});

/* UPDATE */

router.put("/:id", async (req, res) => {

    const updated = await Category.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    res.json(updated);

});

/* DELETE */

router.delete("/:id", async (req, res) => {

    await Category.findByIdAndDelete(req.params.id);

    res.json({ message: "Category deleted" });

});

export default router;