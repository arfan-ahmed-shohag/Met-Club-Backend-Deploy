import type { CookieOptions } from "express";
import { config } from "../config";

export const authCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: config.node_env === "production",
    sameSite: "lax",
    path: "/",
};
