const studentProfileSelect = {
  studentId: true,
  fullName: true,
  institution: true,
  class: true,
  guardianPhone: true,
  division: true,
  district: true,
  thana: true,
  profileImg: true,
} as const;

const adminProfileSelect = {
  fullName: true,
  profileImg: true,
} as const;

// Never selects the password hash. Pass the result through toPublicUser.
export const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  student: { select: studentProfileSelect },
  admin: { select: adminProfileSelect },
} as const;

type ProfileSource = {
  student?: Partial<Record<keyof typeof studentProfileSelect, unknown>> | null;
  admin?: Partial<Record<keyof typeof adminProfileSelect, unknown>> | null;
};

type StudentProfile = {
  studentId: string;
  fullName: string;
  institution: string;
  class: number;
  guardianPhone: string;
  division: string | null;
  district: string | null;
  thana: string | null;
  profileImg: string | null;
};

/**
 * Flattens the account and its role profile into one object so API clients
 * keep receiving `{ id, email, role, fullName, profileImg, ... }`.
 * Student-only fields are null for admins.
 */
export function toPublicUser<T extends ProfileSource>(user: T) {
  const { student, admin, ...account } = user;
  const s = (student ?? null) as StudentProfile | null;
  const a = (admin ?? null) as { fullName: string; profileImg: string | null } | null;
  return {
    ...account,
    fullName: s?.fullName ?? a?.fullName ?? "",
    profileImg: s?.profileImg ?? a?.profileImg ?? null,
    studentId: s?.studentId ?? null,
    institution: s?.institution ?? null,
    class: s?.class ?? null,
    guardianPhone: s?.guardianPhone ?? null,
    division: s?.division ?? null,
    district: s?.district ?? null,
    thana: s?.thana ?? null,
  };
}

// Author summary for blog posts: name and photo from whichever profile exists.
export const authorProfileSelect = {
  student: { select: { fullName: true, profileImg: true } },
  admin: { select: { fullName: true, profileImg: true } },
} as const;

export function toAuthor<T extends ProfileSource>(author: T) {
  const { student, admin, ...rest } = author;
  const profile = (student ?? admin ?? null) as
    | { fullName: string; profileImg: string | null }
    | null;
  return {
    ...rest,
    fullName: profile?.fullName ?? "",
    profileImg: profile?.profileImg ?? null,
  };
}
