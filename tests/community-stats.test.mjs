import test, { after } from "node:test";
import assert from "node:assert/strict";

// Never connect these HTTP tests to the application's configured database.
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
process.env.NODE_ENV = "test";
process.env.TOKEN_SECRET = "community-test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "community-test-refresh-secret";
process.env.TOKEN_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = "7d";

const [{ default: app }, { prisma }, { VISIT_LIMIT }] = await Promise.all([
    import("../src/app.ts"),
    import("../src/lib/prisma.ts"),
    import("../src/utils/visitRateLimit.ts"),
]);

const students = [
    { status: "active", division: "ঢাকা" },
    { status: "active", division: "বরিশাল" },
    { status: "active", division: null },
    { status: "active", division: "Others" },
    { status: "blocked", division: "Others" },
    { status: "blocked", division: "সিলেট" },
];
const counters = new Map();

prisma.student.count = async ({ where }) => students.filter(s =>
    s.status === where.user.status && (where.division === undefined || s.division === where.division)).length;
prisma.siteCounter.findUnique = async ({ where }) =>
    counters.has(where.key) ? { key: where.key, value: counters.get(where.key) } : null;
prisma.siteCounter.upsert = async ({ where, create, update }) => {
    const value = counters.has(where.key) ? counters.get(where.key) + update.value.increment : create.value;
    counters.set(where.key, value);
    return { key: where.key, value };
};

const server = await new Promise(resolve => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
});
after(async () => { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); });
const url = path => "http://127.0.0.1:" + server.address().port + "/api/v1/stats" + path;
const totalVisitors = async () => (await (await fetch(url("/community"))).json()).data.totalVisitors;
// The test client is on loopback, so the app trusts X-Forwarded-For like it does from nginx.
const visitFrom = ip => fetch(url("/visit"), { method: "POST", headers: ip ? { "X-Forwarded-For": ip } : {} });

test("GET /stats/community splits active students by Bangladesh vs other countries", async () => {
    const res = await fetch(url("/community"));
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.deepEqual(data, { totalVisitors: 0, bangladeshUsers: 3, otherCountryUsers: 1 });
});

test("POST /stats/visit counts every visit the frontend sends", async () => {
    const before = await totalVisitors();
    for (const ip of ["203.0.113.5", "203.0.113.5", "198.51.100.7"]) assert.equal((await visitFrom(ip)).status, 200);
    assert.equal(await totalVisitors(), before + 3);
});

test("POST /stats/visit rate-limits one IP but not other IPs or a missing client IP", async () => {
    const ip = "192.0.2.44";
    for (let i = 0; i < VISIT_LIMIT; i++) assert.equal((await visitFrom(ip)).status, 200);
    const before = await totalVisitors();
    assert.equal((await visitFrom(ip)).status, 429);
    assert.equal(await totalVisitors(), before);
    assert.equal((await visitFrom("192.0.2.45")).status, 200);
    // No X-Forwarded-For: the request looks like loopback and is never limited.
    for (let i = 0; i <= VISIT_LIMIT; i++) assert.equal((await visitFrom()).status, 200);
});
