-- Split profile data out of "User": "User" keeps only login data,
-- student and admin profiles move to their own tables linked by "userId".

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "class" INTEGER NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "division" TEXT,
    "district" TEXT,
    "thana" TEXT,
    "profileImg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "profileImg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- Copy existing profiles
INSERT INTO "Student" ("id", "userId", "studentId", "fullName", "institution", "class", "guardianPhone", "division", "district", "thana", "profileImg", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "studentId", "fullName", "institution", "class", "guardianPhone", "division", "district", "thana", "profileImg", "createdAt", "updatedAt"
FROM "User"
WHERE "role" = 'student';

INSERT INTO "Admin" ("id", "userId", "fullName", "profileImg", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "fullName", "profileImg", "createdAt", "updatedAt"
FROM "User"
WHERE "role" = 'admin';

-- DropIndex
DROP INDEX "User_studentId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "fullName",
DROP COLUMN "studentId",
DROP COLUMN "institution",
DROP COLUMN "class",
DROP COLUMN "guardianPhone",
DROP COLUMN "division",
DROP COLUMN "district",
DROP COLUMN "thana",
DROP COLUMN "profileImg";

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
