-- CreateTable
CREATE TABLE "SiteVisitDay" (
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SiteVisitDay_pkey" PRIMARY KEY ("day")
);
