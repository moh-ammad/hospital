/*
  Warnings:

  - You are about to alter the column `createdtime` on the `lead` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.
  - You are about to alter the column `modifiedtime` on the `lead` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.

*/
-- AlterTable
ALTER TABLE `lead` ADD COLUMN `cf_945` VARCHAR(191) NULL,
    ADD COLUMN `cf_947` TEXT NULL,
    MODIFY `source` VARCHAR(191) NULL DEFAULT 'CRM',
    MODIFY `starred` VARCHAR(191) NULL DEFAULT '0',
    MODIFY `cf_941` VARCHAR(191) NULL DEFAULT 'Pending',
    MODIFY `cf_943` VARCHAR(191) NULL DEFAULT 'No',
    MODIFY `createdtime` DATETIME(3) NULL,
    MODIFY `modifiedtime` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Lead_vtigerId_idx` ON `Lead`(`vtigerId`);
