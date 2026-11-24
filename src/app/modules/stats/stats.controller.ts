import type { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";
import { StatsService } from "./stats.service";

const studentReach = catchAsync(async (_req: Request, res: Response) => {
  const data = await StatsService.getStudentReach();
  sendResponse(res, {
    statusCode: 200,
    message: "Student reach retrieved successfully!",
    data,
  });
});

export const StatsController = { studentReach };
