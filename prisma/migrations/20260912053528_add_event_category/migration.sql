-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('LODGING', 'FOOD', 'ACTIVITY', 'TRANSPORT', 'OTHER');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "category" "EventCategory";
