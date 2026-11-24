import express from "express";
import { Role } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/auth";
import { createImageUpload } from "../../../utils/imageUpload";
import { StoryController } from "./story.controller";

const router = express.Router();

const handleImageUpload = createImageUpload({
  folder: "stories",
  field: "image",
  typeMessage: "Only PNG, JPEG, WEBP and GIF story images are supported",
  sizeMessage: "Story images must be 5 MB or smaller",
  limitMessage: "Upload one image at a time",
});

router.get("/", StoryController.listStories);
router.post(
  "/",
  auth(Role.admin),
  handleImageUpload,
  StoryController.createStory,
);
router.patch(
  "/:id",
  auth(Role.admin),
  handleImageUpload,
  StoryController.updateStory,
);
router.delete("/:id", auth(Role.admin), StoryController.deleteStory);

export const StoryRoutes = router;
