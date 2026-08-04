import { Router } from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { readFile, unlink } from "node:fs/promises";
import { logger } from "../lib/logger";
import { requireAdmin } from "../middlewares/admin-auth";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/");
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${randomUUID()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const router = Router();

router.post("/uploads", requireAdmin, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "Upload failed" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const fileBytes = await readFile(req.file.path);
    const isPng =
      fileBytes.length >= 8 &&
      fileBytes.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    const isJpeg =
      fileBytes.length >= 3 &&
      fileBytes[0] === 0xff &&
      fileBytes[1] === 0xd8 &&
      fileBytes[2] === 0xff;
    const isWebp =
      fileBytes.length >= 12 &&
      fileBytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      fileBytes.subarray(8, 12).toString("ascii") === "WEBP";

    if (!isPng && !isJpeg && !isWebp) {
      await unlink(req.file.path).catch(() => undefined);
      res.status(400).json({ error: "The uploaded file is not a valid PNG, JPG, or WebP image." });
      return;
    }

    const baseUrl = process.env.REPLIT_DEPLOYMENT_URL
      ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
      : `http://localhost:${process.env.PORT ?? 5000}`;

    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    logger.info({ filename: req.file.filename, originalname: req.file.originalname }, "Image uploaded");

    res.json({ url: fileUrl });
  });
});

export default router;
