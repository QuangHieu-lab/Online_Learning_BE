/*
  Warnings:

  - A unique constraint covering the columns `[enrollment_id,lesson_id]` on the table `learning_progress` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `learning_progress_enrollment_id_lesson_id_key` ON `learning_progress`(`enrollment_id`, `lesson_id`);
