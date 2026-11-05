import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { config } from "../../../config";
import { prisma } from "../../../lib/prisma";
import { publicUserSelect } from "../../../utils/publicUserSelect";
import AppError from "../../errors/appErrors";
import RequestValidationError from "../../errors/requestValidationError";
import { parsePasswordChange, parseProfileUpdate, validateProfileAddress } from "./profile.validation";

const currentUser = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email, status: "active" }, select: publicUserSelect });
    if (!user) throw new AppError(401, "Unauthorized");
    return user;
};

export async function updateProfile(email: string, input: unknown) {
    const update = parseProfileUpdate(input);
    const user = await currentUser(email);
    if (["division", "district", "thana"].some((field) => Object.hasOwn(update, field))) validateProfileAddress({ ...user, ...update });
    return prisma.user.update({ where: { id: user.id, status: "active" }, data: update, select: publicUserSelect });
}

function imageExtension(buffer: Buffer, mime: string) {
    if (mime === "image/png" && buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.toString("ascii", 12, 16) === "IHDR") return "png";
    if (mime === "image/jpeg" && buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217) return "jpg";
    if (mime === "image/webp" && buffer.length >= 16 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
    throw new RequestValidationError({ photo: "সঠিক JPG, PNG অথবা WebP ছবি নির্বাচন করুন" });
}

export async function updateProfilePhoto(email: string, file?: { buffer: Buffer; mimetype: string }) {
    if (!file?.buffer.length || file.buffer.length > 2 * 1024 * 1024) throw new RequestValidationError({ photo: "সর্বোচ্চ ২ MB এর একটি ছবি নির্বাচন করুন" });
    const extension = imageExtension(file.buffer, file.mimetype);
    const user = await currentUser(email);
    const directory = path.join(process.cwd(), "uploads", "profiles");
    const filename = `${randomUUID()}.${extension}`;
    await mkdir(directory, { recursive: true });
    const filePath = path.join(directory, filename);
    await writeFile(filePath, file.buffer, { flag: "wx" });
    let result;
    try {
        result = await prisma.user.update({ where: { id: user.id, status: "active" }, data: { profileImg: `/uploads/profiles/${filename}` }, select: publicUserSelect });
    } catch (error) {
        await unlink(filePath).catch(() => {});
        throw error;
    }
    // Delete only avatar files created by this endpoint, never arbitrary URLs or paths.
    if (user.profileImg && /^\/uploads\/profiles\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(user.profileImg)) {
        await unlink(path.join(directory, path.basename(user.profileImg))).catch(() => {});
    }
    return result;
}

export async function updatePassword(email: string, input: unknown) {
    const values = parsePasswordChange(input);
    const user = await prisma.user.findUnique({ where: { email, status: "active" }, select: { id: true, password: true } });
    if (!user) throw new AppError(401, "Unauthorized");
    if (!await bcrypt.compare(values.currentPassword, user.password)) throw new RequestValidationError({ currentPassword: "বর্তমান পাসওয়ার্ড সঠিক নয়" });
    if (await bcrypt.compare(values.newPassword, user.password)) throw new RequestValidationError({ newPassword: "নতুন পাসওয়ার্ড বর্তমান পাসওয়ার্ড থেকে আলাদা হতে হবে" });
    const password = await bcrypt.hash(values.newPassword, Number(config.salt_rounds));
    const result = await prisma.user.updateMany({ where: { id: user.id, status: "active", password: user.password }, data: { password } });
    if (!result.count) throw new RequestValidationError({ currentPassword: "পাসওয়ার্ড পরিবর্তিত হয়েছে। আবার চেষ্টা করুন" }, 409);
    return null;
}
