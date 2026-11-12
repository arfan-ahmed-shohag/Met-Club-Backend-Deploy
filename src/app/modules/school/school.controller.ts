import { Request, Response } from "express";
import { SchoolService } from "./school.service";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";

// Minimal Multer file type to avoid depending on @types/multer in this environment
type MulterFile = {
  fieldname?: string;
  originalname?: string;
  encoding?: string;
  mimetype?: string;
  destination?: string;
  filename: string;
  path?: string;
  size?: number;
  buffer?: Buffer;
};

type MulReq = Request & { files?: MulterFile[]; file?: MulterFile };

const createSchool = catchAsync(async (req: MulReq, res: Response) => {
  let payload = req.body;
  if (req.body.data) {
    try {
      payload = JSON.parse(req.body.data);
    } catch (err) {
      payload = req.body;
    }
  }

  const files = req.files || [];
  if (payload.members && Array.isArray(payload.members)) {
    payload.members = payload.members.map((member: any) => {
      const imgIdx =
        typeof member.imageIndex === "number" ? member.imageIndex : null;
      const file = imgIdx !== null ? files[imgIdx] : undefined;
      if (file) {
        member.image = `/uploads/${file.filename}`;
      }
      delete member.imageIndex;
      return member;
    });
  }

  const result = await SchoolService.createSchool(payload);
  sendResponse(res, {
    statusCode: 201,
    message: "School created successfully",
    data: result,
  });
});

const getSchoolsByLocation = catchAsync(async (req: Request, res: Response) => {
  const locationKey = req.query.location as string;
  const result = await SchoolService.getSchoolsByLocation(locationKey);
  sendResponse(res, {
    statusCode: 200,
    message: "Schools retrieved successfully",
    data: result,
  });
});

const getSchoolById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await SchoolService.getSchoolById(id);
  sendResponse(res, {
    statusCode: 200,
    message: "School retrieved successfully",
    data: result,
  });
});

const updateSchool = catchAsync(async (req: MulReq, res: Response) => {
  const id = Number(req.params.id);

  let payload = req.body;
  if (req.body.data) {
    try {
      payload = JSON.parse(req.body.data);
    } catch (err) {
      payload = req.body;
    }
  }

  const files = req.files || [];
  if (payload.members && Array.isArray(payload.members)) {
    payload.members = payload.members.map((member: any) => {
      const imgIdx =
        typeof member.imageIndex === "number" ? member.imageIndex : null;
      const file = imgIdx !== null ? files[imgIdx] : undefined;
      if (file) {
        member.image = `/uploads/${file.filename}`;
      }
      delete member.imageIndex;
      return member;
    });
  }

  const result = await SchoolService.updateSchool(id, payload);
  sendResponse(res, {
    statusCode: 200,
    message: "School updated successfully",
    data: result,
  });
});

const deleteSchool = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await SchoolService.deleteSchool(id);
  sendResponse(res, {
    statusCode: 200,
    message: "School deleted successfully",
    data: result,
  });
});

const createMember = catchAsync(async (req: MulReq, res: Response) => {
  let payload = req.body;
  if (req.body.data) {
    try {
      payload = JSON.parse(req.body.data);
    } catch (e) {
      payload = req.body;
    }
  }
  if (req.file) {
    payload.image = `/uploads/${req.file.filename}`;
  }
  const result = await SchoolService.createMember(payload);
  sendResponse(res, {
    statusCode: 201,
    message: "Member created successfully",
    data: result,
  });
});

const updateMember = catchAsync(async (req: MulReq, res: Response) => {
  const id = Number(req.params.id);
  let payload = req.body;
  if (req.body.data) {
    try {
      payload = JSON.parse(req.body.data);
    } catch (e) {
      payload = req.body;
    }
  }
  if (req.file) {
    payload.image = `/uploads/${req.file.filename}`;
  }
  const result = await SchoolService.updateMember(id, payload);
  sendResponse(res, {
    statusCode: 200,
    message: "Member updated successfully",
    data: result,
  });
});

const deleteMember = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await SchoolService.deleteMember(id);
  sendResponse(res, {
    statusCode: 200,
    message: "Member deleted successfully",
    data: result,
  });
});

export const SchoolController = {
  createSchool,
  getSchoolsByLocation,
  getSchoolById,
  updateSchool,
  deleteSchool,
  createMember,
  updateMember,
  deleteMember,
};
