-- AlterTable
ALTER TABLE "letters" ADD COLUMN     "previousVersionId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "office_notes" ADD COLUMN     "previousVersionId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "letters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_notes" ADD CONSTRAINT "office_notes_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "office_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
