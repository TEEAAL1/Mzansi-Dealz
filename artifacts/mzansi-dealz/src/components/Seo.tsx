import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  type?: "website" | "product";
  image?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

const SITE_NAME = "MzansiDealz";
const SITE_ORIGIN = "https://mzansidealz.com";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/opengraph.jpg`;

function upsertMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
  return element;
}

export function Seo({ title, description, type = "website", image = DEFAULT_IMAGE, structuredData }: SeoProps) {
  useEffect(() => {
    const canonicalUrl = `${SITE_ORIGIN}${window.location.pathname}`;
    document.title = title;

    const descriptionMeta = upsertMeta('meta[name="description"]', { name: "description" }, description);
    const ogTitle = upsertMeta('meta[property="og:title"]', { property: "og:title" }, title);
    const ogDescription = upsertMeta('meta[property="og:description"]', { property: "og:description" }, description);
    const ogType = upsertMeta('meta[property="og:type"]', { property: "og:type" }, type);
    const ogImage = upsertMeta('meta[property="og:image"]', { property: "og:image" }, image);
    const ogUrl = upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    const twitterTitle = upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title);
    const twitterDescription = upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description);
    const twitterImage = upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, image);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    const oldSchema = document.head.querySelector('script[data-mzansi-seo-schema="true"]');
    oldSchema?.remove();
    if (structuredData) {
      const schema = document.createElement("script");
      schema.type = "application/ld+json";
      schema.dataset.mzansiSeoSchema = "true";
      schema.textContent = JSON.stringify(structuredData);
      document.head.appendChild(schema);
    }

    return () => {
      [descriptionMeta, ogTitle, ogDescription, ogType, ogImage, ogUrl, twitterTitle, twitterDescription, twitterImage].forEach((element) => element.remove());
      canonical?.remove();
      document.title = SITE_NAME;
      oldSchema?.remove();
      document.head.querySelector('script[data-mzansi-seo-schema="true"]')?.remove();
    };
  }, [description, image, structuredData, title, type]);

  return null;
}