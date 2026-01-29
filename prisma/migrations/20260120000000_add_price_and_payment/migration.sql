-- Add price field to Course table
ALTER TABLE `Course` ADD COLUMN `price` DOUBLE NOT NULL DEFAULT 0;

-- Create Payment table
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `vnpayTxnRef` VARCHAR(191) NOT NULL,
    `vnpayOrderId` VARCHAR(191) NULL,
    `vnpayResponseCode` VARCHAR(191) NULL,
    `vnpayMessage` TEXT NULL,
    `paymentUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `paidAt` DATETIME(3) NULL,

    UNIQUE INDEX `Payment_vnpayTxnRef_key`(`vnpayTxnRef`),
    INDEX `Payment_userId_idx`(`userId`),
    INDEX `Payment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign keys for Payment table
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add paymentId column to Enrollment table
ALTER TABLE `Enrollment` ADD COLUMN `paymentId` VARCHAR(191) NULL;

-- Add unique constraint on paymentId in Enrollment
CREATE UNIQUE INDEX `Enrollment_paymentId_key` ON `Enrollment`(`paymentId`);

-- Add foreign key from Enrollment.paymentId to Payment.id
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
