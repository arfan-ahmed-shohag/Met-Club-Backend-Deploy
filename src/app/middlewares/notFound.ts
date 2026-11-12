import { Request, Response } from "express";

const notFound = async (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "API NOT FOUND",
    error: {
      path: req.originalUrl,
      errorMessage: "The path is not found that you provided",
    },
  });
};

export default notFound;
