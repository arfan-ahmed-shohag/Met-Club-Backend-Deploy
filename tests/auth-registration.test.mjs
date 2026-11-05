import test, { after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Never connect these HTTP tests to the application's configured database.
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
process.env.NODE_ENV = "test";
process.env.SALT_ROUNDS = "4";
process.env.TOKEN_SECRET = "registration-test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "registration-test-refresh-secret";
process.env.TOKEN_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = "7d";

const [{ default: app }, { prisma }] = await Promise.all([import("../src/app.ts"), import("../src/lib/prisma.ts")]);
const accounts = new Map();
const legacyUser = {
    id: "existing-user", fullName: "প্রকৃত শিক্ষার্থী", email: "Legacy@Example.com", studentId: "Met-Club-10",
    institution: "Test School", class: 7, guardianPhone: "01712345678", division: "ঢাকা", district: "ঢাকা", thana: "ধানমন্ডি",
    password: await bcrypt.hash("abc123", 4), role: "student", status: "active", profileImg: null,
};
accounts.set(legacyUser.email.toLowerCase(), legacyUser);
accounts.set("blocked@example.com", { ...legacyUser, email: "blocked@example.com", status: "blocked" });
let databaseCalls = 0;
let savedRegistration;
const selected = (record, select) => record ? select ? Object.fromEntries(Object.keys(select).filter(key => select[key]).map(key => [key, record[key]])) : { ...record } : null;
prisma.user.findFirst = async (args) => {
    databaseCalls++;
    if (args.orderBy) return { studentId: "Met-Club-10" };
    const email = args.where.email.equals.toLowerCase();
    const record = accounts.get(email);
    return record && (!args.where.status || record.status === args.where.status) ? selected(record, args.select) : null;
};
prisma.user.findUnique = async (args) => {
    databaseCalls++;
    const record = accounts.get(args.where.email.toLowerCase());
    return record && (!args.where.status || record.status === args.where.status) ? selected(record, args.select) : null;
};
prisma.$transaction = async (callback) => callback({
    user: { create: async ({ data, select }) => {
        databaseCalls++;
        savedRegistration = { ...data };
        const record = { ...data, id: "new-user", status: "active", profileImg: data.profileImg ?? null };
        accounts.set(record.email.toLowerCase(), record);
        return selected(record, select);
    } },
    isChapterComplete: { createMany: async ({ data }) => {
        assert.equal(data.length, 4);
        return { count: data.length };
    } },
});

const server = await new Promise(resolve => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
});
const base = "http://127.0.0.1:" + server.address().port + "/api/v1";
after(async () => { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); });
const valid = {
    fullName: "রাহেলা বেগম", email: "new@example.com", institution: "Example School", class: 7,
    guardianPhone: "01712345678", password: "password123", confirmPassword: "password123",
    division: "ঢাকা", district: "ঢাকা", thana: "ধানমন্ডি",
};
async function request(path, options = {}) {
    const response = await fetch(base + path, options);
    return { response, body: await response.json() };
}
const post = (path, body) => request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("invalid registration fields return structured 400 errors before any DB work", async () => {
    for (const [field, value] of [
        ["fullName", ""], ["fullName", "12345"], ["fullName", "<script>"], ["fullName", 123],
        ["email", ""], ["email", "invalid"], ["email", "a@bad..com"], ["email", "a@-bad.com"],
        ["guardianPhone", ""], ["guardianPhone", "01212345678"], ["guardianPhone", "0171234567"], ["guardianPhone", 1712345678],
        ["password", "1234567"], ["password", "        "], ["password", "অ".repeat(25)],
        ["institution", ""], ["class", -1], ["class", 13], ["class", null],
        ["division", "অজানা বিভাগ"], ["district", "কুমিল্লা"], ["thana", "অজানা থানা"],
        ["confirmPassword", ""], ["confirmPassword", "different"],
    ]) {
        const before = databaseCalls;
        const payload = { ...valid, [field]: value };
        if (field === "password") payload.confirmPassword = value;
        const { response, body } = await post("/user", payload);
        assert.equal(response.status, 400, field + ": " + JSON.stringify(value));
        assert.equal(body.success, false);
        assert.equal(typeof body.errors[field], "string");
        assert.equal(databaseCalls, before, "invalid input must never reach persistence");
    }
});

test("registration normalizes required fields, saves all locations, and never persists confirmation or injected account fields", async () => {
    const { response, body } = await post("/user", {
        ...valid, fullName: "  রাহেলা   বেগম  ", email: " NEW@EXAMPLE.COM ", guardianPhone: " +৮৮০ ১৭১২-৩৪৫৬৭৮ ",
        role: "admin", status: "blocked", studentId: "INJECTED",
    });
    assert.equal(response.status, 201);
    assert.equal(body.data.fullName, "রাহেলা বেগম");
    assert.equal(body.data.email, "new@example.com");
    assert.equal(body.data.guardianPhone, "01712345678");
    for (const field of ["division", "district", "thana"]) assert.equal(body.data[field], valid[field]);
    assert.equal(savedRegistration.role, "student");
    assert.notEqual(savedRegistration.studentId, "INJECTED");
    assert.ok(!Object.hasOwn(savedRegistration, "status"));
    assert.ok(!Object.hasOwn(savedRegistration, "confirmPassword"));
    assert.ok(await bcrypt.compare(valid.password, savedRegistration.password));
    for (const field of ["password", "confirmPassword", "refreshToken"]) assert.ok(!Object.hasOwn(body.data, field));
    assert.equal(jwt.verify(body.data.accessToken, process.env.TOKEN_SECRET).role, "student");
    assert.match(response.headers.get("set-cookie"), /refreshToken=.*HttpOnly.*SameSite=Lax/i);
});

test("duplicate email returns a field error even when the submitted case differs", async () => {
    const { response, body } = await post("/user", { ...valid, email: "LEGACY@EXAMPLE.COM" });
    assert.equal(response.status, 409);
    assert.equal(typeof body.errors.email, "string");
});

test("login validates its inputs and supports existing shorter passwords", async () => {
    const invalid = await post("/auth/login", { email: "invalid", password: "" });
    assert.equal(invalid.response.status, 400);
    assert.equal(typeof invalid.body.errors.email, "string");
    assert.equal(typeof invalid.body.errors.password, "string");
    const { response, body } = await post("/auth/login", { email: " LEGACY@EXAMPLE.COM ", password: "abc123" });
    assert.equal(response.status, 200);
    assert.equal(body.data.user.email, legacyUser.email);
    assert.ok(body.data.accessToken);
    const cookie = response.headers.get("set-cookie").match(/refreshToken=([^;]+)/)[0];
    const refreshed = await request("/auth/refresh-token", { headers: { Cookie: cookie } });
    assert.equal(refreshed.response.status, 200);
    assert.ok(refreshed.body.data.accessToken);
});

test("GET /auth/me returns the authenticated DB user without credentials", async () => {
    const token = jwt.sign({ email: legacyUser.email, role: "student" }, process.env.TOKEN_SECRET, { expiresIn: "5m" });
    const { response, body } = await request("/auth/me", { headers: { Authorization: "Bearer " + token } });
    assert.equal(response.status, 200);
    assert.equal(body.data.id, legacyUser.id);
    assert.equal(body.data.fullName, legacyUser.fullName);
    assert.equal(body.data.email, legacyUser.email);
    for (const field of ["password", "confirmPassword", "accessToken", "refreshToken"]) assert.ok(!Object.hasOwn(body.data, field));
});

test("current-user requests reject missing, invalid, expired and blocked sessions", async () => {
    const expired = jwt.sign({ email: legacyUser.email, role: "student" }, process.env.TOKEN_SECRET, { expiresIn: -1 });
    const blocked = jwt.sign({ email: "blocked@example.com", role: "student" }, process.env.TOKEN_SECRET, { expiresIn: "5m" });
    for (const authorization of [undefined, "invalid", "Bearer invalid", "Bearer " + expired, "Bearer " + blocked]) {
        const { response } = await request("/auth/me", { headers: authorization ? { Authorization: authorization } : {} });
        assert.equal(response.status, 401);
    }
    const refresh = await request("/auth/refresh-token");
    assert.equal(refresh.response.status, 401);
    const logout = await request("/auth/logout");
    assert.equal(logout.response.status, 200);
    assert.match(logout.response.headers.get("set-cookie"), /refreshToken=;/);
});
