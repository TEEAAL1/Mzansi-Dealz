import { Router } from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { readFile, unlink } from "node:fs/promises";
import { logger } from "../lib/logger";
import { requireAdmin } from "../middlewares/admin-auth";
import { removeUploadedFileIfOwned } from "../services/upload-files";
import { uploadPublicObject } from "../lib/public-object-storage";

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
  upload.array("images", 12)(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "Upload failed" });
      return;
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length && req.file) files.push(req.file);
    if (!files.length) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const urls: string[] = [];
    for (const file of files) {
      const fileBytes = await readFile(file.path);
      const isPng = fileBytes.length >= 8 && fileBytes.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
      const isJpeg = fileBytes.length >= 3 && fileBytes[0] === 0xff && fileBytes[1] === 0xd8 && fileBytes[2] === 0xff;
      const isWebp = fileBytes.length >= 12 && fileBytes.subarray(0, 4).toString("ascii") === "RIFF" && fileBytes.subarray(8, 12).toString("ascii") === "WEBP";
      if (!isPng && !isJpeg && !isWebp) {
        await Promise.all(files.map((candidate) => unlink(candidate.path).catch(() => undefined)));
        res.status(400).json({ error: "The uploaded file is not a valid PNG, JPG, or WebP image." });
        return;
      }

      const extension = path.extname(file.originalname).toLowerCase() || ".jpg";
      const durablePath = `uploads/products/admin-${randomUUID()}${extension}`;
      try {
        urls.push(await uploadPublicObject(durablePath, fileBytes, file.mimetype));
      } catch (uploadError) {
        await Promise.all(files.map((candidate) => unlink(candidate.path).catch(() => undefined)));
        logger.error({ err: uploadError }, "Durable product image upload failed");
        res.status(502).json({ error: "The image could not be saved to durable storage. Please try again." });
        return;
      }
      await unlink(file.path).catch(() => undefined);
    }

    logger.info({ count: urls.length }, "Product images uploaded");

    res.json({ urls, url: urls[0] });
  });
});

router.delete("/uploads", requireAdmin, async (req, res) => {
  const url = typeof req.body?.url === "string" ? req.body.url : "";
  if (!url) {
    res.status(400).json({ error: "An image URL is required." });
    return;
  }
  await removeUploadedFileIfOwned(url);
  res.status(204).send();
});

export default router;
