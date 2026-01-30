/*
  Warnings:

  - The values [INSTRUCTOR] on the enum `User_role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('ADMIN', 'LECTURER', 'STUDENT', 'PAIDSTUDENT') NOT NULL DEFAULT 'STUDENT';
