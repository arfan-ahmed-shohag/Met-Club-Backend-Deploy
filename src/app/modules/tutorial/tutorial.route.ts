import express from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../../../generated/prisma/enums";
import { TutorialController } from "./tutorial.controller";
// @ts-ignore: multer may not have types installed in this environment
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, uploadDir),
  filename: (_req: any, file: any, cb: any) =>
    cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

router.get("/", TutorialController.getAllTutorials);
router.get("/:id", TutorialController.getTutorialById);
router.post(
  "/",
  upload.single("thumbnail"),
  TutorialController.createOrUpdateTutorial,
);
router.patch(
  "/:id",
  upload.single("thumbnail"),
  TutorialController.createOrUpdateTutorial,
);
router.delete("/:id", TutorialController.deleteTutorial);

export const TutorialRoutes = router;
