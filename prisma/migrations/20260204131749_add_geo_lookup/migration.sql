-- CreateEnum
CREATE TYPE "GeoPrecision" AS ENUM ('country', 'city', 'region', 'unknown');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "geoLabel" TEXT;
ALTER TABLE "Event" ADD COLUMN "geoPrecision" "GeoPrecision";

-- CreateTable
CREATE TABLE "GeoLookup" (
    "query" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeoLookup_pkey" PRIMARY KEY ("query")
);
