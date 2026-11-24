import { Role } from "../../../../generated/prisma/client";
import bcrypt from "bcrypt";
import { config } from "../../../config";
import { prisma } from "../../../lib/prisma";
import { IUser } from "../../../types";
import { jwtGenerator } from "../../../utils/jwt";
import { Secret } from "jsonwebtoken";
import { StringValue } from "ms";
import {
  publicUserSelect,
  toPublicUser,
} from "../../../utils/publicUserSelect";
import RequestValidationError from "../../errors/requestValidationError";

const generateStudentId = async () => {
  const lastStudent = await prisma.student.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      studentId: true,
    },
  });

  let nextNumber = 1;

  if (lastStudent?.studentId) {
    const lastNumber = parseInt(lastStudent.studentId.split("-").pop() || "0");
    nextNumber = lastNumber + 1;
  }

  return `Met-Club-${nextNumber}`;
};

// Registration always creates a student: a login account plus its Student profile.
const createUser = async (payload: IUser) => {
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: payload.email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingUser)
    throw new RequestValidationError(
      { email: "এই ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট আছে" },
      409,
    );
  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.salt_rounds),
  );
  const created = await prisma.user.create({
    data: {
      email: payload.email,
      password: hashedPassword,
      role: Role.student,
      student: {
        create: {
          studentId: await generateStudentId(),
          fullName: payload.fullName,
          institution: payload.institution,
          class: payload.class,
          guardianPhone: payload.guardianPhone,
          division: payload.division,
          district: payload.district,
          thana: payload.thana,
          profileImg: payload.profileImg,
        },
      },
    },
    select: publicUserSelect,
  });
  const result = toPublicUser(created);
  const accessToken = jwtGenerator({
    userInfo: { email: result.email, role: result.role },
    createSecretKey: config.jwt.token_secret as Secret,
    expiresIn: config.jwt.token_expires_in as StringValue,
  });
  const refreshToken = jwtGenerator({
    userInfo: { email: result.email, role: result.role },
    createSecretKey: config.jwt.refresh_token_secret as Secret,
    expiresIn: config.jwt.refresh_token_expires_in as StringValue,
  });
  return { ...result, accessToken, refreshToken };
};

export const UserService = {
  createUser,
};
