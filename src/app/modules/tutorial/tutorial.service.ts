import AppError from "../../errors/appErrors";
import { prisma } from "../../../lib/prisma";

type TutorialPayload = {
  id?: number | null;
  tutorialNumber: number;
  name: string;
  title: string;
  thumbnailImage: string | null;
  videoLink: string;
};

const createOrUpdateTutorial = async (payload: TutorialPayload) => {
  if (
    !payload.tutorialNumber ||
    !payload.name ||
    !payload.title ||
    !payload.videoLink
  ) {
    throw new AppError(
      400,
      "Tutorial number, name, title and video link are required",
    );
  }

  if (!payload.thumbnailImage) {
    throw new AppError(400, "Tutorial thumbnail is required");
  }

  const data = {
    tutorialNumber: payload.tutorialNumber,
    name: payload.name,
    title: payload.title,
    thumbnailImage: payload.thumbnailImage,
    videoLink: payload.videoLink,
  };

  if (payload.id) {
    return prisma.tutorial.update({
      where: { id: payload.id },
      data,
    });
  }

  return prisma.tutorial.create({
    data,
  });
};

const getAllTutorials = async () => {
  return prisma.tutorial.findMany({
    orderBy: { tutorialNumber: "asc" },
  });
};

const getTutorialById = async (id: number) => {
  if (!id) {
    throw new AppError(400, "Tutorial id is required");
  }

  const tutorial = await prisma.tutorial.findUnique({
    where: { id },
  });

  if (!tutorial) {
    throw new AppError(404, "Tutorial not found");
  }

  return tutorial;
};

const deleteTutorial = async (id: number) => {
  if (!id) {
    throw new AppError(400, "Tutorial id is required");
  }

  const result = await prisma.tutorial.deleteMany({
    where: { id },
  });

  if (result.count === 0) {
    throw new AppError(404, "Tutorial not found");
  }

  return result;
};

export const TutorialService = {
  createOrUpdateTutorial,
  getAllTutorials,
  getTutorialById,
  deleteTutorial,
};
