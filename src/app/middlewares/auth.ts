import type { NextFunction, Request, Response } from "express";
import { config } from "../../config";
import { prisma } from "../../lib/prisma";
import type { JwtPayload, Secret } from "jsonwebtoken";
import AppError from "../errors/appErrors";
import { jwtVerifier } from "../../utils/jwt";
import { Status } from "../../../generated/prisma/enums";

const auth = (...roles: string[]) => {
    return async (req: Request & { user?: JwtPayload }, _res: Response, next: NextFunction) => {
        try {
            const bearer = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i);
            if (!bearer) throw new AppError(401, "Unauthorized");
            let decoded: JwtPayload;
            try {
                decoded = jwtVerifier({ token: bearer[1]!, secretKey: config.jwt.token_secret as Secret }) as JwtPayload;
            } catch (error) {
                throw new AppError(401, error instanceof Error && error.name === "TokenExpiredError" ? "Access token expired" : "Invalid access token");
            }
            if (typeof decoded.email !== "string") throw new AppError(401, "Unauthorized");
            const user = await prisma.user.findUnique({
                where: { email: decoded.email, status: Status.active },
                select: { id: true, email: true, role: true },
            });
            if (!user) throw new AppError(401, "Unauthorized");
            if (roles.length && !roles.includes(user.role)) throw new AppError(403, "এই কাজটি সম্পাদনের জন্য আপনার অনুমতি নেই");
            req.user = { ...decoded, email: user.email, role: user.role };
            next();
        } catch (error) { next(error); }
    };
};

export default auth;
