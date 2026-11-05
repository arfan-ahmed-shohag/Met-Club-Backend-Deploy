import express from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import auth from "../../middlewares/auth";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";
import AppError from "../../errors/appErrors";
import RequestValidationError from "../../errors/requestValidationError";
import { updateProfile, updateProfilePhoto, updatePassword } from "./profile.service";

type UserRequest = Request & { user?: { email?: string } };
function email(req: UserRequest) {
    if (!req.user?.email) throw new AppError(401, "Unauthorized");
    return req.user.email;
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0, parts: 2 } }).single("photo");
function uploadPhoto(req: Request, res: Response, next: NextFunction) {
    upload(req, res, (error: unknown) => {
        if (error instanceof multer.MulterError) return next(new RequestValidationError({ photo: error.code === "LIMIT_FILE_SIZE" ? "ছবির আকার সর্বোচ্চ ২ MB হতে পারবে" : "একটি JPG, PNG অথবা WebP ছবি নির্বাচন করুন" }));
        next(error);
    });
}

const router = express.Router();
router.use(auth());
router.patch("/", catchAsync(async (req: UserRequest, res: Response) => {
    const result = await updateProfile(email(req), req.body);
    sendResponse(res, { statusCode: 200, message: "Profile updated successfully!", data: result });
}));
router.patch("/photo", uploadPhoto, catchAsync(async (req: UserRequest, res: Response) => {
    const result = await updateProfilePhoto(email(req), req.file);
    sendResponse(res, { statusCode: 200, message: "Profile photo updated successfully!", data: result });
}));

export const changePassword = catchAsync(async (req: UserRequest, res: Response) => {
    const result = await updatePassword(email(req), req.body);
    sendResponse(res, { statusCode: 200, message: "Password updated successfully!", data: result });
});
export const ProfileRoutes = router;
