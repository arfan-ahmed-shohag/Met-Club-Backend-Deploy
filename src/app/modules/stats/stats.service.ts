import {
  BlogStatus,
  PdfResourceCategory,
  Status,
} from "../../../../generated/prisma/enums";
import { authorProfileSelect, toAuthor } from "../../../utils/publicUserSelect";
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

// Students outside Bangladesh register with division/district/thana "Others".
const OTHER_COUNTRY_DIVISION = "Others";

const VISITS_KEY = "visits";

// Counts one visitor. The frontend sends this at most once per browser per 30 days.
const recordVisit = async () => {
  await prisma.siteCounter.upsert({
    where: { key: VISITS_KEY },
    create: { key: VISITS_KEY, value: 1 },
    update: { value: { increment: 1 } },
  });
};

// Public, aggregate-only numbers for the Home page "community" cards.
const getCommunity = async () => {
  const [visits, totalStudents, otherCountryUsers] = await Promise.all([
    prisma.siteCounter.findUnique({ where: { key: VISITS_KEY } }),
    prisma.student.count({ where: activeStudents }),
    prisma.student.count({
      where: { ...activeStudents, division: OTHER_COUNTRY_DIVISION },
    }),
  ]);

  return {
    totalVisitors: visits?.value ?? 0,
    bangladeshUsers: totalStudents - otherCountryUsers,
    otherCountryUsers,
  };
};

const RECENT_LIMIT = 5;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Admin-only numbers and recent activity for the /admin overview page.
const getDashboard = async () => {
  const weekAgo = new Date(Date.now() - WEEK_MS);
  const [
    activeStudents_,
    blockedStudents,
    newStudentsThisWeek,
    otherCountryStudents,
    visits,
    publishedBlogs,
    pendingBlogs,
    gamePlayers,
    stories,
    homeVideos,
    galleryImages,
    publicationsByCategory,
    schools,
    recentStudents,
    recentBlogs,
  ] = await Promise.all([
    prisma.student.count({ where: activeStudents }),
    prisma.student.count({ where: { user: { status: Status.blocked } } }),
    prisma.student.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.student.count({
      where: { ...activeStudents, division: OTHER_COUNTRY_DIVISION },
    }),
    prisma.siteCounter.findUnique({ where: { key: VISITS_KEY } }),
    prisma.blogPost.count({ where: { status: BlogStatus.published } }),
    prisma.blogPost.count({ where: { status: BlogStatus.pending } }),
    prisma.gameScore.count(),
    prisma.story.count(),
    prisma.homeVideo.count(),
    prisma.galleryImage.count(),
    prisma.pdfResource.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.school.count(),
    prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        fullName: true,
        institution: true,
        district: true,
        createdAt: true,
      },
    }),
    prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        author: { select: authorProfileSelect },
      },
    }),
  ]);

  const publications = (category: PdfResourceCategory) =>
    publicationsByCategory.find((row) => row.category === category)?._count
      ._all ?? 0;

  return {
    students: {
      active: activeStudents_,
      blocked: blockedStudents,
      newThisWeek: newStudentsThisWeek,
      bangladesh: activeStudents_ - otherCountryStudents,
      otherCountries: otherCountryStudents,
    },
    visitors: visits?.value ?? 0,
    blogs: { published: publishedBlogs, pending: pendingBlogs },
    gamePlayers,
    content: {
      stories,
      homeVideos,
      galleryImages,
      comics: publications(PdfResourceCategory.comics),
      flyers: publications(PdfResourceCategory.flyer),
      news: publications(PdfResourceCategory.pressRelease),
      schools,
    },
    recentStudents,
    recentBlogs: recentBlogs.map(({ author, ...blog }) => ({
      ...blog,
      authorName: toAuthor(author).fullName,
    })),
  };
};

export const StatsService = {
  getStudentReach,
  recordVisit,
  getCommunity,
  getDashboard,
};
