import express from "express";
import { TutorialController } from "./tutorial.controller";
import { rootUpload } from "../../../utils/imageUpload";

const router = express.Router();

router.get("/", TutorialController.getAllTutorials);
router.get("/:id", TutorialController.getTutorialById);
router.post(
  "/",
  rootUpload.single("thumbnail"),
  TutorialController.createOrUpdateTutorial,
);
router.patch(
  "/:id",
  rootUpload.single("thumbnail"),
  TutorialController.createOrUpdateTutorial,
);
router.delete("/:id", TutorialController.deleteTutorial);

export const TutorialRoutes = router;
