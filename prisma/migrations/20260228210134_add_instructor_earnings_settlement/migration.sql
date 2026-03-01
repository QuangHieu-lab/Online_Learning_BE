-- CreateTable
CREATE TABLE `instructor_earnings` (
    `earning_id` INTEGER NOT NULL AUTO_INCREMENT,
    `instructor_id` INTEGER NOT NULL,
    `order_detail_id` INTEGER NOT NULL,
    `transaction_id` INTEGER NOT NULL,
    `settlement_batch_id` INTEGER NULL,
    `gross_amount` DECIMAL(15, 2) NOT NULL,
    `platform_fee_amount` DECIMAL(15, 2) NOT NULL,
    `net_amount` DECIMAL(15, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `instructor_earnings_order_detail_id_key`(`order_detail_id`),
    INDEX `instructor_earnings_instructor_id_idx`(`instructor_id`),
    INDEX `instructor_earnings_transaction_id_idx`(`transaction_id`),
    INDEX `instructor_earnings_settlement_batch_id_idx`(`settlement_batch_id`),
    INDEX `instructor_earnings_created_at_idx`(`created_at`),
    PRIMARY KEY (`earning_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `instructor_settlement_batches` (
    `batch_id` INTEGER NOT NULL AUTO_INCREMENT,
    `instructor_id` INTEGER NOT NULL,
    `month` VARCHAR(7) NOT NULL,
    `total_gross` DECIMAL(15, 2) NOT NULL,
    `total_platform_fee` DECIMAL(15, 2) NOT NULL,
    `total_net` DECIMAL(15, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'generated',
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `instructor_settlement_batches_status_idx`(`status`),
    INDEX `instructor_settlement_batches_month_idx`(`month`),
    UNIQUE INDEX `instructor_settlement_batches_instructor_id_month_key`(`instructor_id`, `month`),
    PRIMARY KEY (`batch_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `instructor_earnings` ADD CONSTRAINT `instructor_earnings_settlement_batch_id_fkey` FOREIGN KEY (`settlement_batch_id`) REFERENCES `instructor_settlement_batches`(`batch_id`) ON DELETE SET NULL ON UPDATE CASCADE;
