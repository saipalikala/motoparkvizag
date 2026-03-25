import mongoose from "mongoose";

const carouselSchema = new mongoose.Schema({

title:String,
subtitle:String,
image:String,
route:String

},{timestamps:true});

export default mongoose.model("Carousel",carouselSchema);