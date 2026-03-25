import express from "express";
import Carousel from "../models/carouselModel.js";

const router = express.Router();


/* GET ALL SLIDES */

router.get("/", async(req,res)=>{

const slides = await Carousel.find();

res.json(slides);

});


/* CREATE SLIDE */

router.post("/", async(req,res)=>{

const slide = new Carousel(req.body);

await slide.save();

res.json(slide);

});


/* UPDATE SLIDE */

router.put("/:id", async(req,res)=>{

const updated = await Carousel.findByIdAndUpdate(
req.params.id,
req.body,
{new:true}
);

res.json(updated);

});


/* DELETE SLIDE */

router.delete("/:id", async(req,res)=>{

await Carousel.findByIdAndDelete(req.params.id);

res.json({message:"Slide deleted"});

});

export default router;