-- CreateTable
CREATE TABLE "DocumentPresence" (
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentPresence_pkey" PRIMARY KEY ("documentId","userId")
);

-- CreateIndex
CREATE INDEX "DocumentPresence_documentId_lastSeenAt_idx" ON "DocumentPresence"("documentId", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "DocumentPresence" ADD CONSTRAINT "DocumentPresence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPresence" ADD CONSTRAINT "DocumentPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
