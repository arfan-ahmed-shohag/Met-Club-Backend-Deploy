import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";
import { UserService } from "./user.service";
import { authCookieOptions } from "../../../utils/authCookies";

const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.createUser(req.body);

  const { refreshToken, ...user } = result;
  res.cookie("refreshToken", refreshToken, authCookieOptions);

  sendResponse(res, {
    statusCode: 201,
    message: "User created successfully!",
    data: user,
  });
});

export const userController = {
  createUser,
};
