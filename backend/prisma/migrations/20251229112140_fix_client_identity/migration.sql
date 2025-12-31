/*
  Warnings:

  - A unique constraint covering the columns `[intakeQKey]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Client_name_key` ON `client`;

-- CreateIndex
CREATE UNIQUE INDEX `Client_intakeQKey_key` ON `Client`(`intakeQKey`);
