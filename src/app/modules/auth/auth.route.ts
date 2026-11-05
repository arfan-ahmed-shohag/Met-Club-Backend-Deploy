import express from "express";
import { AuthController } from "./auth.controller";

import auth from "../../middlewares/auth";
import { validateLoginRequest } from "../user/user.validation";

import { changePassword } from "../user/profile.route";

const router = express.Router();
router.patch("/change-password", auth(), changePassword);

router.post("/login", validateLoginRequest, AuthController.login);
router.get("/me", auth(), AuthController.me);
router.get('/logout', AuthController.logout);
router.get('/refresh-token', AuthController.generateAccessTokenUsingRefreshToken);

export const AuthRoutes = router;
