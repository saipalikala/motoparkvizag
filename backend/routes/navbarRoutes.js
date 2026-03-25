import express from "express";
import Navbar from "../models/navbarModel.js";

const router = express.Router();

/* GET NAVBAR */

router.get("/", async (req,res)=>{

  const navbar = await Navbar.findOne();
  res.json(navbar);

});


/* CREATE NAVBAR */

router.post("/", async (req,res)=>{

  const navbar = new Navbar(req.body);
  await navbar.save();

  res.json(navbar);

});


/* UPDATE NAVBAR */

router.put("/", async (req,res)=>{

  const navbar = await Navbar.findOneAndUpdate(
    {},
    req.body,
    { new:true, upsert:true }
  );

  res.json(navbar);

});

export default router;