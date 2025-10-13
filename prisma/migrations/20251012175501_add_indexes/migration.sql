-- CreateIndex
CREATE INDEX `Alliance_pixelsPainted_idx` ON `Alliance`(`pixelsPainted`);

-- CreateIndex
CREATE INDEX `Pixel_paintedAt_idx` ON `Pixel`(`paintedAt`);

-- CreateIndex
CREATE INDEX `Pixel_paintedBy_paintedAt_idx` ON `Pixel`(`paintedBy`, `paintedAt`);

-- CreateIndex
CREATE INDEX `User_role_pixelsPainted_idx` ON `User`(`role`, `pixelsPainted`);

-- CreateIndex
CREATE INDEX `User_pixelsPainted_idx` ON `User`(`pixelsPainted`);
