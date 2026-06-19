import { Router } from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";

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

router.post("/uploads", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "Upload failed" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
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
