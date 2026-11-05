export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export function normalizeName(value: unknown): string {
    return typeof value === "string" ? value.normalize("NFC").trim().replace(/\s+/gu, " ") : "";
}

export function normalizeEmail(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizePhone(value: unknown): string {
    if (typeof value !== "string") return "";
    let phone = value.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit))).replace(/[\s()-]/g, "");
    if (phone.startsWith("+880")) phone = `0${phone.slice(4)}`;
    else if (phone.startsWith("880")) phone = `0${phone.slice(3)}`;
    return phone;
}

export function validateName(value: unknown): true | string {
    const name = normalizeName(value);
    if (!name) return "নাম আবশ্যক";
    if (name.length < 2 || name.length > 100) return "নাম ২ থেকে ১০০ অক্ষরের মধ্যে হতে হবে";
    if (!/^[\p{L}][\p{L}\p{M} .'’-]*$/u.test(name)) return "নামে শুধু অক্ষর, স্পেস, ডট, হাইফেন বা অ্যাপোস্ট্রফি ব্যবহার করুন";
    return true;
}

export function validateEmail(value: unknown): true | string {
    const email = normalizeEmail(value);
    if (!email) return "ইমেইল আবশ্যক";
    const local = email.split("@")[0];
    const pattern = /^[A-Z0-9.!#$%&'*+/=?^_\x60{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;
    if (email.length > 254 || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..") || !pattern.test(email)) return "সঠিক ইমেইল ঠিকানা দিন";
    return true;
}

export function validatePhone(value: unknown): true | string {
    const phone = normalizePhone(value);
    if (!phone) return "মোবাইল নম্বর আবশ্যক";
    return /^01[3-9]\d{8}$/.test(phone) || "সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন";
}

export function validateLoginPassword(value: unknown): true | string {
    if (typeof value !== "string" || !value.trim()) return "পাসওয়ার্ড আবশ্যক";
    if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) return "পাসওয়ার্ড সর্বোচ্চ ৭২ বাইট হতে পারবে";
    return true;
}

export function validatePassword(value: unknown): true | string {
    const result = validateLoginPassword(value);
    if (result !== true) return result;
    if (typeof value !== "string" || [...value].length < PASSWORD_MIN_LENGTH) return "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে";
    return true;
}
