import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

// Never connect these HTTP tests to the application's configured database.
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
process.env.NODE_ENV = "test";
process.env.TOKEN_SECRET = "dashboard-test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "dashboard-test-refresh-secret";
process.env.TOKEN_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = "7d";

const [{ default: app }, { prisma }] = await Promise.all([import("../src/app.ts"), import("../src/lib/prisma.ts")]);

const accounts = [
    { email: "admin@example.com", role: "admin" },
    { email: "student@example.com", role: "student" },
];
const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const dhakaDate = ms => new Date(ms + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
const dhakaToday = dhakaDate(now);
const students = [
    { id: "s0", fullName: "Old", institution: "School A", district: "ঢাকা", status: "active", division: "ঢাকা", class: 8, createdAt: new Date(now - 400 * day) },
    { id: "s1", fullName: "Rahim", institution: "School A", district: "ঢাকা", status: "active", division: "ঢাকা", class: 8, createdAt: new Date(now - 1 * day) },
    { id: "s2", fullName: "Karim", institution: "School B", district: "Others", status: "active", division: "Others", class: 10, createdAt: new Date(now - 2 * day) },
    { id: "s3", fullName: "Joy", institution: "School C", district: null, status: "blocked", division: null, class: 6, createdAt: new Date(now - 30 * day) },
];
const blogs = [
    { id: "b1", title: "Rain", status: "pending", createdAt: new Date(now - 3 * day), author: { student: { fullName: "Rahim", profileImg: null }, admin: null } },
    { id: "b2", title: "Storms", status: "published", createdAt: new Date(now - 5 * day), author: { student: null, admin: { fullName: "Admin", profileImg: null } } },
];

prisma.user.findUnique = async ({ where }) => {
    const account = accounts.find(a => a.email === where.email);
    return account ? { id: account.email, email: account.email, role: account.role } : null;
};
prisma.student.count = async ({ where }) => students.filter(s =>
    (!where.user || s.status === where.user.status) &&
    (where.division === undefined || s.division === where.division) &&
    (!where.createdAt || s.createdAt >= where.createdAt.gte)).length;
prisma.student.findMany = async ({ take, where }) => where
    ? students.filter(s => s.createdAt >= where.createdAt.gte).map(s => ({ createdAt: s.createdAt }))
    : [...students].sort((a, b) => b.createdAt - a.createdAt).slice(0, take)
        .map(({ id, fullName, institution, district, createdAt }) => ({ id, fullName, institution, district, createdAt }));
prisma.student.groupBy = async ({ by: [field], where }) => {
    const groups = new Map();
    for (const s of students.filter(s => s.status === where.user.status)) groups.set(s[field], (groups.get(s[field]) ?? 0) + 1);
    return [...groups].map(([key, count]) => ({ [field]: key, _count: { _all: count } }));
};
prisma.siteVisitDay.findMany = async () => [{ day: new Date(dhakaToday + "T00:00:00Z"), count: 4 }];
prisma.gameScore.groupBy = async () => [
    { score: 0, _count: { _all: 1 } }, { score: 55, _count: { _all: 2 } }, { score: 100, _count: { _all: 3 } },
];
prisma.siteCounter.findUnique = async () => ({ key: "visits", value: 42 });
prisma.blogPost.count = async ({ where }) => blogs.filter(b => b.status === where.status).length;
prisma.blogPost.findMany = async ({ take, where }) => where
    ? blogs.filter(b => b.createdAt >= where.createdAt.gte).map(b => ({ createdAt: b.createdAt }))
    : blogs.slice(0, take);
prisma.gameScore.count = async () => 7;
prisma.story.count = async () => 3;
prisma.homeVideo.count = async () => 4;
prisma.galleryImage.count = async () => 9;
prisma.pdfResource.groupBy = async () => [
    { category: "comics", _count: { _all: 2 } },
    { category: "pressRelease", _count: { _all: 5 } },
];
prisma.school.count = async () => 6;

const server = await new Promise(resolve => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
});
after(async () => { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); });
const getDashboard = authorization => fetch("http://127.0.0.1:" + server.address().port + "/api/v1/stats/dashboard",
    { headers: authorization ? { Authorization: authorization } : {} });
const token = (email, role) => "Bearer " + jwt.sign({ email, role }, process.env.TOKEN_SECRET, { expiresIn: "5m" });

test("GET /stats/dashboard requires an admin", async () => {
    assert.equal((await getDashboard()).status, 401);
    assert.equal((await getDashboard(token("student@example.com", "student"))).status, 403);
});

test("GET /stats/dashboard returns totals and recent activity for admins", async () => {
    const res = await getDashboard(token("admin@example.com", "admin"));
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.deepEqual(data.students, { active: 3, blocked: 1, newThisWeek: 2, bangladesh: 2, otherCountries: 1 });
    assert.equal(data.visitors, 42);
    assert.deepEqual(data.blogs, { published: 1, pending: 1 });
    assert.equal(data.gamePlayers, 7);
    assert.deepEqual(data.content, { stories: 3, homeVideos: 4, galleryImages: 9, comics: 2, flyers: 0, news: 5, schools: 6 });
    assert.deepEqual(data.recentStudents.map(s => s.fullName), ["Rahim", "Karim", "Joy", "Old"]);
    assert.deepEqual(data.recentBlogs.map(b => [b.title, b.status, b.authorName]), [["Rain", "pending", "Rahim"], ["Storms", "published", "Admin"]]);
    assert.ok(!("author" in data.recentBlogs[0]));
});

test("GET /stats/dashboard returns zero-filled daily trends and breakdowns", async () => {
    const { data: { analytics } } = await (await getDashboard(token("admin@example.com", "admin"))).json();
    for (const key of ["registrations", "blogs", "visitors"]) {
        assert.equal(analytics.trend[key].length, 365);
        assert.equal(analytics.trend[key].at(-1).date, dhakaToday);
    }
    const countOn = (series, ms) => series.find(p => p.date === dhakaDate(ms)).count;
    // The 400-day-old student is outside the window.
    assert.equal(analytics.trend.registrations.reduce((sum, p) => sum + p.count, 0), 3);
    assert.equal(countOn(analytics.trend.registrations, now - 2 * day), 1);
    assert.equal(countOn(analytics.trend.blogs, now - 5 * day), 1);
    assert.equal(analytics.trend.visitors.at(-1).count, 4);
    assert.equal(analytics.trend.visitors.at(-2).count, 0);
    assert.deepEqual(analytics.byDivision, [{ division: "ঢাকা", students: 2 }, { division: "Others", students: 1 }]);
    assert.deepEqual(analytics.byClass, [{ class: 8, students: 2 }, { class: 10, students: 1 }]);
    assert.deepEqual(analytics.topInstitutions, [{ institution: "School A", students: 2 }, { institution: "School B", students: 1 }]);
    assert.equal(analytics.gameScores.length, 10);
    assert.deepEqual(analytics.gameScores[0], { from: 0, to: 9, students: 1 });
    assert.deepEqual(analytics.gameScores[5], { from: 50, to: 59, students: 2 });
    assert.deepEqual(analytics.gameScores[9], { from: 90, to: 100, students: 3 });
});
