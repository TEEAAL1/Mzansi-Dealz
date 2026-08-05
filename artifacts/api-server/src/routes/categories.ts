import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { sanitizeCatalogueText } from "../services/catalogueBrand";

const router = Router();

router.get("/categories", async (req, res) => {
  const categories = await db
    .select()
    .from(categoriesTable)
    .orderBy(categoriesTable.name);

  res.json(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      productCount: c.productCount,
      description: sanitizeCatalogueText(c.description),
    }))
  );
});

export default router;
