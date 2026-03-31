import Offer from "../models/Offer.js";
import { clearHomeCache } from "./homeController.js";

export const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ active: true });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createOffer = async (req, res) => {
  try {
    const newOffer = new Offer(req.body);
    const savedOffer = await newOffer.save();
    clearHomeCache();
    res.status(201).json(savedOffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    clearHomeCache();
    res.json({ message: "Offer deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};