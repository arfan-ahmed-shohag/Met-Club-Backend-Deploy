import express from "express";
import { userController } from "./user.controller";
import { validateRegistrationRequest } from "./user.validation";
import { ProfileRoutes } from "./profile.route";

const router = express.Router();
router.use("/me", ProfileRoutes);

router.post("/", validateRegistrationRequest, userController.createUser);

export const UserRoutes = router;
