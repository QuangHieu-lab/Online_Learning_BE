/*
  Warnings:

  - Added the required column `month` to the `instructor_earnings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `instructor_earnings` ADD COLUMN `month` VARCHAR(7) NOT NULL,
    ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'unsettled';

-- CreateIndex
CREATE INDEX `instructor_earnings_month_idx` ON `instructor_earnings`(`month`);

-- CreateIndex
CREATE INDEX `instructor_earnings_status_idx` ON `instructor_earnings`(`status`);
