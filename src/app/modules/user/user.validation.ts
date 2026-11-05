import type { NextFunction, Request, Response } from "express";
import type { IUser } from "../../../types/user";
import locations from "../../../data/bangladesh-locations.json";
import { normalizeEmail, normalizeName, normalizePhone, validateEmail, validateLoginPassword, validateName, validatePassword, validatePhone } from "../../../utils/userValidation";
import RequestValidationError from "../../errors/requestValidationError";

function bodyRecord(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new RequestValidationError({ body: "সঠিক তথ্য পাঠান" });
    return input as Record<string, unknown>;
}

export function parseRegistration(input: unknown): IUser {
    const body = bodyRecord(input);
    const errors: Record<string, string> = {};
    for (const [field, validate] of [
        ["fullName", validateName],
        ["email", validateEmail],
        ["guardianPhone", validatePhone],
        ["password", validatePassword],
    ] as const) {
        const result = validate(body[field]);
        if (result !== true) errors[field] = result;
    }
    const institution = normalizeName(body.institution);
    if (institution.length < 2 || institution.length > 200) errors.institution = "প্রতিষ্ঠানের নাম ২ থেকে ২০০ অক্ষরের মধ্যে দিন";
    const studentClass = typeof body.class === "number" ? body.class : typeof body.class === "string" && /^\d{1,2}$/.test(body.class) ? Number(body.class) : NaN;
    if (!Number.isInteger(studentClass) || studentClass < 0 || studentClass > 12) errors.class = "সঠিক শ্রেণি নির্বাচন করুন";
    const division = normalizeName(body.division);
    const district = normalizeName(body.district);
    const thana = normalizeName(body.thana);
    const selectedDivision = locations.find((item) => item.name === division);
    const selectedDistrict = selectedDivision?.districts.find((item) => item.name === district);
    if (!selectedDivision) errors.division = "সঠিক বিভাগ নির্বাচন করুন";
    if (!selectedDistrict) errors.district = "নির্বাচিত বিভাগের জেলা নির্বাচন করুন";
    if (!selectedDistrict?.thanas.includes(thana)) errors.thana = "নির্বাচিত জেলার থানা / উপজেলা নির্বাচন করুন";
    if (typeof body.confirmPassword !== "string" || !body.confirmPassword) errors.confirmPassword = "পাসওয়ার্ড আবার লিখুন";
    else if (body.confirmPassword !== body.password) errors.confirmPassword = "পাসওয়ার্ড দুটি মিলছে না";
    let profileImg: string | undefined;
    if (body.profileImg !== undefined && body.profileImg !== "") {
        try {
            if (typeof body.profileImg !== "string" || body.profileImg.length > 2048) throw new Error();
            const url = new URL(body.profileImg);
            if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
            profileImg = url.href;
        } catch {
            errors.profileImg = "সঠিক প্রোফাইল ছবির URL দিন";
        }
    }
    if (Object.keys(errors).length) throw new RequestValidationError(errors);
    return {
        fullName: normalizeName(body.fullName),
        email: normalizeEmail(body.email),
        institution,
        class: studentClass,
        guardianPhone: normalizePhone(body.guardianPhone),
        password: body.password as string,
        division,
        district,
        thana,
        ...(profileImg ? { profileImg } : {}),
    };
}

export function parseLogin(input: unknown) {
    const body = bodyRecord(input);
    const errors: Record<string, string> = {};
    const emailError = validateEmail(body.email);
    const passwordError = validateLoginPassword(body.password);
    if (emailError !== true) errors.email = emailError;
    if (passwordError !== true) errors.password = passwordError;
    if (Object.keys(errors).length) throw new RequestValidationError(errors);
    return { email: normalizeEmail(body.email), password: body.password as string };
}

export function validateRegistrationRequest(req: Request, _res: Response, next: NextFunction) {
    try { req.body = parseRegistration(req.body); next(); }
    catch (error) { next(error); }
}

export function validateLoginRequest(req: Request, _res: Response, next: NextFunction) {
    try { req.body = parseLogin(req.body); next(); }
    catch (error) { next(error); }
}
