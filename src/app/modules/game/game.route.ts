import express from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../../../generated/prisma/enums";
import { GameController } from "./game.controller";

const router = express.Router();

// Public: top players for the game's leaderboard screen.
router.get("/leaderboard", GameController.leaderboard);
// Students only: records the first finished game.
router.patch("/score", auth(Role.student), GameController.submitScore);

export const GameRoutes = router;
