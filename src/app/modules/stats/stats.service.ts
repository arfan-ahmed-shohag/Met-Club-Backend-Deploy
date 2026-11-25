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
const DAY_MS = 24 * 60 * 60 * 1000;
// Bangladesh is UTC+6 all year (no daylight saving).
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

// "YYYY-MM-DD" of the given instant in Bangladesh time.
const dhakaDateKey = (date: Date) =>
  new Date(date.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);

// Counts one visitor in the all-time total and in today's (Bangladesh time)
// row. The frontend sends this at most once per browser per 30 days.
const recordVisit = async () => {
  const day = new Date(`${dhakaDateKey(new Date())}T00:00:00Z`);
  await Promise.all([
    prisma.siteCounter.upsert({
      where: { key: VISITS_KEY },
      create: { key: VISITS_KEY, value: 1 },
      update: { value: { increment: 1 } },
    }),
    prisma.siteVisitDay.upsert({
      where: { day },
      create: { day, count: 1 },
      update: { count: { increment: 1 } },
    }),
  ]);
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
const WEEK_MS = 7 * DAY_MS;
const TREND_DAYS = 365;
const TOP_INSTITUTIONS = 8;
const SCORE_BUCKET = 10;

// Charts for the admin overview: daily registrations, blog submissions and
// visitors for the last TREND_DAYS days (Bangladesh dates, zero-filled), plus
// student breakdowns and the game score distribution. Aggregates only.
const getAnalytics = async () => {
  const todayKey = dhakaDateKey(new Date());
  const firstDay = new Date(
    new Date(`${todayKey}T00:00:00Z`).getTime() - (TREND_DAYS - 1) * DAY_MS,
  );
  // Start of the first day in Bangladesh time, as an instant.
  const since = new Date(firstDay.getTime() - DHAKA_OFFSET_MS);

  const [students, blogs, visitDays, byDivision, byClass, byInstitution, scores] =
    await Promise.all([
      prisma.student.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.blogPost.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.siteVisitDay.findMany({
        where: { day: { gte: firstDay } },
        select: { day: true, count: true },
      }),
      prisma.student.groupBy({
        by: ["division"],
        where: activeStudents,
        _count: { _all: true },
      }),
      prisma.student.groupBy({
        by: ["class"],
        where: activeStudents,
        _count: { _all: true },
      }),
      prisma.student.groupBy({
        by: ["institution"],
        where: activeStudents,
        _count: { _all: true },
      }),
      prisma.gameScore.groupBy({ by: ["score"], _count: { _all: true } }),
    ]);

  const days = Array.from({ length: TREND_DAYS }, (_, i) =>
    new Date(firstDay.getTime() + i * DAY_MS).toISOString().slice(0, 10),
  );
  const series = (keys: string[], counts?: Map<string, number>) => {
    const totals = counts ?? new Map<string, number>();
    if (!counts) for (const key of keys) totals.set(key, (totals.get(key) ?? 0) + 1);
    return days.map((date) => ({ date, count: totals.get(date) ?? 0 }));
  };

  const scoreBuckets = Array.from({ length: 100 / SCORE_BUCKET }, (_, i) => ({
    from: i * SCORE_BUCKET,
    to: i === 100 / SCORE_BUCKET - 1 ? 100 : (i + 1) * SCORE_BUCKET - 1,
    students: 0,
  }));
  for (const row of scores) {
    const index = Math.min(
      Math.floor(row.score / SCORE_BUCKET),
      scoreBuckets.length - 1,
    );
    scoreBuckets[index].students += row._count._all;
  }

  const byCount = (a: { students: number }, b: { students: number }) =>
    b.students - a.students;

  return {
    trend: {
      registrations: series(students.map((s) => dhakaDateKey(s.createdAt))),
      blogs: series(blogs.map((b) => dhakaDateKey(b.createdAt))),
      visitors: series(
        [],
        new Map(
          visitDays.map((row) => [row.day.toISOString().slice(0, 10), row.count]),
        ),
      ),
    },
    // division null = not set; "Others" = outside Bangladesh.
    byDivision: byDivision
      .map((row) => ({ division: row.division, students: row._count._all }))
      .sort(byCount),
    byClass: byClass
      .map((row) => ({ class: row.class, students: row._count._all }))
      .sort((a, b) => a.class - b.class),
    topInstitutions: byInstitution
      .filter((row) => row.institution.trim())
      .map((row) => ({
        institution: row.institution.trim(),
        students: row._count._all,
      }))
      .sort(byCount)
      .slice(0, TOP_INSTITUTIONS),
    gameScores: scoreBuckets,
  };
};

// Totals and recent activity for the /admin overview page.
const getTotals = async () => {
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

// Admin-only: totals, recent activity and chart data for the /admin overview.
const getDashboard = async () => {
  const [totals, analytics] = await Promise.all([getTotals(), getAnalytics()]);
  return { ...totals, analytics };
};

export const StatsService = {
  getStudentReach,
  recordVisit,
  getCommunity,
  getDashboard,
};
