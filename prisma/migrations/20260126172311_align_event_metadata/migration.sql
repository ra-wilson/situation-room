/*
  Warnings:

  - Added the required column `lastSeenAt` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('low', 'medium', 'high');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "severity" "Severity" NOT NULL DEFAULT 'low';

-- AlterTable
ALTER TABLE "EventOutput" ADD COLUMN     "inputHash" TEXT;
