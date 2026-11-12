import { Response } from "express";

const sendResponse = <T>(
  res: Response,
  json: {
    statusCode: number;
    message: string;
    meta?: { page: number; limit: number; total: number };
    data: T;
  },
) => {
  res.status(json?.statusCode).json({
    success: true,
    message: json?.message,
    meta: json?.meta,
    data: json?.data,
  });
};

export default sendResponse;
