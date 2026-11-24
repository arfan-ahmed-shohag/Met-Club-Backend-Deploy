import express from "express";
import { Role } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/auth";
import { createImageUpload } from "../../../utils/imageUpload";
import { BlogController } from "./blog.controller";
import { validateCreateBlog } from "./blog.validation";

const router = express.Router();

const handleBlogImageUpload = createImageUpload({
  folder: "blogs",
  field: "image",
  typeMessage: "Only PNG, JPEG, WEBP and GIF images are supported",
  sizeMessage: "Blog images must be 5 MB or smaller",
  limitMessage: "Upload one image at a time",
});

router.get("/", BlogController.getPublishedBlogPosts);
router.get("/mine", auth(Role.student), BlogController.getMyBlogPosts);
router.get("/admin", auth(Role.admin), BlogController.getAllBlogPostsForAdmin);
router.post(
  "/images",
  auth(Role.student, Role.admin),
  handleBlogImageUpload,
  BlogController.uploadBlogImage,
);
router.post(
  "/",
  auth(Role.student, Role.admin),
  validateCreateBlog,
  BlogController.createBlogPost,
);
router.patch("/:id/publish", auth(Role.admin), BlogController.publishBlogPost);
router.patch(
  "/:id/unpublish",
  auth(Role.admin),
  BlogController.unpublishBlogPost,
);

export const BlogRoutes = router;
