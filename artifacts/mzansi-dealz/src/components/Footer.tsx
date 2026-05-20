import { Link } from "wouter";
import { useGetProductStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Footer() {
  const { data: stats, isLoading } = useGetProductStats();

  return (
    <footer className="bg-secondary text-white pt-12 pb-6 mt-12 border-t-4 border-primary">
      <div className="container mx-auto px-4">
        {/* Stats Strip */}
        <div className="bg-white/5 rounded-xl p-6 mb-12 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-xl font-bold mb-1">Mzansi's Fastest Growing Marketplace</h4>
            <p className="text-sm text-gray-400">Join thousands of South Africans saving big every day.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="text-center">
              {isLoading ? <Skeleton className="h-8 w-16 mx-auto mb-1 bg-white/20" /> : <div className="text-3xl font-black text-primary">{stats?.totalProducts || 0}+</div>}
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Active Deals</div>
            </div>
            <div className="text-center">
              {isLoading ? <Skeleton className="h-8 w-16 mx-auto mb-1 bg-white/20" /> : <div className="text-3xl font-black text-primary">{stats?.avgDiscountPercent || 0}%</div>}
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Avg Discount</div>
            </div>
            <div className="text-center hidden sm:block">
              {isLoading ? <Skeleton className="h-8 w-16 mx-auto mb-1 bg-white/20" /> : <div className="text-3xl font-black text-primary">{stats?.totalCategories || 0}</div>}
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Categories</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-black italic tracking-tight mb-4">
              Mzansi<span className="text-primary">Dealz</span>
            </h3>
            <p className="text-sm text-gray-300 mb-4">
              South Africa's favorite spot for massive discounts. Shop smart, save big.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4">Customer Care</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/about" className="hover:text-primary transition-colors">Help Centre</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">Track Your Order</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">Returns & Refunds</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">Delivery Information</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4">Shop By Category</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/shop/electronics" className="hover:text-primary transition-colors">Electronics Deals</Link></li>
              <li><Link href="/shop/home-living" className="hover:text-primary transition-colors">Home & Living</Link></li>
              <li><Link href="/shop/health-beauty" className="hover:text-primary transition-colors">Health & Beauty</Link></li>
              <li><Link href="/shop" className="hover:text-primary transition-colors">View All Deals</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4">Payment Methods</h4>
            <div className="flex gap-2 flex-wrap text-sm text-gray-300">
              <span className="bg-white/10 px-3 py-1 rounded">EFT Secure</span>
              <span className="bg-white/10 px-3 py-1 rounded">Capitec Pay</span>
              <span className="bg-white/10 px-3 py-1 rounded">Visa / Mastercard</span>
            </div>
            <div className="mt-4">
              <h4 className="font-bold mb-2">Delivery</h4>
              <p className="text-sm text-gray-300">Free delivery over R400. R69 Gauteng, R99 Nationwide.</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-6 text-center text-sm text-gray-400 flex flex-col items-center">
          <p>&copy; {new Date().getFullYear()} MzansiDealz.com. Proudly South African.</p>
        </div>
      </div>
    </footer>
  );
}
