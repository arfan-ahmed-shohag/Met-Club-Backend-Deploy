import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { mkdtemp, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
process.env.NODE_ENV = 'test';
process.env.SALT_ROUNDS = '4';
process.env.TOKEN_SECRET = 'profile-test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'profile-test-refresh-secret';
process.env.TOKEN_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
const originalDirectory = process.cwd();
const testDirectory = await mkdtemp(path.join(tmpdir(), 'met-club-profile-test-'));
process.chdir(testDirectory);
const [{ default: app }, { prisma }] = await Promise.all([import('../src/app.ts'), import('../src/lib/prisma.ts')]);
const users = [
  { id: 'one', email: 'one@example.com', fullName: 'First User', studentId: 'Met-Club-1', institution: 'Test School', class: 7, guardianPhone: '01712345678', division: 'ঢাকা', district: 'ঢাকা', thana: 'ধানমন্ডি', role: 'student', status: 'active', profileImg: null, password: await bcrypt.hash('abc123', 4) },
  { id: 'two', email: 'two@example.com', fullName: 'Second User', studentId: 'Met-Club-2', institution: 'Other School', class: 0, guardianPhone: '01812345678', division: null, district: null, thana: null, role: 'student', status: 'active', profileImg: null, password: await bcrypt.hash('otherPassword', 4) },
];
const writes = [];
let failUpdate = false;
const select = (user, fields) => fields ? Object.fromEntries(Object.keys(fields).filter(key => fields[key]).map(key => [key, user[key]])) : { ...user };
const matches = (user, where) => Object.entries(where).every(([key, value]) => user[key] === value);
prisma.user.findUnique = async ({ where, select: fields }) => {
  const user = users.find(item => matches(item, where));
  return user ? select(user, fields) : null;
};
prisma.user.findFirst = async ({ where }) => {
  const user = users.find(item => item.email.toLowerCase() === where.email.equals.toLowerCase() && (!where.status || item.status === where.status));
  return user ? { ...user } : null;
};
prisma.user.update = async ({ where, data, select: fields }) => {
  if (failUpdate) throw new Error('Simulated persistence failure');
  const user = users.find(item => matches(item, where));
  assert.ok(user);
  writes.push({ id: user.id, data });
  Object.assign(user, data);
  return select(user, fields);
};
prisma.user.updateMany = async ({ where, data }) => {
  const matching = users.filter(item => matches(item, where));
  for (const user of matching) { writes.push({ id: user.id, data }); Object.assign(user, data); }
  return { count: matching.length };
};
const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
const base = `http://127.0.0.1:${server.address().port}/api/v1`;
after(async () => {
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
  process.chdir(originalDirectory);
  if (path.dirname(testDirectory) !== path.resolve(tmpdir()) || !path.basename(testDirectory).startsWith('met-club-profile-test-')) throw new Error('Invalid test cleanup target');
  await rm(testDirectory, { recursive: true, force: true });
});
const token = (email = users[0].email) => jwt.sign({ email, role: 'student' }, process.env.TOKEN_SECRET, { expiresIn: '5m' });
async function request(endpoint, body, authorization = `Bearer ${token()}`) {
  const multipart = body instanceof FormData;
  const response = await fetch(base + endpoint, { method: 'PATCH', headers: { ...(authorization ? { Authorization: authorization } : {}), ...(!multipart ? { 'Content-Type': 'application/json' } : {}) }, body: multipart ? body : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
const photo = (buffer, type = 'image/png', name = 'avatar.png') => { const form = new FormData(); form.append('photo', new Blob([buffer], { type }), name); return form; };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV4sAAAAASUVORK5CYII=', 'base64');

test('all profile mutation endpoints require an authenticated active account', async () => {
  const before = writes.length;
  for (const [route, payload] of [['/user/me', { fullName: 'Injected User' }], ['/user/me/photo', photo(png)], ['/auth/change-password', {}]]) {
    assert.equal((await request(route, payload, null)).status, 401);
    assert.equal((await request(route, payload, 'Bearer invalid')).status, 401);
  }
  users[1].status = 'blocked';
  assert.equal((await request('/user/me', { fullName: 'Blocked User' }, `Bearer ${token(users[1].email)}`)).status, 401);
  users[1].status = 'active';
  assert.equal(writes.length, before);
});
test('email, identity, role, status, image URL and password cannot be changed through the profile endpoint', async () => {
  for (const [field, value] of [['email', 'changed@example.com'], ['email', users[0].email], ['id', 'two'], ['studentId', 'ID'], ['role', 'admin'], ['status', 'blocked'], ['password', 'injected'], ['profileImg', 'https://example.com/image.png']]) {
    const before = writes.length;
    const result = await request('/user/me', { fullName: 'Changed User', [field]: value });
    assert.equal(result.status, 400, field);
    assert.equal(typeof result.body.errors[field], 'string');
    assert.equal(writes.length, before);
  }
  assert.equal(users[0].email, 'one@example.com');
});
test('profile validates input and location hierarchy without partially saving invalid requests', async () => {
  for (const [field, value] of [['fullName', ''], ['fullName', '123'], ['guardianPhone', '01212345678'], ['institution', ''], ['class', 13], ['class', null], ['division', 'invalid'], ['district', 'কুমিল্লা'], ['thana', 'invalid']]) {
    const before = writes.length;
    const result = await request('/user/me', { [field]: value });
    assert.equal(result.status, 400, field);
    assert.equal(typeof result.body.errors[field], 'string');
    assert.equal(writes.length, before);
  }
  assert.equal((await request('/user/me', {})).status, 400);
});
test('profile saves normalized editable values only for the authenticated user', async () => {
  const result = await request('/user/me', { fullName: '  Updated   User ', guardianPhone: '+৮৮০ ১৯১২-৩৪৫৬৭৮', institution: 'New School', class: '8', division: 'ঢাকা', district: 'গাজীপুর', thana: 'কালিয়াকৈর' });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.fullName, 'Updated User');
  assert.equal(result.body.data.guardianPhone, '01912345678');
  assert.equal(result.body.data.class, 8);
  assert.equal(result.body.data.thana, 'কালিয়াকৈর'.normalize('NFC'));
  assert.equal(result.body.data.email, 'one@example.com');
  assert.equal(users[1].fullName, 'Second User');
  assert.ok(!Object.hasOwn(result.body.data, 'password'));
  assert.equal((await request('/user/me', { fullName: 'Legacy User' }, `Bearer ${token(users[1].email)}`)).status, 200);
});
test('photo uploads reject missing, spoofed, SVG and oversized images', async () => {
  const before = writes.length;
  for (const form of [new FormData(), photo(Buffer.from('<svg/>'), 'image/svg+xml'), photo(Buffer.from('not an image'), 'image/png'), photo(Buffer.alloc(2 * 1024 * 1024 + 1), 'image/png')]) {
    const result = await request('/user/me/photo', form);
    assert.equal(result.status, 400);
    assert.equal(typeof result.body.errors.photo, 'string');
  }
  assert.equal(writes.length, before);
});
test('photo upload saves a generated filename and removes only the previous owned avatar', async () => {
  const first = await request('/user/me/photo', photo(png, 'image/png', '../../unsafe.png'));
  assert.equal(first.status, 200);
  assert.match(first.body.data.profileImg, /^\/uploads\/profiles\/[a-f0-9-]{36}\.png$/);
  const firstPath = path.join(testDirectory, first.body.data.profileImg);
  assert.deepEqual(await readFile(firstPath), png);
  const second = await request('/user/me/photo', photo(png));
  assert.equal(second.status, 200);
  assert.notEqual(second.body.data.profileImg, first.body.data.profileImg);
  await assert.rejects(access(firstPath));
  assert.equal(users[1].profileImg, null);
  assert.ok(!Object.hasOwn(second.body.data, 'password'));
  const { readdir } = await import('node:fs/promises');
  const before = await readdir(path.join(testDirectory, 'uploads/profiles'));
  failUpdate = true;
  const failed = await request('/user/me/photo', photo(png));
  failUpdate = false;
  assert.equal(failed.status, 500);
  assert.deepEqual(await readdir(path.join(testDirectory, 'uploads/profiles')), before, 'failed DB update cleans the new upload');
});
test('password rejects incorrect current password, weak, reused and mismatched new passwords', async () => {
  for (const [values, field] of [
    [{ currentPassword: '', newPassword: 'newPassword123', confirmPassword: 'newPassword123' }, 'currentPassword'],
    [{ currentPassword: 'wrong', newPassword: 'newPassword123', confirmPassword: 'newPassword123' }, 'currentPassword'],
    [{ currentPassword: 'abc123', newPassword: 'short', confirmPassword: 'short' }, 'newPassword'],
    [{ currentPassword: 'abc123', newPassword: 'newPassword123', confirmPassword: 'different' }, 'confirmPassword'],
    [{ currentPassword: 'oldPassword123', newPassword: 'oldPassword123', confirmPassword: 'oldPassword123' }, 'newPassword'],
  ]) {
    const before = writes.length;
    const result = await request('/auth/change-password', values);
    assert.equal(result.status, 400);
    assert.equal(typeof result.body.errors[field], 'string');
    assert.equal(writes.length, before);
  }
});
test('password is hashed, preserves email and profile, and only the new password can log in', async () => {
  const result = await request('/auth/change-password', { currentPassword: 'abc123', newPassword: 'newPassword123', confirmPassword: 'newPassword123', email: 'injected@example.com' });
  assert.equal(result.status, 200);
  assert.equal(result.body.data, null);
  assert.ok(await bcrypt.compare('newPassword123', users[0].password));
  assert.equal(await bcrypt.compare('abc123', users[0].password), false);
  assert.equal(users[0].email, 'one@example.com');
  assert.ok(await bcrypt.compare('otherPassword', users[1].password));
  for (const [password, expected] of [['abc123', 401], ['newPassword123', 200]]) {
    const response = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: users[0].email, password }) });
    assert.equal(response.status, expected);
  }
});
