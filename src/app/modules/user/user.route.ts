import express from "express"
import { userController } from "./user.controller";
import auth from "../../middlewares/auth";
import { Role } from "../../../../generated/prisma/enums";

import { validateRegistrationRequest } from "./user.validation";

import { ProfileRoutes } from "./profile.route";

const router = express.Router();
router.use("/me", ProfileRoutes);

router.post("/",
    validateRegistrationRequest,
    userController.createUser
)
router.get("/chapter-completion-status/:chapterId", auth(Role.student, Role.admin), userController.isChapterCompleted)
router.get("/chapter-one-completion-status", auth(Role.student, Role.admin), userController.isChapterOneCompleted)
router.patch("/update-chapter-completion/:chapterId", auth(Role.student, Role.admin), userController.updateChapterCompletion)
router.get("/quiz-level-info/:chapterId", auth(Role.student, Role.admin), userController.quizLevelInfo)
router.patch("/update-quiz-level/:chapterId", auth(Role.student, Role.admin), userController.updateQuizLevel)
export const UserRoutes = router;
