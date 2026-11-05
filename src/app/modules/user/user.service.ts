import { Role, QuizLevel } from "../../../../generated/prisma/client"
import bcrypt from "bcrypt";
import { config } from "../../../config";
import { prisma } from "../../../lib/prisma";
import { IUser } from "../../../types";
import AppError from "../../errors/appErrors";
import { jwtGenerator } from "../../../utils/jwt";
import { Secret } from "jsonwebtoken";
import { StringValue } from "ms";
import { publicUserSelect } from "../../../utils/publicUserSelect";
import RequestValidationError from "../../errors/requestValidationError";

const generateStudentId = async () => {
    const lastUser = await prisma.user.findFirst({
        orderBy: {
            createdAt: "desc",
        },
        select: {
            studentId: true,
        },
    });

    let nextNumber = 1;

    if (lastUser?.studentId) {
        const lastNumber = parseInt(lastUser.studentId.split("-").pop() || "0");
        nextNumber = lastNumber + 1;
    }

    return `Met-Club-${nextNumber}`;
};

const createUser = async (payload: IUser) => {
    const existingUser = await prisma.user.findFirst({
        where: { email: { equals: payload.email, mode: "insensitive" } },
        select: { id: true },
    });
    if (existingUser) throw new RequestValidationError({ email: "এই ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট আছে" }, 409);
    const hashedPassword = await bcrypt.hash(payload.password, Number(config.salt_rounds));
    const userData = {
        fullName: payload.fullName,
        email: payload.email,
        institution: payload.institution,
        class: payload.class,
        guardianPhone: payload.guardianPhone,
        division: payload.division,
        district: payload.district,
        thana: payload.thana,
        profileImg: payload.profileImg,
        studentId: await generateStudentId(),
        password: hashedPassword,
        role: Role.student,
    };
    const result = await prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({ data: userData, select: publicUserSelect });
        await transaction.isChapterComplete.createMany({
            data: [1, 14, 15, 3].map((chapterId) => ({ userId: user.id, quizLevel: null, chapterId })),
        });
        return user;
    });
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
}

const isChapterCompleted = async (payload: { email: string, chapterId: number }) => {
    const user = await prisma.user.findUnique({
        where: {
            email: payload.email
        },
        select: {
            id: true
        }
    })
    if (!user) {
        throw new AppError(404, "User not found!")
    }


    const chapterCompletion = await prisma.isChapterComplete.findFirst({
        where: {
            userId: user.id,
            chapterId: payload.chapterId
        }
    })


    return chapterCompletion?.isComplete || false;

}

const isChapterOneCompleted = async (payload: { email: string }) => {
    const user = await prisma.user.findUnique({
        where: {
            email: payload.email
        },
        select: {
            id: true
        }
    })
    if (!user) {
        throw new AppError(404, "User not found!")
    }
    const chapterCompletion = await prisma.isChapterComplete.findFirst({
        where: {
            userId: user.id,
            chapterId: 1
        }
    })

    if (chapterCompletion?.isComplete && chapterCompletion.quizLevel === QuizLevel.hard) {
        return true;
    }

    return false;
}

const updateChapterCompletion = async (payload: { email: string, chapterId: number }) => {
    const user = await prisma.user.findUnique({
        where: {
            email: payload.email
        },
        select: {
            id: true
        }
    })
    if (!user) {
        throw new AppError(404, "User not found!")
    }


    const updatedCompletion = await prisma.isChapterComplete.upsert({
        where: {
            userId_chapterId: {
                userId: user.id,
                chapterId: payload.chapterId
            }
        },
        update: {
            isComplete: true
        },
        create: {
            userId: user.id,
            chapterId: payload.chapterId,
            isComplete: true
        }
    })

    return updatedCompletion;
}

const quizLevelInfo = async (payload: { email: string, chapterId: number }) => {
    const user = await prisma.user.findUnique({
        where: {
            email: payload.email
        },
        select: {
            id: true
        }
    })
    if (!user) {
        throw new AppError(404, "User not found!")
    }

    const chapterCompletion = await prisma.isChapterComplete.findFirst({
        where: {
            userId: user.id,
            chapterId: payload.chapterId
        },
        select: {
            quizLevel: true
        }
    })

    return chapterCompletion?.quizLevel || null;
}

const quizLevelUpdate = async (payload: { email: string, chapterId: number, quizLevel: QuizLevel }) => {
    const user = await prisma.user.findUnique({
        where: {
            email: payload.email
        },
        select: {
            id: true
        }
    })
    if (!user) {
        throw new AppError(404, "User not found!")
    }

    const chapterCompletion = await prisma.isChapterComplete.findFirst({
        where: {
            userId: user.id,
            chapterId: payload.chapterId
        },
        select: {
            isComplete: true,
        }
    })

    console.log(chapterCompletion);

    const updatedQuizLevel = await prisma.isChapterComplete.updateMany({
        where: {
            userId: user.id,
            chapterId: payload.chapterId
        },
        data: {
            quizLevel: payload.quizLevel
        }
    })
    return updatedQuizLevel;
}

export const UserService = {
    createUser,
    isChapterCompleted,
    isChapterOneCompleted,
    updateChapterCompletion,
    quizLevelInfo,
    quizLevelUpdate
}
