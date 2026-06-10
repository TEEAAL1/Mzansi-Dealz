import { Link } from "wouter";
import { useGetProductStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Footer() {
  const { data: stats, isLoading } = useGetProductStats();

  return (
    <footer className="bg-secondary text-white pt-12 pb-6 mt-12 border-t-4 border-primary">
      <div className="container mx-auto px-4">
        {/* Stats Strip */}
        <div className="bg-white/5 rounded-xl p-5 mb-10 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10">
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-lg font-bold mb-1">South Africa's Favourite Deals Store</h4>
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-xl font-black italic tracking-tight mb-3">
              Mzansi<span className="text-primary">Dealz</span>
            </h3>
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
              South Africa's best deals online. Affordable electronics, home essentials, beauty products, fashion and more — delivered to your door.
            </p>
            <div className="flex flex-col gap-1 text-sm text-gray-300">
              <a href="mailto:sales@mzansidealz.com" className="hover:text-primary transition-colors">sales@mzansidealz.com</a>
              <a href="https://wa.me/27677664764" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">WhatsApp: +27 67 766 4764</a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-base mb-3">Customer Care</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/returns-refunds" className="hover:text-primary transition-colors">Returns &amp; Refunds</Link></li>
              <li><Link href="/shipping-delivery" className="hover:text-primary transition-colors">Shipping &amp; Delivery</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-base mb-3">Shop By Category</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/shop/electronics" className="hover:text-primary transition-colors">Electronics</Link></li>
              <li><Link href="/shop/home-living" className="hover:text-primary transition-colors">Home &amp; Living</Link></li>
              <li><Link href="/shop/health-beauty" className="hover:text-primary transition-colors">Beauty &amp; Health</Link></li>
              <li><Link href="/shop/fashion" className="hover:text-primary transition-colors">Fashion</Link></li>
              <li><Link href="/shop/wellness" className="hover:text-primary transition-colors">Wellness</Link></li>
              <li><Link href="/shop" className="hover:text-primary transition-colors">View All Deals</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-base mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-conditions" className="hover:text-primary transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/returns-refunds" className="hover:text-primary transition-colors">Returns Policy</Link></li>
              <li><Link href="/shipping-delivery" className="hover:text-primary transition-colors">Shipping Policy</Link></li>
            </ul>
            <div className="mt-4">
              <h4 className="font-bold text-sm mb-2">Payment Methods</h4>
              <div className="flex gap-2 flex-wrap">
                <span className="bg-white/10 px-2 py-0.5 rounded text-xs">EFT</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-xs">Capitec Pay</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-xs">Visa</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-xs">Mastercard</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs text-gray-400">
          <p>&copy; {new Date().getFullYear()} MzansiDealz.com — Proudly South African. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
