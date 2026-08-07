import { useEffect } from "react";

type JsonLd = Record<string, unknown>;

type SeoProps = {
  title: string;
  description: string;
  type?: "website" | "product";
  image?: string;
  structuredData?: JsonLd | JsonLd[];
  breadcrumbs?: Array<{ name: string; url: string }>;
  noindex?: boolean;
};

export const SITE_NAME = "MzansiDealz";
export const SITE_ORIGIN = "https://mzansidealz.com";
export const DEFAULT_IMAGE = `${SITE_ORIGIN}/opengraph.jpg`;

function absoluteUrl(value: string) {
  return value.startsWith("http") ? value : `${SITE_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

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

export function Seo({ title, description, type = "website", image = DEFAULT_IMAGE, structuredData, breadcrumbs, noindex = false }: SeoProps) {
  useEffect(() => {
    const canonicalUrl = `${SITE_ORIGIN}${window.location.pathname}`;
    document.title = title;

    const managedMeta = [
      upsertMeta('meta[name="description"]', { name: "description" }, description),
      upsertMeta('meta[name="robots"]', { name: "robots" }, noindex ? "noindex, nofollow" : "index, follow"),
      upsertMeta('meta[property="og:site_name"]', { property: "og:site_name" }, SITE_NAME),
      upsertMeta('meta[property="og:title"]', { property: "og:title" }, title),
      upsertMeta('meta[property="og:description"]', { property: "og:description" }, description),
      upsertMeta('meta[property="og:type"]', { property: "og:type" }, type),
      upsertMeta('meta[property="og:image"]', { property: "og:image" }, absoluteUrl(image)),
      upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonicalUrl),
      upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image"),
      upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title),
      upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description),
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, absoluteUrl(image)),
    ];

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const graph: JsonLd[] = [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        logo: { "@type": "ImageObject", url: DEFAULT_IMAGE },
        areaServed: { "@type": "Country", name: "South Africa" },
        contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: "sales@mzansidealz.com", telephone: "+27 67 766 4764" },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        potentialAction: { "@type": "SearchAction", target: `${SITE_ORIGIN}/shop?search={search_term_string}`, "query-input": "required name=search_term_string" },
      },
    ];
    if (breadcrumbs?.length) {
      graph.push({
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.url),
        })),
      });
    }
    const custom = structuredData ? (Array.isArray(structuredData) ? structuredData : [structuredData]) : [];
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.dataset.mzansiSeoSchema = "true";
    schema.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": [...graph, ...custom] });
    document.head.querySelector('script[data-mzansi-seo-schema="true"]')?.remove();
    document.head.appendChild(schema);

    return () => {
      managedMeta.forEach((element) => element.remove());
      canonical?.remove();
      schema.remove();
      document.title = SITE_NAME;
    };
  }, [breadcrumbs, description, image, noindex, structuredData, title, type]);

  return null;
}