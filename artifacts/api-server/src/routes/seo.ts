import { Router } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const router = Router();
const SITE_ORIGIN = "https://mzansidealz.com";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;",
  }[character] ?? character));
}

router.get("/sitemap.xml", async (_req, res) => {
  const rows = await db
    .select({ slug: productsTable.slug, categorySlug: categoriesTable.slug })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(and(eq(productsTable.status, "active"), eq(productsTable.inStock, true)));

  const urls = [
    "/",
    "/shop",
    "/about",
    "/contact",
    "/shipping-delivery",
    "/returns-refunds",
    ...rows.flatMap((product) => [
      product.categorySlug ? `/shop/${product.categorySlug}` : null,
      `/product/${product.slug}`,
    ]),
  ].filter((url): url is string => Boolean(url));

  const uniqueUrls = Array.from(new Set(urls));
  const body = uniqueUrls.map((url) => `  <url><loc>${escapeXml(`${SITE_ORIGIN}${url}`)}</loc></url>`).join("\n");
  res.type("application/xml").set("Cache-Control", "public, max-age=900").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`,
  );
});

router.get("/robots.txt", (_req, res) => {
  res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /cart",
      "Disallow: /checkout",
      "Disallow: /order-confirmation",
      `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
      "",
    ].join("\n"),
  );
});

export default router;