import express from 'express';
import { UserRoutes } from '../modules/user/user.route';
import { AuthRoutes } from '../modules/auth/auth.route';
import { ContentRoutes } from '../modules/content/content.route';
import { TutorialRoutes } from '../modules/tutorial/tutorial.route';
import { SchoolRoutes } from '../modules/school/school.route';
import { BlogRoutes } from '../modules/blog/blog.route';
import { GalleryRoutes } from '../modules/gallery/gallery.route';
const router = express.Router();

const routes = [
    {
        path: "/user",
        route: UserRoutes
    },
    {
        path: "/auth",
        route: AuthRoutes
    },
    {
        path: "/content",
        route: ContentRoutes
    },
    {
        path: "/tutorials",
        route: TutorialRoutes
    },
    {
        path: "/schools",
        route: SchoolRoutes
    },
    {
        path: "/blogs",
        route: BlogRoutes
    },
    {
        path: "/gallery",
        route: GalleryRoutes
    }
]

routes.forEach(route => router.use(route.path, route.route))

export default router;
