import { useGetProduct, getGetProductQueryKey, getListProductsQueryKey, useListProducts } from "@workspace/api-client-react";
import { apiUrl } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { formatZAR, productPath } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, CreditCard, Heart, ListChecks, Minus, PackageCheck, Plus, Ruler, ShieldCheck, ShoppingCart, Truck, X, ZoomIn } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Seo, SITE_ORIGIN } from "@/components/Seo";

const WISHLIST_STORAGE_KEY = "mzansi_wishlist";
const RECENTLY_VIEWED_STORAGE_KEY = "mzansi_recently_viewed";

type RecentProduct = {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
};

function readStoredIds(key: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved.filter((value): value is number => typeof value === "number") : [];
  } catch {
    return [];
  }
}

function readRecentProducts(): RecentProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item): item is RecentProduct => item && typeof item.id === "number" && typeof item.name === "string" && typeof item.imageUrl === "string" && typeof item.price === "number") : [];
  } catch {
    return [];
  }
}

function parseGallery(galleryImages: string | null | undefined, primaryImage: string): string[] {
  if (!galleryImages) return [primaryImage];
  try {
    const parsed = JSON.parse(galleryImages);
    if (Array.isArray(parsed)) {
      return Array.from(new Set([primaryImage, ...parsed.filter((image): image is string => typeof image === "string" && image.length > 0)]));
    }
  } catch {
    const parsed = galleryImages.split(",").map((image) => image.trim()).filter(Boolean);
    if (parsed.length) return Array.from(new Set([primaryImage, ...parsed]));
  }
  return [primaryImage];
}

export default function ProductDetail({ params }: { params: { id: string } }) {
  const numericId = Number(params.id);
  const isNumericId = Number.isInteger(numericId) && numericId > 0;
  const { data: numericProduct, isLoading: numericLoading } = useGetProduct(numericId, { query: { enabled: isNumericId, queryKey: getGetProductQueryKey(numericId) } });
  const { data: slugProduct, isLoading: slugLoading } = useQuery({
    queryKey: ["product-by-slug", params.id],
    queryFn: async () => {
      const response = await fetch(apiUrl(`/api/products/slug/${encodeURIComponent(params.id)}`));
      if (!response.ok) throw new Error("Product not found");
      return response.json() as Promise<NonNullable<typeof numericProduct>>;
    },
    enabled: !isNumericId,
  });
  const product = numericProduct ?? slugProduct;
  const isLoading = numericLoading || slugLoading;
  const { data: relatedData } = useListProducts(
    { category: product?.categorySlug, limit: 5, sort: "best_selling" },
    { query: { enabled: Boolean(product?.categorySlug), queryKey: getListProductsQueryKey({ category: product?.categorySlug, limit: 5, sort: "best_selling" }) } },
  );
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState("");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(() => readStoredIds(WISHLIST_STORAGE_KEY).includes(numericId));
  const [recentlyViewed, setRecentlyViewed] = useState<RecentProduct[]>(readRecentProducts);

  const gallery = useMemo(() => parseGallery(product?.galleryImages, product?.imageUrl || ""), [product?.galleryImages, product?.imageUrl]);
  const selectedIndex = Math.max(0, gallery.indexOf(selectedImage));

  useEffect(() => {
    if (!product) return;
    setSelectedImage(product.imageUrl);
    setQuantity(1);
    setIsWishlisted(readStoredIds(WISHLIST_STORAGE_KEY).includes(product.id));
    setRecentlyViewed((current) => {
      const next = [
        { id: product.id, name: product.name, imageUrl: product.imageUrl, price: product.price },
        ...current.filter((item) => item.id !== product.id),
      ].slice(0, 8);
      localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [product]);

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionMeta?.getAttribute("content") ?? null;
    if (product) {
      document.title = product.metaTitle || `${product.name} | Mzansi Dealz`;
      if (descriptionMeta && product.metaDescription) descriptionMeta.setAttribute("content", product.metaDescription);
    }
    return () => {
      document.title = previousTitle;
      if (descriptionMeta && previousDescription !== null) descriptionMeta.setAttribute("content", previousDescription);
    };
  }, [product]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLightboxOpen(false);
      if (event.key === "ArrowRight") setSelectedImage(gallery[(selectedIndex + 1) % gallery.length]);
      if (event.key === "ArrowLeft") setSelectedImage(gallery[(selectedIndex - 1 + gallery.length) % gallery.length]);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [gallery, isLightboxOpen, selectedIndex]);

  useEffect(() => {
    if (!isWishlisted || !product) return;
    const wishlist = readStoredIds(WISHLIST_STORAGE_KEY);
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(Array.from(new Set([...wishlist, product.id]))));
  }, [isWishlisted, product]);

  useEffect(() => {
    if (!isWishlisted && product) {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(readStoredIds(WISHLIST_STORAGE_KEY).filter((item) => item !== product.id)));
    }
  }, [isWishlisted, product]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="status-product-loading">
        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          <div className="space-y-3"><Skeleton className="aspect-square w-full rounded-2xl" /><div className="flex gap-2"><Skeleton className="h-16 w-16 rounded-lg" /><Skeleton className="h-16 w-16 rounded-lg" /><Skeleton className="h-16 w-16 rounded-lg" /></div></div>
          <div className="space-y-6"><Skeleton className="h-5 w-28" /><Skeleton className="h-12 w-4/5" /><Skeleton className="h-20 w-2/5" /><Skeleton className="h-28 w-full" /><Skeleton className="h-14 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center" data-testid="status-product-not-found">
        <h1 className="mb-4 text-3xl font-bold">Product not found</h1>
        <p className="mb-8 text-muted-foreground">This deal might have expired or sold out.</p>
        <Button asChild><Link href="/shop">Back to shop</Link></Button>
      </div>
    );
  }

  const savings = Math.max(0, product.originalPrice - product.price);
  const isLowStock = product.inStock && product.stockCount !== null && product.stockCount !== undefined && product.stockCount <= 5;
  const stockLabel = !product.inStock ? "Currently unavailable" : isLowStock ? `Only ${product.stockCount} left at this price` : "Ready to ship";
  const relatedProducts = relatedData?.products.filter((item) => item.id !== product.id) ?? [];

  const handleAddToCart = () => {
    if (!product.inStock) return;
    addToCart({ productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, quantity });
    toast({ title: "Added to cart", description: `${quantity}x ${product.name} added.` });
  };

  const toggleWishlist = () => {
    setIsWishlisted((current) => !current);
    toast({
      title: isWishlisted ? "Removed from wishlist" : "Saved to wishlist",
      description: isWishlisted ? "The deal is no longer saved." : "Find it again in your saved deals.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <Seo
        title={product.metaTitle || `${product.name} | MzansiDealz`}
        description={product.metaDescription || product.description || `Shop ${product.name} from MzansiDealz with secure checkout and nationwide delivery.`}
        type="product"
        image={product.imageUrl}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Shop", url: "/shop" },
          { name: product.categoryName, url: `/shop/${product.categorySlug || product.categoryId}` },
          { name: product.name, url: productPath(product) },
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          image: gallery,
          description: product.description || undefined,
          sku: product.sku || undefined,
          brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: "ZAR",
            price: product.price,
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${SITE_ORIGIN}${productPath(product)}`,
            seller: { "@type": "Organization", name: "MzansiDealz" },
          },
        }}
      />
      <Link href="/shop" data-testid="link-back-to-shop" className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to deals
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:gap-12">
        <section>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
            {product.discountPercent > 0 && (
              <span data-testid="badge-detail-discount" className="absolute left-4 top-4 z-10 rounded-full bg-destructive px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-destructive-foreground shadow-md">
                Save {product.discountPercent}%
              </span>
            )}
            <button type="button" data-testid="button-open-image-zoom" aria-label={`Zoom in on ${product.name}`} onClick={() => setIsLightboxOpen(true)} className="absolute bottom-4 right-4 z-10 flex h-12 items-center gap-2 rounded-full border border-border/60 bg-card/90 px-4 text-sm font-bold shadow-md backdrop-blur hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ZoomIn className="h-4 w-4" /> View larger
            </button>
            <img data-testid="img-product-main" src={selectedImage || product.imageUrl} alt={product.name} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/opengraph.jpg"; }} />
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1" aria-label="Product gallery" data-testid="gallery-product-thumbnails">
            {gallery.map((image, index) => (
              <button type="button" key={`${image}-${index}`} data-testid={`button-gallery-thumbnail-${index}`} aria-label={`View ${product.name} image ${index + 1}`} aria-pressed={selectedImage === image} onClick={() => setSelectedImage(image)} className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedImage === image ? "border-primary" : "border-border hover:border-primary/60"}`}>
                 <img src={image} alt={`${product.name} product image ${index + 1}`} loading="lazy" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/opengraph.jpg"; }} />
              </button>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><ZoomIn className="h-3.5 w-3.5 text-primary" /> Select an image, then choose “View larger” to inspect the details.</p>
        </section>

        <section className="flex flex-col">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Link href={`/shop/${product.categorySlug || product.categoryId}`} data-testid="link-product-category" className="text-xs font-black uppercase tracking-[0.14em] text-primary hover:underline">{product.categoryName}</Link>
            <button type="button" data-testid="button-detail-wishlist" aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"} aria-pressed={isWishlisted} onClick={toggleWishlist} className="flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Heart className={`h-4 w-4 ${isWishlisted ? "fill-destructive text-destructive" : ""}`} /> {isWishlisted ? "Saved" : "Save deal"}
            </button>
          </div>
          <h1 data-testid="text-product-title" className="max-w-2xl text-3xl font-black leading-[1.08] tracking-tight md:text-4xl">{product.name}</h1>

          <div className="mt-6 flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-border pb-6">
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Deal price</span>
              <span data-testid="text-product-price" className="text-4xl font-black tracking-tight text-primary">{formatZAR(product.price)}</span>
            </div>
            {product.originalPrice > product.price && (
              <div className="pb-1">
                <span className="block text-xs text-muted-foreground">Was {formatZAR(product.originalPrice)}</span>
                <span className="text-sm font-semibold text-muted-foreground line-through decoration-destructive decoration-2">Save {formatZAR(savings)}</span>
              </div>
            )}
          </div>

          <div className={`mt-5 flex items-center gap-2 text-sm font-bold ${isLowStock ? "text-accent-foreground" : product.inStock ? "text-primary" : "text-muted-foreground"}`} data-testid="status-product-stock">
            <PackageCheck className="h-5 w-5" /> {stockLabel}
          </div>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{product.description || "A practical deal selected for everyday value."}</p>

          {(product.brand || product.sku || product.weight || product.dimensions) && (
            <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm sm:grid-cols-2">
              {product.brand && <div><span className="text-muted-foreground">Brand</span><p className="font-bold">{product.brand}</p></div>}
              {product.sku && <div><span className="text-muted-foreground">SKU</span><p className="font-bold">{product.sku}</p></div>}
              {product.weight && <div className="flex gap-2"><Ruler className="mt-0.5 h-4 w-4 text-primary" /><div><span className="text-muted-foreground">Weight</span><p className="font-bold">{product.weight}</p></div></div>}
              {product.dimensions && <div><span className="text-muted-foreground">Dimensions</span><p className="font-bold">{product.dimensions}</p></div>}
            </div>
          )}

          {(product.features || product.specifications) && (
            <div className="mt-6 space-y-5">
              {product.features && <div><h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><ListChecks className="h-5 w-5 text-primary" /> Features</h2><p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{product.features}</p></div>}
              {product.specifications && <div><h2 className="mb-2 text-lg font-bold">Specifications</h2><p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{product.specifications}</p></div>}
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex h-12 w-full items-center overflow-hidden rounded-xl border-2 border-input sm:w-36">
                <button type="button" data-testid="button-decrease-quantity" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="flex h-full min-w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                <span data-testid="text-product-quantity" className="flex-1 text-center text-lg font-black">{quantity}</span>
                <button type="button" data-testid="button-increase-quantity" aria-label="Increase quantity" disabled={!product.inStock || (product.stockCount !== null && product.stockCount !== undefined && quantity >= product.stockCount)} onClick={() => setQuantity((current) => current + 1)} className="flex h-full min-w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"><Plus className="h-4 w-4" /></button>
              </div>
              <Button type="button" data-testid="button-detail-add-cart" onClick={handleAddToCart} size="lg" disabled={!product.inStock} className="h-12 flex-1 text-base font-black uppercase tracking-[0.08em] shadow-sm">
                <ShoppingCart className="mr-2 h-5 w-5" /> {product.inStock ? "Add to cart" : "Out of stock"}
              </Button>
            </div>
            {isLowStock && <p className="mt-3 text-xs font-semibold text-accent-foreground">Popular deal — stock is limited.</p>}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2" data-testid="trust-delivery-panel">
            <div className="rounded-xl border border-border bg-muted/40 p-4"><Truck className="mb-3 h-5 w-5 text-primary" /><h3 className="text-sm font-bold">Delivery you can plan for</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Free over R400. Otherwise R69 Gauteng or R99 nationwide, usually in 2–5 working days.</p></div>
            <div className="rounded-xl border border-border bg-muted/40 p-4"><ShieldCheck className="mb-3 h-5 w-5 text-primary" /><h3 className="text-sm font-bold">Protected checkout</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Secure payment and a 7-day return policy on unused items.</p></div>
            <div className="rounded-xl border border-border bg-muted/40 p-4"><CreditCard className="mb-3 h-5 w-5 text-primary" /><h3 className="text-sm font-bold">Pay your way</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose from the available secure payment options at checkout.</p></div>
            <div className="rounded-xl border border-border bg-muted/40 p-4"><BadgeCheck className="mb-3 h-5 w-5 text-primary" /><h3 className="text-sm font-bold">Mzansi Dealz checked</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Clear pricing, local delivery rates and straightforward deal details.</p></div>
          </div>
        </section>
      </div>

      {recentlyViewed.filter((item) => item.id !== product.id).length > 0 && (
        <section className="mt-14 border-t border-border pt-8" data-testid="section-recently-viewed">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Keep browsing</p><h2 className="mt-1 text-2xl font-black">Recently viewed</h2></div><span className="text-xs text-muted-foreground">Saved on this device</span></div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentlyViewed.filter((item) => item.id !== product.id).map((item) => (
              <Link href={`/product/${item.id}`} key={item.id} data-testid={`link-recent-product-${item.id}`} className="flex min-w-[15rem] max-w-[17rem] items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50">
                 <img src={item.imageUrl} alt={`${item.name} product thumbnail`} className="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/opengraph.jpg"; }} />
                <span className="min-w-0"><span className="line-clamp-2 text-sm font-bold">{item.name}</span><span className="mt-1 block text-sm font-black text-primary">{formatZAR(item.price)}</span></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {relatedProducts.length > 0 && (
        <section className="mt-14 border-t border-border pt-8" data-testid="section-related-products">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">More from this category</p>
              <h2 className="mt-1 text-2xl font-black">You may also like</h2>
            </div>
            <Link href={`/shop/${product.categorySlug}`} className="text-sm font-bold text-primary hover:underline">See all</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {relatedProducts.slice(0, 4).map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      )}

      {isLightboxOpen && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/85 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setIsLightboxOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label={`${product.name} image viewer`} className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col items-center justify-center">
            <button type="button" data-testid="button-close-image-lightbox" aria-label="Close image viewer" onClick={() => setIsLightboxOpen(false)} className="absolute right-0 top-0 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-card text-foreground shadow-lg hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-5 w-5" /></button>
             <img src={gallery[selectedIndex] || product.imageUrl} alt={`${product.name} enlarged view`} className="max-h-[78dvh] max-w-full rounded-xl object-contain shadow-2xl" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/opengraph.jpg"; }} />
            {gallery.length > 1 && (
              <>
                <button type="button" data-testid="button-lightbox-previous" aria-label="Previous image" onClick={() => setSelectedImage(gallery[(selectedIndex - 1 + gallery.length) % gallery.length])} className="absolute left-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow-lg hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ChevronLeft className="h-6 w-6" /></button>
                <button type="button" data-testid="button-lightbox-next" aria-label="Next image" onClick={() => setSelectedImage(gallery[(selectedIndex + 1) % gallery.length])} className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow-lg hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ChevronRight className="h-6 w-6" /></button>
              </>
            )}
            <p className="mt-4 max-w-xl text-center text-sm font-semibold text-primary-foreground">{product.name} · image {selectedIndex + 1} of {gallery.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
