-- AlterTable
ALTER TABLE `courses` MODIFY `level_required` ENUM('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2') NULL DEFAULT 'A0',
    MODIFY `level_target` ENUM('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2') NULL;
