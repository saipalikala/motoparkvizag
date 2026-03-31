/* ================================================
   File: backend/routes/homeDataRoutes.js

   Add to server.js:
     import homeDataRoutes from "./routes/homeDataRoutes.js";
     app.use("/api/home-data", homeDataRoutes);
   ================================================ */
import express from "express";
import { getHomeData } from "../controllers/homeController.js";

const router = express.Router();

router.get("/", getHomeData);

export default router;