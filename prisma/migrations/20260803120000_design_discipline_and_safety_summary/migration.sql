-- CreateTable
CREATE TABLE "DesignDisciplineStat" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "planned" DOUBLE PRECISION NOT NULL,
    "actual" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DesignDisciplineStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetySummary" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ltiFreeDays" INTEGER NOT NULL DEFAULT 0,
    "totalManhours" INTEGER NOT NULL DEFAULT 0,
    "openFindings" INTEGER NOT NULL DEFAULT 0,
    "closedFindings" INTEGER NOT NULL DEFAULT 0,
    "overdueFindings" INTEGER NOT NULL DEFAULT 0,
    "safetyScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "permitsIssuedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "toolboxTalksThisMonth" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DesignDisciplineStat_projectId_discipline_key" ON "DesignDisciplineStat"("projectId", "discipline");

-- CreateIndex
CREATE UNIQUE INDEX "SafetySummary_projectId_key" ON "SafetySummary"("projectId");

-- AddForeignKey
ALTER TABLE "DesignDisciplineStat" ADD CONSTRAINT "DesignDisciplineStat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetySummary" ADD CONSTRAINT "SafetySummary_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

