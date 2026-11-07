import express, { Request, Response } from "express";
import cors from "cors";
import router from "./app/routes/routes";
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from "./app/errors/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import path from "path";

const app = express();

app.use(cors({
    origin: ["http://localhost:5173", "https://meteorologyclub.com", "https://www.meteorologyclub.com"],
    credentials: true,
}));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use("/api/v1", router);

// serve uploaded files
app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"))
);

app.get("/", (req: Request, res: Response) => {
    res.send({ "message": "Server is running!............." })
})

app.use(globalErrorHandler)
app.use(notFound)

export default app;