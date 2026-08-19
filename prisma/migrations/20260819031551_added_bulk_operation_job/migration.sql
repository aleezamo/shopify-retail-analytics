/*
  Warnings:

  - You are about to drop the column `createdAtg` on the `Shop` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "BulkOperationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bulkOperationGid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shop" (
    "shopDomain" TEXT NOT NULL PRIMARY KEY,
    "initialSyncCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shop" ("initialSyncCompleted", "shopDomain", "updatedAt") SELECT "initialSyncCompleted", "shopDomain", "updatedAt" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BulkOperationJob_bulkOperationGid_key" ON "BulkOperationJob"("bulkOperationGid");

-- CreateIndex
CREATE INDEX "BulkOperationJob_shop_idx" ON "BulkOperationJob"("shop");

-- CreateIndex
CREATE INDEX "BulkOperationJob_status_idx" ON "BulkOperationJob"("status");
