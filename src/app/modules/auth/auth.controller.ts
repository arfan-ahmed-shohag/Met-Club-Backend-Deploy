import { Request, Response } from "express";
import { authCookieOptions } from "../../../utils/authCookies";
import AppError from "../../errors/appErrors";
import { AuthService } from "./auth.service";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";


const login = catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await AuthService.loginUser({ email, password });
    res.cookie("refreshToken", result.refreshToken, authCookieOptions);
    sendResponse(res, {
        statusCode: 200,
        message: "User logged in successfully!",
        data: {
            accessToken: result.accessToken,
            user: result.user,
        },

    })
});

const generateAccessTokenUsingRefreshToken = catchAsync(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    const result = await AuthService.generateAccessTokenUsingRefreshToken(refreshToken);
    sendResponse(res, {
        statusCode: 200,
        message: "Access token generated successfully!",
        data: result,
    })
})

const logout = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.logout();

    res.clearCookie("refreshToken", authCookieOptions);
    res.clearCookie("token", authCookieOptions);

    sendResponse(res, {
        statusCode: 200,
        message: "Logout successfully!",
        data: result,

    })
});

const me = catchAsync(async (req: Request & { user?: { email?: string } }, res: Response) => {
    if (!req.user?.email) throw new AppError(401, "Unauthorized");
    const user = await AuthService.getCurrentUser(req.user.email);
    sendResponse(res, { statusCode: 200, message: "User profile retrieved successfully!", data: user });
});

export const AuthController = {
    me,
    login,
    logout,
    generateAccessTokenUsingRefreshToken
};
