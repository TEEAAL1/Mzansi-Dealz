import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import multer from "multer";
import { db, productImportItemsTable, productImportRunsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/admin-auth";
import {
  crawlImportRun,
  importRun,
  rollbackRun,
  PERFECTDEALZ_ORIGIN,
  getLatestImportRun,
  normalizeSourceOrigin,
  finalizeCrawlRun,
  createCsvImportRun,
  validateProductCsv,
} from "../services/productImportService";

const router = Router();
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get("/admin/product-import/latest", requireAdmin, async (_req, res): Promise<void> => {
  const [run] = await getLatestImportRun();
  if (!run) {
    res.json({ run: null, items: [] });
    return;
  }
  const items = await db.select().from(productImportItemsTable).where(eq(productImportItemsTable.runId, run.id));
  res.json({
    run: {
      ...run,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    },
    items: items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      sourceUrl: item.sourceUrl,
      status: item.status,
      error: item.error,
      missingImage: item.missingImage,
      missingPrice: item.missingPrice,
    })),
  });
});

router.get("/admin/product-import/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [run] = await db.select().from(productImportRunsTable).where(eq(productImportRunsTable.id, id)).limit(1);
  if (!run) {
    res.status(404).json({ error: "Import run not found" });
    return;
  }
  const items = await db.select().from(productImportItemsTable).where(eq(productImportItemsTable.runId, id));
  res.json({
    run: {
      ...run,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    },
    items: items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      sourceUrl: item.sourceUrl,
      status: item.status,
      error: item.error,
      missingImage: item.missingImage,
      missingPrice: item.missingPrice,
      payload: item.status === "failed" ? undefined : item.payload,
    })),
  });
});

router.post("/admin/product-import/start", requireAdmin, async (req, res): Promise<void> => {
  const input = req.body as Partial<{
    sourceUrl: string;
    overwriteExisting: boolean;
    skipExisting: boolean;
    importImages: boolean;
  }>;
  let sourceUrl: string;
  try {
    sourceUrl = normalizeSourceOrigin(input.sourceUrl ?? "");
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid source URL" });
    return;
  }
  const overwriteExisting = input.overwriteExisting === true;
  const skipExisting = overwriteExisting ? false : input.skipExisting !== false;
  const importImages = input.importImages !== false;
  await db.update(productImportRunsTable)
    .set({ status: "failed", error: "Superseded by a newer import run.", completedAt: new Date() })
    .where(sql`${productImportRunsTable.status} IN ('crawling', 'importing')`);
  const [run] = await db.insert(productImportRunsTable).values({
    sourceDomain: sourceUrl,
    overwriteExisting,
    skipExisting,
    importImages,
    status: "crawling",
  }).returning();
  void crawlImportRun(run.id);
  res.status(202).json({
    run: {
      ...run,
      createdAt: run.createdAt.toISOString(),
      completedAt: null,
    },
    message: "Product crawl started. Poll the import status for progress.",
  });
});

router.post("/admin/product-import/upload-csv", requireAdmin, (req, res): void => {
  csvUpload.single("file")(req, res, async (error) => {
    if (error) {
      res.status(400).json({ error: error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE" ? "CSV file must be smaller than 25 MB." : error.message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Choose a CSV file to upload." });
      return;
    }
    if (!req.file.originalname.toLowerCase().endsWith(".csv") && !req.file.mimetype.includes("csv") && req.file.mimetype !== "text/plain") {
      res.status(400).json({ error: "Only CSV files are supported." });
      return;
    }
    try {
      const text = req.file.buffer.toString("utf8");
      const validation = validateProductCsv(text);
      let sourceUrl: string | undefined;
      if (req.body.sourceUrl?.trim()) {
        sourceUrl = normalizeSourceOrigin(req.body.sourceUrl.trim());
      }
      const run = await createCsvImportRun(text, {
        sourceUrl,
        filename: req.file.originalname,
        overwriteExisting: req.body.overwriteExisting === "true",
        skipExisting: req.body.overwriteExisting !== "true",
        importImages: req.body.importImages !== "false",
      });
      res.status(202).json({
        run: { ...run, createdAt: run.createdAt.toISOString(), completedAt: null },
        message: `CSV accepted. Preparing ${validation.rowCount.toLocaleString()} product rows.`,
      });
    } catch (uploadError) {
      res.status(400).json({ error: uploadError instanceof Error ? uploadError.message : "CSV could not be prepared." });
    }
  });
});

router.post("/admin/product-import/:id/import", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [run] = await db.select().from(productImportRunsTable).where(eq(productImportRunsTable.id, id)).limit(1);
  if (!run) {
    res.status(404).json({ error: "Import run not found" });
    return;
  }
  if (run.status !== "ready") {
    res.status(409).json({ error: `Run must be ready before import. Current status: ${run.status}` });
    return;
  }
  void importRun(id);
  res.status(202).json({ message: "CSV import started.", runId: id });
});

router.post("/admin/product-import/:id/finalize", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const report = await finalizeCrawlRun(id);
    res.json({ message: "Accepted products finalized for import.", runId: id, ...report });
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Could not finalize import run" });
  }
});

router.post("/admin/product-import/:id/rollback", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [run] = await db.select().from(productImportRunsTable).where(eq(productImportRunsTable.id, id)).limit(1);
  if (!run) {
    res.status(404).json({ error: "Import run not found" });
    return;
  }
  if (!["completed", "importing", "failed"].includes(run.status)) {
    res.status(409).json({ error: "Only an imported run can be rolled back." });
    return;
  }
  const result = await rollbackRun(id);
  res.json({ ...result, message: "Import rolled back." });
});

router.get("/admin/product-import/:id/csv", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [run] = await db.select().from(productImportRunsTable).where(eq(productImportRunsTable.id, id)).limit(1);
  if (!run) {
    res.status(404).json({ error: "Import run not found" });
    return;
  }
  const items = await db.select().from(productImportItemsTable).where(and(eq(productImportItemsTable.runId, id), sql`${productImportItemsTable.status} <> 'failed'`));
  const columns = ["SKU", "Name", "Description", "Category", "Brand", "Price", "SalePrice", "Stock", "Image", "GalleryImages", "Weight", "Dimensions", "Tags", "Status", "Featured"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
  const rows = items.map((item) => {
    const product = item.payload as Record<string, unknown>;
    return [
      product.sku, product.name, product.description, product.category, product.brand, product.price,
      product.salePrice, product.stock, product.image, Array.isArray(product.galleryImages) ? product.galleryImages.join("|") : "",
      product.weight, product.dimensions, Array.isArray(product.tags) ? product.tags.join("|") : "",
      product.status, product.featured,
    ].map(escape).join(",");
  });
  res.type("text/csv").setHeader("Content-Disposition", 'attachment; filename="perfectdealz-products.csv"').send([columns.map(escape).join(","), ...rows].join("\n"));
});

export default router;