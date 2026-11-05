import { normalizeName, normalizePhone, validateName, validatePhone, validatePassword, validateLoginPassword } from "../../../utils/userValidation";
import locations from "../../../data/bangladesh-locations.json";
import RequestValidationError from "../../errors/requestValidationError";

export type ProfileUpdate = Partial<{ fullName: string; institution: string; class: number; guardianPhone: string; division: string; district: string; thana: string }>;
function bodyRecord(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new RequestValidationError({ body: "সঠিক তথ্য পাঠান" });
    return input as Record<string, unknown>;
}

export function parseProfileUpdate(input: unknown): ProfileUpdate {
    const body = bodyRecord(input);
    const allowed = ["fullName", "institution", "class", "guardianPhone", "division", "district", "thana"];
    const errors: Record<string, string> = {};
    const update: ProfileUpdate = {};
    for (const field of Object.keys(body)) {
        if (!allowed.includes(field)) errors[field] = field === "email" ? "ইমেইল পরিবর্তন করা যাবে না" : "এই তথ্য পরিবর্তন করা যাবে না";
    }
    if (!Object.keys(body).length) errors.body = "পরিবর্তনের জন্য তথ্য দিন";
    for (const [field, validate, normalize] of [["fullName", validateName, normalizeName], ["guardianPhone", validatePhone, normalizePhone]] as const) {
        if (Object.hasOwn(body, field)) {
            const result = validate(body[field]);
            if (result !== true) errors[field] = result;
            else update[field] = normalize(body[field]);
        }
    }
    if (Object.hasOwn(body, "institution")) {
        const institution = normalizeName(body.institution);
        if (institution.length < 2 || institution.length > 200) errors.institution = "প্রতিষ্ঠানের নাম ২ থেকে ২০০ অক্ষরের মধ্যে দিন";
        else update.institution = institution;
    }
    if (Object.hasOwn(body, "class")) {
        const studentClass = typeof body.class === "number" ? body.class : typeof body.class === "string" && /^\d{1,2}$/.test(body.class) ? Number(body.class) : NaN;
        if (!Number.isInteger(studentClass) || studentClass < 0 || studentClass > 12) errors.class = "সঠিক শ্রেণি নির্বাচন করুন";
        else update.class = studentClass;
    }
    for (const field of ["division", "district", "thana"] as const) {
        if (Object.hasOwn(body, field)) {
            const value = normalizeName(body[field]);
            if (!value || value.length > 150) errors[field] = "সঠিক ঠিকানা নির্বাচন করুন";
            else update[field] = value;
        }
    }
    if (Object.keys(errors).length) throw new RequestValidationError(errors);
    return update;
}

export function validateProfileAddress(profile: { division: string | null; district: string | null; thana: string | null }) {
    const errors: Record<string, string> = {};
    const division = locations.find((item) => item.name === profile.division);
    const district = division?.districts.find((item) => item.name === profile.district);
    if (!division) errors.division = "সঠিক বিভাগ নির্বাচন করুন";
    if (!district) errors.district = "নির্বাচিত বিভাগের জেলা নির্বাচন করুন";
    if (!district?.thanas.includes(profile.thana ?? "")) errors.thana = "নির্বাচিত জেলার থানা / উপজেলা নির্বাচন করুন";
    if (Object.keys(errors).length) throw new RequestValidationError(errors);
}

export function parsePasswordChange(input: unknown) {
    const body = bodyRecord(input);
    const errors: Record<string, string> = {};
    const current = validateLoginPassword(body.currentPassword);
    const next = validatePassword(body.newPassword);
    if (current !== true) errors.currentPassword = current;
    if (next !== true) errors.newPassword = next;
    if (typeof body.confirmPassword !== "string" || !body.confirmPassword) errors.confirmPassword = "পাসওয়ার্ড আবার লিখুন";
    else if (body.confirmPassword !== body.newPassword) errors.confirmPassword = "পাসওয়ার্ড দুটি মিলছে না";
    if (body.currentPassword && body.currentPassword === body.newPassword) errors.newPassword = "নতুন পাসওয়ার্ড বর্তমান পাসওয়ার্ড থেকে আলাদা হতে হবে";
    if (Object.keys(errors).length) throw new RequestValidationError(errors);
    return { currentPassword: body.currentPassword as string, newPassword: body.newPassword as string };
}
