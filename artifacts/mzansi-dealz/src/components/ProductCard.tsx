import { Link } from "wouter";
import { formatZAR } from "@/lib/utils";
import type { Product } from "@workspace/api-client-react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Eye, Heart, PackageCheck, ShoppingCart, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const WISHLIST_STORAGE_KEY = "mzansi_wishlist";

function readWishlist(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((value): value is number => typeof value === "number") : [];
  } catch {
    return [];
  }
}

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [isWishlisted, setIsWishlisted] = useState(() => readWishlist().includes(product.id));
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  useEffect(() => {
    const wishlist = readWishlist();
    const nextWishlist = isWishlisted
      ? Array.from(new Set([...wishlist, product.id]))
      : wishlist.filter((id) => id !== product.id);
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(nextWishlist));
  }, [isWishlisted, product.id]);

  useEffect(() => {
    if (!isQuickViewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsQuickViewOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isQuickViewOpen]);

  const savings = Math.max(0, product.originalPrice - product.price);
  const isLowStock = product.inStock && product.stockCount !== null && product.stockCount !== undefined && product.stockCount <= 5;
  const stockLabel = !product.inStock
    ? "Currently unavailable"
    : isLowStock
      ? `Only ${product.stockCount} left`
      : "In stock";

  const handleAddToCart = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!product.inStock) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
    });
    toast({
      title: "Added to cart",
      description: `${product.name} added to your cart.`,
    });
  };

  const toggleWishlist = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsWishlisted((current) => !current);
    toast({
      title: isWishlisted ? "Removed from wishlist" : "Saved to wishlist",
      description: isWishlisted ? "The deal is no longer saved." : "Find it again in your saved deals.",
    });
  };

  const openQuickView = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsQuickViewOpen(true);
  };

  return (
    <>
      <article data-testid={`card-product-${product.id}`} className="group relative flex h-full min-h-[27rem] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          {product.discountPercent > 0 && (
            <span data-testid={`badge-discount-${product.id}`} className="rounded-full bg-destructive px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-destructive-foreground shadow-sm">
              Save {product.discountPercent}%
            </span>
          )}
          {product.isNewArrival && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-secondary-foreground shadow-sm">
              New
            </span>
          )}
        </div>

        <button
          type="button"
          data-testid={`button-wishlist-${product.id}`}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
          onClick={toggleWishlist}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-foreground shadow-sm backdrop-blur transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Heart className={`h-5 w-5 ${isWishlisted ? "fill-destructive text-destructive" : ""}`} />
        </button>

        <Link href={`/product/${product.id}`} className="block shrink-0" data-testid={`link-product-image-${product.id}`}>
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/opengraph.jpg";
              }}
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-foreground/60 to-transparent px-4 pb-3 pt-8 text-xs font-semibold text-primary-foreground">
              <span className={product.inStock ? "text-primary-foreground" : "text-primary-foreground/80"}>{stockLabel}</span>
              <span className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Eye className="h-3.5 w-3.5" /> View deal
              </span>
            </div>
          </div>
        </Link>

        <div className="flex flex-1 flex-col p-4">
          <Link href={`/product/${product.id}`} data-testid={`link-product-name-${product.id}`} className="mb-3 block min-h-[3.25rem]">
            <h3 className="line-clamp-2 text-sm font-semibold leading-6 transition-colors group-hover:text-primary">
              {product.name}
            </h3>
          </Link>

          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <span data-testid={`text-price-${product.id}`} className="block text-xl font-black tracking-tight text-primary">
                {formatZAR(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">{formatZAR(product.originalPrice)}</span>
              )}
            </div>
            {savings > 0 && (
              <span className="rounded-md bg-accent/30 px-2 py-1 text-right text-[11px] font-bold leading-tight text-accent-foreground">
                You save<br />{formatZAR(savings)}
              </span>
            )}
          </div>

          <div className="mb-4 flex items-center gap-2 text-xs font-medium">
            <PackageCheck className={`h-4 w-4 ${isLowStock ? "text-accent-foreground" : product.inStock ? "text-primary" : "text-muted-foreground"}`} />
            <span data-testid={`status-stock-${product.id}`} className={isLowStock ? "text-accent-foreground" : product.inStock ? "text-primary" : "text-muted-foreground"}>
              {stockLabel}
            </span>
          </div>

          <div className="mt-auto grid grid-cols-[1fr_auto] gap-2">
            <Button
              type="button"
              data-testid={`button-add-cart-${product.id}`}
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="h-11 w-full font-bold uppercase tracking-[0.08em]"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {product.inStock ? "Add to cart" : "Sold out"}
            </Button>
            <Button
              type="button"
              data-testid={`button-quick-view-${product.id}`}
              aria-label={`Quick view ${product.name}`}
              variant="outline"
              onClick={openQuickView}
              className="h-11 w-11 px-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </article>

      {isQuickViewOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsQuickViewOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`quick-view-title-${product.id}`}
            data-testid={`dialog-quick-view-${product.id}`}
            className="relative grid max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl md:grid-cols-2"
          >
            <button
              type="button"
              data-testid={`button-close-quick-view-${product.id}`}
              aria-label="Close quick view"
              onClick={() => setIsQuickViewOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="aspect-square bg-muted md:aspect-auto">
               <img src={product.imageUrl} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/opengraph.jpg"; }} />
            </div>
            <div className="flex flex-col p-6">
              <span className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">{product.categoryName}</span>
              <h2 id={`quick-view-title-${product.id}`} className="text-xl font-black leading-tight">{product.name}</h2>
              <div className="mt-5 flex items-end gap-3">
                <span className="text-3xl font-black text-primary">{formatZAR(product.price)}</span>
                {product.originalPrice > product.price && (
                  <span className="pb-1 text-sm text-muted-foreground line-through">{formatZAR(product.originalPrice)}</span>
                )}
              </div>
              <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
                {product.description || "A practical deal selected for everyday value."}
              </p>
              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">
                <BadgeCheck className="h-4 w-4" /> {stockLabel}
              </div>
              <div className="mt-auto space-y-3 pt-7">
                <Button type="button" data-testid={`button-quick-add-cart-${product.id}`} onClick={() => handleAddToCart()} disabled={!product.inStock} className="h-12 w-full font-bold uppercase tracking-[0.08em]">
                  <ShoppingCart className="mr-2 h-4 w-4" /> {product.inStock ? "Add to cart" : "Sold out"}
                </Button>
                <Button type="button" data-testid={`button-view-full-product-${product.id}`} variant="outline" asChild className="h-12 w-full font-bold">
                  <Link href={`/product/${product.id}`} onClick={() => setIsQuickViewOpen(false)}>View full deal</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
