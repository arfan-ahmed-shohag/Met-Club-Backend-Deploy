import { prisma } from "../../../lib/prisma";

const createSchool = async (payload: any) => {
  const { members, ...schoolData } = payload;
  return await prisma.school.create({
    data: {
      ...schoolData,
      ...(members && { members: { create: members } }),
    },
    include: { members: true },
  });
};

const getSchoolsByLocation = async (locationKey: string) => {
  return await prisma.school.findMany({
    where: { locationKey },
    include: { members: true },
  });
};

const getSchoolById = async (id: number) => {
  return await prisma.school.findUnique({
    where: { id },
    include: { members: true },
  });
};

const updateSchool = async (id: number, payload: any) => {
  const { members, ...schoolData } = payload;

  if (members) {
    await prisma.clubMember.deleteMany({ where: { schoolId: id } });
  }

  return await prisma.school.update({
    where: { id },
    data: {
      ...schoolData,
      ...(members && { members: { create: members } }),
    },
    include: { members: true },
  });
};

const deleteSchool = async (id: number) => {
  return await prisma.school.delete({
    where: { id },
  });
};

const createMember = async (payload: any) => {
  return await prisma.clubMember.create({
    data: payload,
  });
};

const updateMember = async (id: number, payload: any) => {
  return await prisma.clubMember.update({
    where: { id },
    data: payload,
  });
};

const deleteMember = async (id: number) => {
  return await prisma.clubMember.delete({
    where: { id },
    // add
  });
};

export const SchoolService = {
  createSchool,
  getSchoolsByLocation,
  getSchoolById,
  updateSchool,
  deleteSchool,
  createMember,
  updateMember,
  deleteMember,
};
