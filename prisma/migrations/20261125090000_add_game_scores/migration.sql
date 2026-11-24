-- CreateTable
CREATE TABLE "GameScore" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "time" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameScore_studentId_key" ON "GameScore"("studentId");

-- CreateIndex
CREATE INDEX "GameScore_score_time_createdAt_idx" ON "GameScore"("score" DESC, "time", "createdAt");

-- AddForeignKey
ALTER TABLE "GameScore" ADD CONSTRAINT "GameScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
