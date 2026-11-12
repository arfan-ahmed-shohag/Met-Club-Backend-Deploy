import express from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../../../generated/prisma/enums";
import { SchoolController } from "./school.controller";
import multer from "multer";
import path from "path";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => cb(null, uploadDir),
  filename: (req: any, file: any, cb: any) =>
    cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

router.get("/", SchoolController.getSchoolsByLocation);
router.get("/:id", SchoolController.getSchoolById);

router.post(
  "/",
  auth(Role.admin),
  upload.array("images"),
  SchoolController.createSchool,
);
router.patch(
  "/:id",
  auth(Role.admin),
  upload.array("images"),
  SchoolController.updateSchool,
);
router.delete("/:id", auth(Role.admin), SchoolController.deleteSchool);

router.post(
  "/members",
  auth(Role.admin),
  upload.single("image"),
  SchoolController.createMember,
);
router.patch(
  "/members/:id",
  auth(Role.admin),
  upload.single("image"),
  SchoolController.updateMember,
);
router.delete("/members/:id", auth(Role.admin), SchoolController.deleteMember);

export const SchoolRoutes = router;
