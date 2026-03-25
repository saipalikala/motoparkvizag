import Navbar from "../models/navbarModel.js";

/* GET NAVBAR */

export const getNavbar = async (req,res)=>{
  try{

    const navbar = await Navbar.findOne();

    res.json(navbar);

  }catch(err){
    res.status(500).json({message:"Server error"});
  }
};


/* UPDATE NAVBAR */

export const updateNavbar = async (req,res)=>{

  try{

    const updated = await Navbar.findOneAndUpdate(
      {},
      req.body,
      { new:true, upsert:true }
    );

    res.json(updated);

  }catch(err){
    res.status(500).json({message:"Update failed"});
  }

};