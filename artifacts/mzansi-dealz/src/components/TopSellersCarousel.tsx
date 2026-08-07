import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { getGetTopSellersQueryKey, useGetTopSellers } from "@workspace/api-client-react";
import { PackageCheck, ShoppingCart } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatZAR, productPath } from "@/lib/utils";
import { cn } from "@/lib/utils";

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Prices checked recently";
  return `Prices checked ${date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
}

export function TopSellersCarousel() {
  const { data, isLoading, isError, refetch } = useGetTopSellers({
    query: { queryKey: getGetTopSellersQueryKey(), staleTime: 60_000 },
  });
  const products = data?.products ?? [];
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (!api) return;
    const update = () => setSelectedIndex(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!api || products.length < 2 || isPaused || reducedMotion) return;
    const timer = window.setInterval(() => api.scrollNext(), 4500);
    return () => window.clearInterval(timer);
  }, [api, isPaused, reducedMotion, products.length]);

  const currentProduct = products[selectedIndex] ?? products[0];
  const modeLabel = data?.mode === "curated" ? "Hand-picked by MzansiDealz" : "Ranked by completed orders";
  const positionLabel = currentProduct ? `${selectedIndex + 1} of ${products.length}` : "";
  const cardKey = useMemo(() => currentProduct?.id ?? "empty", [currentProduct?.id]);

  if (isLoading) {
    return (
      <div className="relative rounded-3xl border border-border bg-card p-4 shadow-2xl sm:p-5">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <Skeleton className="mt-4 h-6 w-4/5" />
        <Skeleton className="mt-3 h-8 w-2/5" />
        <Skeleton className="mt-4 h-11 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[22rem] flex-col justify-center rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Top sellers</p>
        <h2 className="mt-3 text-2xl font-black">Popular deals are taking a short break.</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Browse the full catalogue while we refresh the popular products.</p>
        <Button type="button" variant="outline" className="mt-6 w-fit" onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="flex min-h-[22rem] flex-col justify-center rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Top sellers</p>
        <h2 className="mt-3 text-2xl font-black">Shop the latest deals.</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Popular products will appear here once completed order history is available.</p>
        <Button asChild variant="outline" className="mt-6 w-fit"><Link href="/shop">Browse all deals</Link></Button>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-2xl sm:p-5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Top sellers</p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">{modeLabel}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground" aria-live="polite">{positionLabel}</span>
      </div>

      <Carousel
        setApi={setApi}
        opts={{ align: "start", containScroll: "trimSnaps", loop: products.length > 1 }}
        aria-label="Top selling products"
        className="group/carousel"
      >
        <CarouselContent className="-ml-3">
          {products.map((product) => (
            <CarouselItem key={product.id} className="basis-full pl-3">
              <article className="overflow-hidden rounded-2xl border border-border bg-background">
                <Link href={productPath(product)} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = "/product-placeholder.svg";
                      }}
                    />
                    {product.discountPercent > 0 && (
                      <span className="absolute left-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-destructive-foreground shadow-sm">
                        Save {product.discountPercent}%
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 min-h-[3rem] text-base font-black leading-6">{product.name}</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-2xl font-black text-primary">{formatZAR(product.price)}</span>
                      {product.originalPrice > product.price && <span className="pb-0.5 text-xs text-muted-foreground line-through">{formatZAR(product.originalPrice)}</span>}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary">
                      <PackageCheck className="h-4 w-4" />
                      <span>{product.stockCount !== null && product.stockCount !== undefined && product.stockCount <= 5 ? `Only ${product.stockCount} left` : "In stock"}</span>
                    </div>
                  </div>
                </Link>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious aria-label="Previous top seller" className="left-2 top-[42%] h-10 w-10 border-border bg-card/95 shadow-md md:-left-12" />
        <CarouselNext aria-label="Next top seller" className="right-2 top-[42%] h-10 w-10 border-border bg-card/95 shadow-md md:-right-12" />
      </Carousel>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-muted-foreground">{data ? formatUpdatedAt(data.updatedAt) : "Prices checked recently"}</span>
        <Button asChild size="sm" className="font-bold">
          <Link href={productPath(currentProduct)}><ShoppingCart className="mr-1.5 h-4 w-4" />View deal</Link>
        </Button>
      </div>
      <div className="mt-3 flex justify-center gap-1.5" aria-label="Top seller slides">
        {products.map((product, index) => (
          <button
            key={product.id}
            type="button"
            aria-label={`Show top seller ${index + 1}`}
            aria-current={selectedIndex === index ? "true" : undefined}
            onClick={() => api?.scrollTo(index)}
            className={cn("h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selectedIndex === index ? "w-6 bg-primary" : "w-1.5 bg-border")}
          />
        ))}
      </div>
    </div>
  );
}