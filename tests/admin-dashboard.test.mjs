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
const students = [
    { id: "s1", fullName: "Rahim", institution: "School A", district: "ঢাকা", status: "active", division: "ঢাকা", createdAt: new Date(now - 1 * day) },
    { id: "s2", fullName: "Karim", institution: "School B", district: "Others", status: "active", division: "Others", createdAt: new Date(now - 2 * day) },
    { id: "s3", fullName: "Joy", institution: "School C", district: null, status: "blocked", division: null, createdAt: new Date(now - 30 * day) },
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
prisma.student.findMany = async ({ take }) => [...students]
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, take)
    .map(({ id, fullName, institution, district, createdAt }) => ({ id, fullName, institution, district, createdAt }));
prisma.siteCounter.findUnique = async () => ({ key: "visits", value: 42 });
prisma.blogPost.count = async ({ where }) => blogs.filter(b => b.status === where.status).length;
prisma.blogPost.findMany = async ({ take }) => blogs.slice(0, take);
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
    assert.deepEqual(data.students, { active: 2, blocked: 1, newThisWeek: 2, bangladesh: 1, otherCountries: 1 });
    assert.equal(data.visitors, 42);
    assert.deepEqual(data.blogs, { published: 1, pending: 1 });
    assert.equal(data.gamePlayers, 7);
    assert.deepEqual(data.content, { stories: 3, homeVideos: 4, galleryImages: 9, comics: 2, flyers: 0, news: 5, schools: 6 });
    assert.deepEqual(data.recentStudents.map(s => s.fullName), ["Rahim", "Karim", "Joy"]);
    assert.deepEqual(data.recentBlogs.map(b => [b.title, b.status, b.authorName]), [["Rain", "pending", "Rahim"], ["Storms", "published", "Admin"]]);
    assert.ok(!("author" in data.recentBlogs[0]));
});
