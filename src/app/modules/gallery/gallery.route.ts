import express from "express";
import { Role } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/auth";
import { createImageUpload } from "../../../utils/imageUpload";
import { GalleryController } from "./gallery.controller";

const router = express.Router();

const handleGalleryUpload = createImageUpload({
  folder: "gallery",
  field: "image",
  typeMessage: "Only PNG, JPEG, WEBP and GIF images are supported",
  sizeMessage: "Gallery images must be 5 MB or smaller",
  limitMessage: "Upload one image at a time",
});

router.get("/", GalleryController.listGalleryImages);
router.post(
  "/",
  auth(Role.admin),
  handleGalleryUpload,
  GalleryController.createGalleryImage,
);
router.patch(
  "/:id",
  auth(Role.admin),
  handleGalleryUpload,
  GalleryController.updateGalleryImage,
);
router.delete("/:id", auth(Role.admin), GalleryController.deleteGalleryImage);

export const GalleryRoutes = router;
