import { Status } from "../../../../generated/prisma/enums";
import { prisma } from "../../../lib/prisma";
import AppError from "../../errors/appErrors";
import { parseGameResult } from "./game.validation";

export const LEADERBOARD_SIZE = 7;

// Higher score first; equal scores rank the faster time first; a full tie
// ranks whoever played first.
const rankOrder = [
  { score: "desc" },
  { time: "asc" },
  { createdAt: "asc" },
] as const;

const getLeaderboard = async () => {
  const rows = await prisma.gameScore.findMany({
    orderBy: [...rankOrder],
    take: LEADERBOARD_SIZE,
    select: { score: true, time: true, student: { select: { fullName: true } } },
  });
  return rows.map((row, index) => ({
    position: index + 1,
    name: row.student.fullName,
    score: row.score,
    time: row.time,
  }));
};

const positionOf = async (entry: {
  score: number;
  time: number;
  createdAt: Date;
}) => {
  const ahead = await prisma.gameScore.count({
    where: {
      OR: [
        { score: { gt: entry.score } },
        { score: entry.score, time: { lt: entry.time } },
        {
          score: entry.score,
          time: entry.time,
          createdAt: { lt: entry.createdAt },
        },
      ],
    },
  });
  return ahead + 1;
};

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: unknown }).code === "P2002";

/**
 * Records the student's first finished game. Later submissions never change
 * it; they get the stored result back with `recorded: false`.
 */
const submitScore = async (email: string, input: unknown) => {
  const result = parseGameResult(input);
  const student = await prisma.student.findFirst({
    where: { user: { email, status: Status.active } },
    select: { id: true },
  });
  if (!student)
    throw new AppError(403, "শুধু শিক্ষার্থীরা গেমের স্কোর জমা দিতে পারবে");

  const select = { score: true, time: true, createdAt: true } as const;
  let entry = await prisma.gameScore.findUnique({
    where: { studentId: student.id },
    select,
  });
  let recorded = false;
  if (!entry) {
    try {
      entry = await prisma.gameScore.create({
        data: { studentId: student.id, ...result },
        select,
      });
      recorded = true;
    } catch (error) {
      // A parallel request saved the first result just before this one.
      if (!isUniqueViolation(error)) throw error;
      entry = await prisma.gameScore.findUniqueOrThrow({
        where: { studentId: student.id },
        select,
      });
    }
  }
  const position = await positionOf(entry);
  return {
    recorded,
    result: { score: entry.score, time: entry.time },
    position,
    inLeaderboard: position <= LEADERBOARD_SIZE,
  };
};

export const GameService = { getLeaderboard, submitScore };
