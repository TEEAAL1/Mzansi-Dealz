import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { useLocation, useSearch } from "wouter";
import { useState, useEffect } from "react";
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
import { ListProductsSort } from "@workspace/api-client-react";

export default function Shop({ params }: { params?: { category?: string } }) {
  const searchStr = useSearch();
  const queryParams = new URLSearchParams(searchStr);
  const initialOnSale = queryParams.get("on_sale") === "true";
  
  const [sort, setSort] = useState<ListProductsSort>("newest");
  const [onSaleOnly, setOnSaleOnly] = useState(initialOnSale);
  const [page, setPage] = useState(1);
  const limit = 12;

  const categorySlug = params?.category;

  const { data: categories } = useListCategories();
  
  const { data: productData, isLoading } = useListProducts({
    category: categorySlug,
    sort,
    on_sale: onSaleOnly || undefined,
    limit,
    offset: (page - 1) * limit
  });

  const activeCategory = categories?.find(c => c.slug === categorySlug);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tight mb-2">
          {activeCategory ? activeCategory.name : 'All Deals'}
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
            <ul className="space-y-2">
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
                    setOnSaleOnly(checked === true);
                    setPage(1);
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
              <Select value={sort} onValueChange={(val: ListProductsSort) => { setSort(val); setPage(1); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort deals by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest Deals</SelectItem>
                  <SelectItem value="discount_desc">Biggest Discount</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1 flex flex-col min-h-[50vh]">
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
              <div className="text-6xl mb-4 opacity-50">🛒</div>
              <h3 className="text-xl font-bold mb-2">No deals found here</h3>
              <p className="text-muted-foreground mb-6">Try changing your filters or browse other categories.</p>
              <Button asChild>
                <a href="/shop">View All Deals</a>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Showing <span className="font-bold text-foreground">{productData?.products.length}</span> of <span className="font-bold text-foreground">{productData?.total}</span> deals
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-12">
                {productData?.products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination (Simple) */}
              {productData && productData.total > limit && (
                <div className="mt-auto pt-8 border-t border-border flex items-center justify-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm font-medium">Page {page}</span>
                  <Button 
                    variant="outline" 
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * limit >= productData.total}
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
