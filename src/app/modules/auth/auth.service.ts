import bcrypt from "bcrypt";
import { config } from "../../../config";
import { JwtPayload, Secret } from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import { StringValue } from "ms";
import AppError from "../../errors/appErrors";
import { Status } from "../../../../generated/prisma/enums";
import { jwtGenerator, jwtVerifier } from "../../../utils/jwt";

import { publicUserSelect } from "../../../utils/publicUserSelect";

const getCurrentUser = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email, status: Status.active }, select: publicUserSelect });
    if (!user) throw new AppError(401, "Unauthorized");
    return user;
};

const loginUser = async (payload: { email: string, password: string }) => {
    const isUserExist = await prisma.user.findFirst({
        where: {
            email: { equals: payload.email, mode: "insensitive" },
            status: Status.active
        }
    })

    if (!isUserExist) {
        throw new AppError(401, "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়!")
    }

    const isPasswordMarched = await bcrypt.compare(payload.password, isUserExist.password)

    if (!isPasswordMarched) {
        throw new AppError(401, "ইমেইল অথবা পাসওয়ারড সঠিক নয়!")
    }

    const accessToken = jwtGenerator({
        userInfo: { email: isUserExist.email, role: isUserExist.role },
        createSecretKey: config.jwt.token_secret as Secret,
        expiresIn: config.jwt.token_expires_in as StringValue,
    })

    const refreshToken = jwtGenerator({
        userInfo: { email: isUserExist.email, role: isUserExist.role },
        createSecretKey: config.jwt.refresh_token_secret as Secret,
        expiresIn: config.jwt.refresh_token_expires_in as StringValue,
    })


    return {
        accessToken,
        refreshToken,
        user: {
            email: isUserExist.email,
            role: isUserExist.role,
        }
    }
}


const generateAccessTokenUsingRefreshToken = async (refreshToken: string) => {
    if(!refreshToken) {
        throw new AppError(401, "Unauthorized")
    }

    let decoded;

    try {
        decoded = jwtVerifier({
            token: refreshToken,
            secretKey: config.jwt.refresh_token_secret as Secret,
        }) as JwtPayload;
    } catch (err: any) {
        if (err.name === "TokenExpiredError") {
            throw new AppError(401, "Refresh token expired");
        }
        if (err.name === "JsonWebTokenError") {
            throw new AppError(401, "Invalid refresh token");
        }
        throw new AppError(401, "Unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: {
            email: decoded.email,
            status: Status.active,
        },
    });

    if (!user) {
        throw new AppError(401, "Unauthorized");
    }

    const newAccessToken = jwtGenerator({
        userInfo: { email: user.email, role: user.role },
        createSecretKey: config.jwt.token_secret as Secret,
        expiresIn: config.jwt.token_expires_in as StringValue,
    })

    return {
        accessToken: newAccessToken
    };
}


const logout = async () => {
    return null;
};

export const AuthService = {
    loginUser,
    getCurrentUser,
    logout,
    generateAccessTokenUsingRefreshToken
};
