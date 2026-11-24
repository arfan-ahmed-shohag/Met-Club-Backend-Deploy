import express from "express";
import { Role } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/auth";
import { createImageUpload } from "../../../utils/imageUpload";
import { HomeVideoController } from "./homeVideo.controller";

const router = express.Router();

const handleThumbnailUpload = createImageUpload({
  folder: "videos",
  field: "thumbnail",
  typeMessage: "Only PNG, JPEG, WEBP and GIF thumbnails are supported",
  sizeMessage: "Video thumbnails must be 5 MB or smaller",
  limitMessage: "Upload one thumbnail at a time",
});

router.get("/", HomeVideoController.listHomeVideos);
router.post(
  "/",
  auth(Role.admin),
  handleThumbnailUpload,
  HomeVideoController.createHomeVideo,
);
router.patch(
  "/:id",
  auth(Role.admin),
  handleThumbnailUpload,
  HomeVideoController.updateHomeVideo,
);
router.delete("/:id", auth(Role.admin), HomeVideoController.deleteHomeVideo);

export const HomeVideoRoutes = router;
