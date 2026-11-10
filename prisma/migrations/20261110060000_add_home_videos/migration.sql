CREATE TABLE "HomeVideo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "videoLink" TEXT NOT NULL,
    "thumbnailImage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HomeVideo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomeVideo_createdAt_idx" ON "HomeVideo"("createdAt");