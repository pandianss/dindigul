-- AlterTable
ALTER TABLE "letters" ADD COLUMN     "contentHi" TEXT,
ADD COLUMN     "titleHi" TEXT,
ALTER COLUMN "type" SET DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "letter_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "subjectEn" TEXT NOT NULL,
    "subjectTa" TEXT,
    "subjectHi" TEXT,
    "bodyEn" TEXT NOT NULL,
    "bodyTa" TEXT,
    "bodyHi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "letter_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "letter_templates_code_key" ON "letter_templates"("code");
