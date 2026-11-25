import express from "express";
import { StatsController } from "./stats.controller";
import { visitRateLimit } from "../../../utils/visitRateLimit";
import { Role } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/auth";

const router = express.Router();

// Public: student counts per district for the Home page map.
router.get("/student-reach", StatsController.studentReach);
// Public: visitor total and Bangladesh / other-country student counts.
router.get("/community", StatsController.community);
// Public: counts a visitor (the frontend sends it once per browser per 30 days).
// Rate-limited per IP in memory only; no IP is stored.
router.post("/visit", visitRateLimit, StatsController.recordVisit);
// Admin: totals and recent activity for the /admin overview page.
router.get("/dashboard", auth(Role.admin), StatsController.dashboard);

export const StatsRoutes = router;
