import { Link } from "wouter";
import { 
  useGetFeaturedProducts, 
  useGetNewArrivals, 
  useListCategories 
} from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, Percent, Zap, Timer, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: featured, isLoading: loadingFeatured } = useGetFeaturedProducts({ limit: 4 });
  const { data: newArrivals, isLoading: loadingNew } = useGetNewArrivals({ limit: 4 });
  const { data: categories, isLoading: loadingCategories } = useListCategories();

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground pt-12 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4 scale-150">
          <Percent className="w-96 h-96" />
        </div>
        <div className="container mx-auto relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-3 py-1 rounded-full font-bold text-sm tracking-wide shadow-sm">
              <Zap className="w-4 h-4" fill="currentColor" />
              MZANSI'S CRAZIEST DEALS
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black italic tracking-tighter leading-tight">
              Shop South Africa's <br/>
              <span className="text-accent underline decoration-white underline-offset-8">Best Deals</span>
            </h1>
            <p className="text-xl md:text-2xl font-medium max-w-xl text-primary-foreground/90 leading-snug">
              Save up to 60% on everyday essentials, electronics, and home goods. Delivered to your door.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg font-bold px-8 h-14 shadow-lg shadow-black/10">
                <Link href="/shop">Shop All Deals</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary text-lg font-bold px-8 h-14 bg-transparent backdrop-blur-sm">
                <Link href="/shop?on_sale=true">View Flash Sales</Link>
              </Button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md hidden md:block">
            <div className="relative">
              <div className="absolute inset-0 bg-accent rounded-3xl transform rotate-3 scale-105 shadow-xl"></div>
              <div className="absolute inset-0 bg-secondary rounded-3xl transform -rotate-3 scale-105 shadow-xl"></div>
              <div className="relative bg-card rounded-3xl p-6 shadow-2xl overflow-hidden border border-border">
                <div className="absolute top-4 right-4 bg-destructive text-white font-black px-4 py-2 rounded-lg text-lg transform rotate-12 shadow-md">
                  60% OFF
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop" 
                  alt="Premium Headphones Deal" 
                  className="w-full h-auto rounded-xl mb-4 object-cover aspect-square"
                />
                <h3 className="text-xl font-bold text-card-foreground">Premium Wireless Headphones</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-2xl font-black text-primary">R 899</span>
                  <span className="text-sm font-medium text-muted-foreground line-through">R 2,299</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-4 overflow-hidden">
                  <div className="bg-destructive h-full w-[85%] rounded-full"></div>
                </div>
                <p className="text-xs font-bold text-destructive mt-1">Almost sold out!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Flash Sales Strip */}
      <section className="container mx-auto px-4">
        <div className="bg-destructive text-destructive-foreground rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute -left-12 -top-12 opacity-10">
            <Timer className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-white text-destructive rounded-full p-3 shadow-inner">
              <Timer className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic tracking-tight">24-HOUR FLASH SALES</h2>
              <p className="font-medium opacity-90">Prices drop at midnight. Limited stock available.</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 text-center font-mono font-bold text-xl">
              <div className="bg-black/20 backdrop-blur px-3 py-2 rounded-lg min-w-[3rem]">12</div>
              <span className="py-2">:</span>
              <div className="bg-black/20 backdrop-blur px-3 py-2 rounded-lg min-w-[3rem]">45</div>
              <span className="py-2">:</span>
              <div className="bg-black/20 backdrop-blur px-3 py-2 rounded-lg min-w-[3rem]">30</div>
            </div>
            <Button asChild variant="secondary" className="bg-white text-destructive hover:bg-gray-100 font-bold hidden sm:flex">
              <Link href="/shop?on_sale=true">Shop Flash Deals</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Deals */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-black italic tracking-tight">Today's Top Deals</h2>
          </div>
          <Link href="/shop" className="text-primary font-bold hover:underline flex items-center">
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {loadingFeatured ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))
          ) : featured?.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-muted/50 py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black italic tracking-tight mb-8 text-center">Shop By Category</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {loadingCategories ? (
              Array(6).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))
            ) : categories?.slice(0, 6).map(category => (
              <Link key={category.id} href={`/shop/${category.slug}`} className="bg-card hover:bg-primary hover:text-primary-foreground border-border hover:border-primary border rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-colors group shadow-sm">
                <div className="bg-primary/10 text-primary group-hover:bg-white/20 group-hover:text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors">
                  {/* We would use the Lucide icon based on category.icon here, using a generic placeholder for now */}
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{category.name}</h3>
                  <p className="text-xs opacity-70 mt-1">{category.productCount} Items</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-black italic tracking-tight">Just Landed</h2>
          <Link href="/shop" className="text-primary font-bold hover:underline flex items-center">
            More New <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {loadingNew ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))
          ) : newArrivals?.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="container mx-auto px-4 py-8 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-secondary/10 text-secondary w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="font-bold text-lg mb-2">Secure Payments</h3>
            <p className="text-sm text-muted-foreground">EFT, Capitec, and Card payments processed securely.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-secondary/10 text-secondary w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <h3 className="font-bold text-lg mb-2">Nationwide Delivery</h3>
            <p className="text-sm text-muted-foreground">Free delivery for orders over R400. R99 anywhere else.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-secondary/10 text-secondary w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>
            <h3 className="font-bold text-lg mb-2">Easy Returns</h3>
            <p className="text-sm text-muted-foreground">7-day return policy for unused items in original packaging.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
