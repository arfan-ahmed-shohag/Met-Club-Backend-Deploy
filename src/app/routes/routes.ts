import express from "express";
import { UserRoutes } from "../modules/user/user.route";
import { AuthRoutes } from "../modules/auth/auth.route";
import { SchoolRoutes } from "../modules/school/school.route";
import { BlogRoutes } from "../modules/blog/blog.route";
import { GalleryRoutes } from "../modules/gallery/gallery.route";
import { HomeVideoRoutes } from "../modules/homeVideo/homeVideo.route";
import { StoryRoutes } from "../modules/story/story.route";
import { PdfResourceRoutes } from "../modules/pdfResource/pdfResource.route";
import { GameRoutes } from "../modules/game/game.route";
import { StatsRoutes } from "../modules/stats/stats.route";
const router = express.Router();

const routes = [
  {
    path: "/user",
    route: UserRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/schools",
    route: SchoolRoutes,
  },
  {
    path: "/blogs",
    route: BlogRoutes,
  },
  {
    path: "/gallery",
    route: GalleryRoutes,
  },
  {
    path: "/videos",
    route: HomeVideoRoutes,
  },
  {
    path: "/stories",
    route: StoryRoutes,
  },
  {
    path: "/pdf-resources",
    route: PdfResourceRoutes,
  },
  {
    path: "/game",
    route: GameRoutes,
  },
  {
    path: "/stats",
    route: StatsRoutes,
  },
];

routes.forEach((route) => router.use(route.path, route.route));

export default router;
