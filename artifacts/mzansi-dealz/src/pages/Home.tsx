import { Link } from "wouter";
import {
  useGetFeaturedProducts,
  useGetNewArrivals,
} from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Zap,
  Tag,
  ShieldCheck,
  Truck,
  Star,
  BadgePercent,
  Cpu,
  Home as HomeIcon,
  Sparkles,
  Shirt,
  Sun,
  Leaf,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { name: "Electronics", slug: "electronics", icon: Cpu, color: "bg-blue-50 text-blue-600 group-hover:bg-blue-100" },
  { name: "Home & Living", slug: "home-living", icon: HomeIcon, color: "bg-green-50 text-green-600 group-hover:bg-green-100" },
  { name: "Beauty & Health", slug: "health-beauty", icon: Sparkles, color: "bg-pink-50 text-pink-600 group-hover:bg-pink-100" },
  { name: "Fashion", slug: "fashion", icon: Shirt, color: "bg-purple-50 text-purple-600 group-hover:bg-purple-100" },
  { name: "Outdoor & Lifestyle", slug: "outdoor-lifestyle", icon: Sun, color: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100" },
  { name: "Wellness", slug: "wellness", icon: Leaf, color: "bg-teal-50 text-teal-600 group-hover:bg-teal-100" },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, title: "Secure Checkout", desc: "All payments are SSL-encrypted and processed securely via PayFast." },
  { icon: Truck, title: "Fast Nationwide Delivery", desc: "Free delivery over R400. Gauteng R69, Nationwide R99." },
  { icon: Star, title: "Quality Products", desc: "Carefully sourced products that meet our quality standards." },
  { icon: BadgePercent, title: "Great South African Deals", desc: "Up to 60% off everyday items — updated daily." },
];

export default function Home() {
  const { data: featured, isLoading: loadingFeatured } = useGetFeaturedProducts({ limit: 4 });
  const { data: newArrivals, isLoading: loadingNew } = useGetNewArrivals({ limit: 4 });

  return (
    <div className="flex flex-col gap-10 pb-12">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground pt-10 pb-14 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white rounded-full" />
          <div className="absolute bottom-0 left-10 w-64 h-64 bg-white rounded-full" />
        </div>

        <div className="container mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 space-y-5 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-3 py-1 rounded-full font-bold text-xs tracking-wide shadow-sm">
                <Zap className="w-3.5 h-3.5" fill="currentColor" />
                SOUTH AFRICA'S BEST DEALS
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black italic tracking-tighter leading-tight">
                South Africa's Best<br />
                <span className="text-accent underline decoration-white/60 underline-offset-8">
                  Deals Delivered
                </span><br />
                To Your Door
              </h1>
              <p className="text-base sm:text-lg md:text-xl font-medium max-w-xl text-primary-foreground/90 leading-snug mx-auto md:mx-0">
                Discover unbeatable prices on electronics, home essentials, beauty products, fashion, wellness items and more. Shop trusted products at great prices with delivery nationwide.
              </p>
              <div className="flex flex-wrap gap-3 pt-2 justify-center md:justify-start">
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base font-bold px-6 h-12 shadow-lg shadow-black/10">
                  <Link href="/shop">Shop Deals</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary text-base font-bold px-6 h-12 bg-transparent">
                  <Link href="/shop?new=true">New Arrivals</Link>
                </Button>
              </div>
            </div>

            <div className="flex-1 w-full max-w-sm hidden md:block">
              <div className="relative">
                <div className="absolute inset-0 bg-accent rounded-3xl transform rotate-3 scale-105 shadow-xl" />
                <div className="absolute inset-0 bg-secondary rounded-3xl transform -rotate-3 scale-105 shadow-xl" />
                <div className="relative bg-card rounded-3xl p-5 shadow-2xl overflow-hidden border border-border">
                  <div className="absolute top-4 right-4 bg-destructive text-white font-black px-3 py-1.5 rounded-lg text-base transform rotate-12 shadow-md">
                    60% OFF
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop"
                    alt="Premium Wireless Headphones Deal"
                    className="w-full h-auto rounded-xl mb-3 object-cover aspect-square"
                  />
                  <h3 className="text-lg font-bold text-card-foreground">Premium Wireless Headphones</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-2xl font-black text-primary">R 899</span>
                    <span className="text-sm font-medium text-muted-foreground line-through">R 2,299</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-3 overflow-hidden">
                    <div className="bg-destructive h-full w-[85%] rounded-full" />
                  </div>
                  <p className="text-xs font-bold text-destructive mt-1">Almost sold out!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TRUST_BADGES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col sm:flex-row items-center sm:items-start gap-3 bg-card border border-border rounded-xl p-4 shadow-sm text-center sm:text-left">
              <div className="bg-primary/10 text-primary w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">{title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug hidden sm:block">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-muted/40 py-10">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black italic tracking-tight mb-6 text-center">Shop By Category</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORIES.map(({ name, slug, icon: Icon, color }) => (
              <Link
                key={slug}
                href={`/shop/${slug}`}
                className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all hover:shadow-md hover:-translate-y-0.5 group"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-xs leading-tight">{name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Deals */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-black italic tracking-tight">Today's Top Deals</h2>
          </div>
          <Link href="/shop" className="text-primary font-bold hover:underline flex items-center text-sm">
            View All <ChevronRight className="w-4 h-4 ml-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {loadingFeatured
            ? Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[180px] w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))
            : featured?.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-black italic tracking-tight">New Arrivals</h2>
          <Link href="/shop?new=true" className="text-primary font-bold hover:underline flex items-center text-sm">
            See More <ChevronRight className="w-4 h-4 ml-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {loadingNew
            ? Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[180px] w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))
            : newArrivals?.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      {/* Bottom Trust Strip */}
      <section className="container mx-auto px-4 py-6 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-secondary/10 text-secondary w-14 h-14 rounded-full flex items-center justify-center mb-3">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="font-bold mb-1">Secure Payments</h3>
            <p className="text-sm text-muted-foreground">EFT, Capitec Pay, Visa &amp; Mastercard processed securely.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-secondary/10 text-secondary w-14 h-14 rounded-full flex items-center justify-center mb-3">
              <Truck className="w-7 h-7" />
            </div>
            <h3 className="font-bold mb-1">Nationwide Delivery</h3>
            <p className="text-sm text-muted-foreground">Free delivery for orders over R400. R99 anywhere in SA.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-secondary/10 text-secondary w-14 h-14 rounded-full flex items-center justify-center mb-3">
              <Star className="w-7 h-7" />
            </div>
            <h3 className="font-bold mb-1">Quality Guaranteed</h3>
            <p className="text-sm text-muted-foreground">7-day return policy for unused items in original packaging.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
