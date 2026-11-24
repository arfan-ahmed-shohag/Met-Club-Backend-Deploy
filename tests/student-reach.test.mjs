import test, { after } from "node:test";
import assert from "node:assert/strict";

// Never connect these HTTP tests to the application's configured database.
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
process.env.NODE_ENV = "test";
process.env.TOKEN_SECRET = "stats-test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "stats-test-refresh-secret";
process.env.TOKEN_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = "7d";

const [{ default: app }, { prisma }] = await Promise.all([import("../src/app.ts"), import("../src/lib/prisma.ts")]);

const students = [
    { status: "active", division: "ঢাকা", district: "ঢাকা", institution: "School A" },
    { status: "active", division: "ঢাকা", district: "ঢাকা", institution: "School A" },
    { status: "active", division: "বরিশাল", district: "পটুয়াখালী", institution: "School B" },
    { status: "active", division: null, district: null, institution: "School C" },
    { status: "active", division: "ঢাকা", district: "Not a district", institution: " " },
    { status: "blocked", division: "সিলেট", district: "সিলেট", institution: "School D" },
];
const visible = (where) => students.filter(s =>
    s.status === where.user.status &&
    Object.entries(where).every(([key, value]) => key === "user" || (value?.not === null ? s[key] !== null : s[key] === value)));

prisma.student.count = async ({ where }) => visible(where).length;
prisma.student.groupBy = async ({ by: [field], where, _count }) => {
    const groups = new Map();
    for (const s of visible(where)) groups.set(s[field], (groups.get(s[field]) ?? 0) + 1);
    return [...groups].map(([key, count]) => ({ [field]: key, ...(_count ? { _count: { _all: count } } : {}) }));
};

const server = await new Promise(resolve => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
});
after(async () => { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); });

test("GET /stats/student-reach returns aggregate counts for active students only", async () => {
    const res = await fetch("http://127.0.0.1:" + server.address().port + "/api/v1/stats/student-reach");
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.deepEqual(data, {
        totalStudents: 5,
        totalDistricts: 64,
        districtsReached: 2,
        divisionsReached: 2,
        institutions: 3,
        districts: [
            { district: "ঢাকা", students: 2 },
            { district: "পটুয়াখালী", students: 1 },
        ],
    });
});
