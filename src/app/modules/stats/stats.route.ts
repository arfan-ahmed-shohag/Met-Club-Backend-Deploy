import express from "express";
import { StatsController } from "./stats.controller";

const router = express.Router();

// Public: student counts per district for the Home page map.
router.get("/student-reach", StatsController.studentReach);

export const StatsRoutes = router;
