import { Status } from "../../../../generated/prisma/enums";
import { prisma } from "../../../lib/prisma";
import locations from "../../../data/bangladesh-locations.json";

const knownDistricts = new Set(
  (locations as { districts: { name: string }[] }[]).flatMap((division) =>
    division.districts.map((district) => district.name),
  ),
);
const activeStudents = { user: { status: Status.active } };

// Public, aggregate-only numbers for the Home page "student reach" map.
// No names or other personal data leave this function.
const getStudentReach = async () => {
  const [totalStudents, byDistrict, byDivision, institutions] =
    await Promise.all([
      prisma.student.count({ where: activeStudents }),
      prisma.student.groupBy({
        by: ["district"],
        where: { ...activeStudents, district: { not: null } },
        _count: { _all: true },
      }),
      prisma.student.groupBy({
        by: ["division"],
        where: { ...activeStudents, division: { not: null } },
        _count: { _all: true },
      }),
      prisma.student.groupBy({
        by: ["institution"],
        where: activeStudents,
      }),
    ]);

  const districts = byDistrict
    .filter((row) => row.district && knownDistricts.has(row.district))
    .map((row) => ({ district: row.district as string, students: row._count._all }))
    .sort((a, b) => b.students - a.students || a.district.localeCompare(b.district));

  return {
    totalStudents,
    totalDistricts: knownDistricts.size,
    districtsReached: districts.length,
    divisionsReached: byDivision.length,
    institutions: institutions.filter((row) => row.institution.trim()).length,
    districts,
  };
};

export const StatsService = { getStudentReach };
