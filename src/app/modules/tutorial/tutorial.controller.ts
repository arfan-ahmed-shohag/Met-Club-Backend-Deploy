import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";
import { TutorialService } from "./tutorial.service";

type MulterFile = {
  filename: string;
};

type MulReq = Request & { file?: MulterFile };

const createOrUpdateTutorial = catchAsync(
  async (req: MulReq, res: Response) => {
    const { tutorialNumber, name, title, videoLink, thumbnailImage } =
      req.body as {
        tutorialNumber: string;
        name: string;
        title: string;
        videoLink: string;
        thumbnailImage?: string;
      };

    const tutorialId = req.params.id ? Number(req.params.id) : null;
    const thumbnailPath = req.file
      ? `/uploads/${req.file.filename}`
      : thumbnailImage || null;

    const result = await TutorialService.createOrUpdateTutorial({
      id: tutorialId,
      tutorialNumber: Number(tutorialNumber),
      name,
      title,
      thumbnailImage: thumbnailPath,
      videoLink,
    });

    sendResponse(res, {
      statusCode: 200,
      message: tutorialId
        ? "Tutorial updated successfully!"
        : "Tutorial created successfully!",
      data: result,
    });
  },
);

const getAllTutorials = catchAsync(async (_req: Request, res: Response) => {
  const result = await TutorialService.getAllTutorials();

  sendResponse(res, {
    statusCode: 200,
    message: "Tutorials retrieved successfully!",
    data: result,
  });
});

const getTutorialById = catchAsync(async (req: Request, res: Response) => {
  const tutorialId = Number(req.params.id);
  const result = await TutorialService.getTutorialById(tutorialId);

  sendResponse(res, {
    statusCode: 200,
    message: "Tutorial retrieved successfully!",
    data: result,
  });
});

const deleteTutorial = catchAsync(async (req: Request, res: Response) => {
  const tutorialId = Number(req.params.id);
  const result = await TutorialService.deleteTutorial(tutorialId);

  sendResponse(res, {
    statusCode: 200,
    message: "Tutorial deleted successfully!",
    data: result,
  });
});

export const TutorialController = {
  createOrUpdateTutorial,
  getAllTutorials,
  getTutorialById,
  deleteTutorial,
};
