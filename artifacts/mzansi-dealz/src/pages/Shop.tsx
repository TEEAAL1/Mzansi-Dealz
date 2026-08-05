import { useListProducts, useListCategories, type ListProductsSort } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { useSearch } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/Seo";

export default function Shop({ params }: { params?: { category?: string } }) {
  const searchStr = useSearch();
  const queryParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const searchQuery = queryParams.get("search") || "";
  const initialSort = (queryParams.get("sort") as ListProductsSort) || "newest";
  const initialOnSale = queryParams.get("on_sale") === "true";
  const initialPage = Math.max(1, Number(queryParams.get("page")) || 1);
  const initialMinPrice = queryParams.get("min_price") || "";
  const initialMaxPrice = queryParams.get("max_price") || "";
  const initialBrand = queryParams.get("brand") || "";

  const [sort, setSort] = useState<ListProductsSort>(initialSort);
  const [onSaleOnly, setOnSaleOnly] = useState(initialOnSale);
  const [page, setPage] = useState(initialPage);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [brand, setBrand] = useState(initialBrand);
  // A full catalogue page should feel useful without becoming overwhelming.
  // Twenty-four products gives shoppers enough choice while keeping pagination
  // predictable across desktop and mobile.
  const limit = 24;

  const categorySlug = params?.category;

  useEffect(() => {
    setPage(initialPage);
    setSort(initialSort);
    setOnSaleOnly(initialOnSale);
    setMinPrice(initialMinPrice);
    setMaxPrice(initialMaxPrice);
    setBrand(initialBrand);
  }, [categorySlug, initialBrand, initialMaxPrice, initialMinPrice, initialOnSale, initialPage, initialSort]);

  const updateQuery = (updates: Record<string, string | undefined>) => {
    const nextParams = new URLSearchParams(searchStr);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) nextParams.delete(key);
      else nextParams.set(key, value);
    });
    const nextPage = Number(nextParams.get("page")) || 1;
    setPage(Math.max(1, nextPage));
    const query = nextParams.toString();
    const prefix = categorySlug ? `/shop/${categorySlug}` : "/shop";
    window.history.replaceState({}, "", `${prefix}${query ? `?${query}` : ""}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const { data: categories } = useListCategories();
  
  const { data: productData, isLoading } = useListProducts({
    category: categorySlug,
    search: searchQuery || undefined,
    sort,
    on_sale: onSaleOnly || undefined,
    brand: brand || undefined,
    min_price: minPrice ? Number(minPrice) : undefined,
    max_price: maxPrice ? Number(maxPrice) : undefined,
    limit,
    offset: (page - 1) * limit
  });

  const activeCategory = categories?.find(c => c.slug === categorySlug);
  const totalPages = Math.max(1, Math.ceil((productData?.total || 0) / limit));
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === totalPages || Math.abs(number - page) <= 2);

  return (
    <div className="container mx-auto px-4 py-8">
      <Seo
        title={`${searchQuery ? `${searchQuery} | ` : ""}${activeCategory ? `${activeCategory.name} Deals` : "Shop All Deals"} | MzansiDealz`}
        description={searchQuery ? `Browse MzansiDealz search results for ${searchQuery}, with trusted products, clear pricing and nationwide delivery.` : activeCategory?.description || "Browse South Africa's best online deals across electronics, home, beauty, fashion and more."}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: activeCategory ? `${activeCategory.name} Deals` : "Shop All Deals",
          url: `https://mzansidealz.com${categorySlug ? `/shop/${categorySlug}` : "/shop"}`,
        }}
      />
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tight mb-2">
          {searchQuery ? `Search results for “${searchQuery}”` : activeCategory ? activeCategory.name : 'All Deals'}
        </h1>
        {activeCategory?.description && (
          <p className="text-muted-foreground">{activeCategory.description}</p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0 space-y-8">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-lg mb-4 pb-2 border-b border-border">Categories</h3>
             <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible">
              <li>
                <Button 
                  variant="link" 
                  className={`w-full justify-start px-2 py-1.5 h-auto font-medium ${!categorySlug ? 'text-primary bg-primary/10' : 'text-foreground hover:text-primary'}`}
                  asChild
                >
                  <a href="/shop">All Categories</a>
                </Button>
              </li>
              {categories?.map(cat => (
                <li key={cat.id}>
                  <Button 
                    variant="link" 
                    className={`w-full justify-start px-2 py-1.5 h-auto font-medium ${categorySlug === cat.slug ? 'text-primary bg-primary/10' : 'text-foreground hover:text-primary'}`}
                    asChild
                  >
                    <a href={`/shop/${cat.slug}`}>
                      {cat.name} <span className="ml-auto text-xs opacity-50 bg-background rounded-full px-2">{cat.productCount}</span>
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-4 pb-2 border-b border-border">Filter Deals</h3>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="on-sale" 
                  checked={onSaleOnly}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setOnSaleOnly(next);
                    updateQuery({ on_sale: next ? "true" : undefined, page: undefined });
                  }}
                />
                <Label htmlFor="on-sale" className="font-medium cursor-pointer flex items-center gap-2">
                  Flash Sales Only
                  <span className="bg-destructive text-white text-[10px] px-1.5 py-0.5 rounded font-bold">HOT</span>
                </Label>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4 pb-2 border-b border-border">Sort By</h3>
               <Select value={sort} onValueChange={(val: ListProductsSort) => { setSort(val); updateQuery({ sort: val === "newest" ? undefined : val, page: undefined }); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort deals by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest Deals</SelectItem>
                  <SelectItem value="discount_desc">Biggest Discount</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                   <SelectItem value="best_selling">Best Selling</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div>
               <h3 className="font-bold text-lg mb-4 pb-2 border-b border-border">Price Range</h3>
               <div className="grid grid-cols-2 gap-2">
                 <input aria-label="Minimum price" inputMode="numeric" placeholder="Min" value={minPrice} onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ""))} onBlur={() => updateQuery({ min_price: minPrice || undefined, page: undefined })} className="h-10 rounded-md border border-input bg-transparent px-3 text-sm" />
                 <input aria-label="Maximum price" inputMode="numeric" placeholder="Max" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ""))} onBlur={() => updateQuery({ max_price: maxPrice || undefined, page: undefined })} className="h-10 rounded-md border border-input bg-transparent px-3 text-sm" />
               </div>
             </div>
             <div>
               <h3 className="font-bold text-lg mb-4 pb-2 border-b border-border">Brand</h3>
               <input aria-label="Brand filter" placeholder="e.g. MZANSIDEALZ" value={brand} onChange={(event) => setBrand(event.target.value)} onBlur={() => updateQuery({ brand: brand || undefined, page: undefined })} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
             </div>
          </div>
        </aside>

        {/* Product Grid */}
         <div className="flex-1 flex flex-col">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-4 w-[60%]" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : productData?.products.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-muted/50 rounded-2xl border border-dashed border-border">
               <div className="mb-4 text-4xl font-black text-primary">No results</div>
              <h3 className="text-xl font-bold mb-2">No deals found here</h3>
              <p className="text-muted-foreground mb-6">Try changing your filters or browse other categories.</p>
              <Button asChild>
                <a href="/shop">View All Deals</a>
              </Button>
            </div>
          ) : (
            <>
               <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                 <span>
                   Showing{" "}
                   <span className="font-bold text-foreground">
                     {Math.min((page - 1) * limit + 1, productData?.total || 0)}–{Math.min(page * limit, productData?.total || 0)}
                   </span>{" "}
                   of <span className="font-bold text-foreground">{productData?.total}</span> deals
                 </span>
                 <span className="text-xs font-medium uppercase tracking-[0.12em]">Page {page} of {totalPages}</span>
              </div>
              
               <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                {productData?.products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination (Simple) */}
              {productData && productData.total > limit && (
                <div className="mt-12 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-8">
                  <Button 
                    variant="outline" 
                     onClick={() => updateQuery({ page: page > 2 ? String(page - 1) : undefined })}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                   {pageNumbers.map((number, index) => (
                     <span key={number} className="contents">
                       {index > 0 && pageNumbers[index - 1] !== number - 1 && <span className="px-1 text-muted-foreground">…</span>}
                       <Button variant={page === number ? "default" : "outline"} aria-current={page === number ? "page" : undefined} onClick={() => updateQuery({ page: number === 1 ? undefined : String(number) })} className="h-10 w-10 px-0">{number}</Button>
                     </span>
                   ))}
                  <Button 
                    variant="outline" 
                     onClick={() => updateQuery({ page: String(page + 1) })}
                     disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
