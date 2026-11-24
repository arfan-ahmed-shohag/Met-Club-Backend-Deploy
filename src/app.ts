import express, { Request, Response } from "express";
import cors from "cors";
import router from "./app/routes/routes";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./app/errors/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import path from "path";

const app = express();

// Production runs behind nginx on the same machine. Trust X-Forwarded-For only
// from a loopback proxy so req.ip is the visitor's IP and can't be spoofed
// (used by the in-memory visit rate limit).
app.set("trust proxy", "loopback");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://meteorologyclub.com",
      "https://www.meteorologyclub.com",
      // Unity WebGL game; it calls the API with the shared refresh-token cookie.
      "https://game.meteorologyclub.com",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/v1", router);

// serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
  "/story-assets",
  express.static(path.join(process.cwd(), "public", "stories")),
);

app.get("/", (req: Request, res: Response) => {
  res.send({ message: "Server is running! ....." });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
