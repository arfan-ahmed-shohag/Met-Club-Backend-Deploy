import test, { after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

// Never connect these HTTP tests to the application's configured database.
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
process.env.NODE_ENV = "test";
process.env.SALT_ROUNDS = "4";
process.env.TOKEN_SECRET = "game-test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "game-test-refresh-secret";
process.env.TOKEN_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = "7d";

const [{ default: app }, { prisma }] = await Promise.all([import("../src/app.ts"), import("../src/lib/prisma.ts")]);

const accounts = [
    { email: "player@example.com", role: "student", status: "active", student: { id: "s-player", fullName: "Player One" } },
    { email: "admin@example.com", role: "admin", status: "active", student: null },
    { email: "blocked@example.com", role: "student", status: "blocked", student: { id: "s-blocked", fullName: "Blocked" } },
];
let scores = [];
let writes = 0;
let raceOnCreate = null;
const names = new Map(accounts.filter(a => a.student).map(a => [a.student.id, a.student.fullName]));

const rank = (a, b) => b.score - a.score || a.time - b.time || a.createdAt - b.createdAt;
const matchesNumber = (value, condition) =>
    typeof condition === "object"
        ? (condition.gt === undefined || value > condition.gt) && (condition.lt === undefined || value < condition.lt)
        : value === condition;
const matchesWhere = (row, where) => where.OR
    ? where.OR.some(part => matchesWhere(row, part))
    : Object.entries(where).every(([key, condition]) => matchesNumber(key === "createdAt" ? row.createdAt.getTime() : row[key], key === "createdAt" && condition.lt ? { lt: condition.lt.getTime() } : condition));
const pick = (row, select) => {
    const out = {};
    for (const key of Object.keys(select)) {
        if (key === "student") out.student = { fullName: names.get(row.studentId) };
        else out[key] = row[key];
    }
    return out;
};

prisma.user.findUnique = async ({ where }) => {
    const account = accounts.find(a => a.email === where.email && (!where.status || a.status === where.status));
    return account ? { id: account.email, email: account.email, role: account.role } : null;
};
prisma.student.findFirst = async ({ where }) => {
    const account = accounts.find(a => a.email === where.user.email && a.status === where.user.status);
    return account?.student ? { id: account.student.id } : null;
};
prisma.gameScore.findMany = async ({ take, select }) => [...scores].sort(rank).slice(0, take).map(row => pick(row, select));
prisma.gameScore.findUnique = async ({ where, select }) => {
    const row = scores.find(item => item.studentId === where.studentId);
    return row ? pick(row, select) : null;
};
prisma.gameScore.findUniqueOrThrow = async (args) => {
    const row = await prisma.gameScore.findUnique(args);
    if (!row) throw new Error("Not found");
    return row;
};
prisma.gameScore.create = async ({ data, select }) => {
    if (raceOnCreate) {
        scores.push(raceOnCreate);
        raceOnCreate = null;
        throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    }
    writes++;
    const row = { ...data, createdAt: new Date() };
    scores.push(row);
    return pick(row, select);
};
prisma.gameScore.count = async ({ where }) => scores.filter(row => matchesWhere(row, where)).length;

const server = await new Promise(resolve => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
});
const base = "http://127.0.0.1:" + server.address().port + "/api/v1/game";
after(async () => { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); });
beforeEach(() => { scores = []; writes = 0; raceOnCreate = null; });

const token = (email, role = "student") => "Bearer " + jwt.sign({ email, role }, process.env.TOKEN_SECRET, { expiresIn: "5m" });
async function submit(body, authorization = token("player@example.com")) {
    const response = await fetch(base + "/score", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
        body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
}
const seed = (count, make) => {
    for (let i = 0; i < count; i++) {
        const row = make(i);
        names.set(row.studentId, row.name ?? "Student " + i);
        scores.push({ studentId: row.studentId, score: row.score, time: row.time, createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, row.order ?? i)) });
    }
};

test("leaderboard is public, ranks by score then time then first played, and returns only the top 7", async () => {
    seed(10, i => ({ studentId: "s" + i, score: 50, time: 100 - i, name: "Student " + i }));
    scores.push({ studentId: "best", score: 90, time: 500, createdAt: new Date(Date.UTC(2026, 0, 2)) });
    names.set("best", "Top Scorer");
    // Same score and time as Student 9 (time 91), but played later: ranks after it.
    scores.push({ studentId: "late", score: 50, time: 91, createdAt: new Date(Date.UTC(2026, 0, 3)) });
    names.set("late", "Late Twin");

    const response = await fetch(base + "/leaderboard");
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.length, 7);
    assert.deepEqual(body.data.map(row => row.position), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(body.data[0], { position: 1, name: "Top Scorer", score: 90, time: 500 });
    assert.deepEqual(body.data.slice(1, 4).map(row => row.name), ["Student 9", "Late Twin", "Student 8"]);
    for (const row of body.data) assert.deepEqual(Object.keys(row).sort(), ["name", "position", "score", "time"]);
});

test("leaderboard is an empty list before anyone plays", async () => {
    const body = await fetch(base + "/leaderboard").then(r => r.json());
    assert.deepEqual(body.data, []);
});

test("score submission requires an active student", async () => {
    assert.equal((await submit({ score: 10, time: 30 }, null)).status, 401);
    assert.equal((await submit({ score: 10, time: 30 }, "Bearer invalid")).status, 401);
    assert.equal((await submit({ score: 10, time: 30 }, token("blocked@example.com"))).status, 401);
    assert.equal((await submit({ score: 10, time: 30 }, token("admin@example.com", "admin"))).status, 403);
    assert.equal(writes, 0);
});

test("invalid score or time returns field errors and saves nothing", async () => {
    for (const [field, body] of [
        ["score", { score: 101, time: 30 }], ["score", { score: -1, time: 30 }], ["score", { score: 5.5, time: 30 }],
        ["score", { score: "50", time: 30 }], ["score", { time: 30 }],
        ["time", { score: 10, time: 0 }], ["time", { score: 10, time: -2 }], ["time", { score: 10, time: "30" }],
        ["time", { score: 10, time: 86401 }], ["time", { score: 10 }],
    ]) {
        const result = await submit(body);
        assert.equal(result.status, 400, JSON.stringify(body));
        assert.equal(typeof result.body.errors[field], "string");
    }
    assert.equal((await submit([1, 2])).status, 400);
    assert.equal(writes, 0);
});

test("only the first finished game is recorded", async () => {
    seed(3, i => ({ studentId: "s" + i, score: 80 + i, time: 20 }));
    const first = await submit({ score: 70, time: 45.12345 });
    assert.equal(first.status, 201);
    assert.deepEqual(first.body.data, { recorded: true, result: { score: 70, time: 45.123 }, position: 4, inLeaderboard: true });

    const second = await submit({ score: 100, time: 5 });
    assert.equal(second.status, 200);
    assert.deepEqual(second.body.data, { recorded: false, result: { score: 70, time: 45.123 }, position: 4, inLeaderboard: true });
    assert.equal(writes, 1);
    assert.equal(scores.filter(row => row.studentId === "s-player").length, 1);
});

test("players outside the top 7 still get their own position", async () => {
    seed(8, i => ({ studentId: "s" + i, score: 60, time: 10 + i }));
    // Same score as everyone, slower than all eight: 9th place.
    const result = await submit({ score: 60, time: 30 });
    assert.equal(result.status, 201);
    assert.equal(result.body.data.position, 9);
    assert.equal(result.body.data.inLeaderboard, false);
});

test("a parallel first submission keeps the result that was saved first", async () => {
    raceOnCreate = { studentId: "s-player", score: 40, time: 12, createdAt: new Date() };
    const result = await submit({ score: 99, time: 3 });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.recorded, false);
    assert.deepEqual(result.body.data.result, { score: 40, time: 12 });
});

test("CORS allows the game subdomain with credentials", async () => {
    const response = await fetch(base + "/score", {
        method: "OPTIONS",
        headers: { Origin: "https://game.meteorologyclub.com", "Access-Control-Request-Method": "PATCH", "Access-Control-Request-Headers": "authorization,content-type" },
    });
    assert.equal(response.headers.get("access-control-allow-origin"), "https://game.meteorologyclub.com");
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
    assert.match(response.headers.get("access-control-allow-methods"), /PATCH/);
});
