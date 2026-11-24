import type { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";
import AppError from "../../errors/appErrors";
import { GameService } from "./game.service";

const leaderboard = catchAsync(async (_req: Request, res: Response) => {
  const data = await GameService.getLeaderboard();
  sendResponse(res, {
    statusCode: 200,
    message: "Leaderboard retrieved successfully!",
    data,
  });
});

const submitScore = catchAsync(
  async (req: Request & { user?: { email?: string } }, res: Response) => {
    if (!req.user?.email) throw new AppError(401, "Unauthorized");
    const data = await GameService.submitScore(req.user.email, req.body);
    sendResponse(res, {
      statusCode: data.recorded ? 201 : 200,
      message: data.recorded
        ? "Game score recorded successfully!"
        : "Your first game score is already recorded.",
      data,
    });
  },
);

export const GameController = { leaderboard, submitScore };
