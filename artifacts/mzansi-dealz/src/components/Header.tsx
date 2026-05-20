import { Link } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Search, ShoppingCart, Menu, X, Truck } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

export function Header() {
  const { totalItems } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      {/* Top Banner */}
      <div className="bg-secondary text-white text-xs py-1.5 px-4 text-center flex justify-center items-center gap-2">
        <Truck className="w-4 h-4" />
        <span className="font-medium">FREE DELIVERY on orders over R400!</span>
      </div>

      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
            
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="bg-primary text-white w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl italic tracking-tighter">
                MD
              </div>
              <span className="text-xl font-black italic tracking-tight hidden sm:block text-foreground">
                Mzansi<span className="text-primary">Dealz</span>
              </span>
            </Link>
          </div>

          <div className="flex-1 max-w-xl hidden md:flex items-center">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Search products, brands and categories..."
                className="w-full border-2 border-primary/20 focus:border-primary rounded-full py-2 pl-4 pr-12 outline-none transition-colors"
              />
              <button className="absolute right-1 top-1 bottom-1 w-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <Link href="/cart" className="relative p-2 text-foreground hover:text-primary transition-colors flex items-center gap-2">
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="hidden sm:block font-bold">Cart</span>
            </Link>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="mt-3 relative w-full md:hidden">
          <input 
            type="text" 
            placeholder="Search products..."
            className="w-full border border-input rounded-full py-2 pl-4 pr-10 outline-none focus:border-primary"
          />
          <button className="absolute right-3 top-2.5 text-muted-foreground">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block border-t border-border bg-muted/30`}>
        <div className="container mx-auto px-4">
          <ul className="flex flex-col md:flex-row md:items-center py-2 md:py-0 gap-1 md:gap-6 text-sm font-semibold">
            <li><Link href="/" className="block py-2 md:py-3 text-foreground hover:text-primary transition-colors">Home</Link></li>
            <li><Link href="/shop" className="block py-2 md:py-3 text-foreground hover:text-primary transition-colors">All Deals</Link></li>
            <li><Link href="/shop/electronics" className="block py-2 md:py-3 text-foreground hover:text-primary transition-colors">Electronics</Link></li>
            <li><Link href="/shop/home-living" className="block py-2 md:py-3 text-foreground hover:text-primary transition-colors">Home & Living</Link></li>
            <li><Link href="/shop/health-beauty" className="block py-2 md:py-3 text-foreground hover:text-primary transition-colors">Health & Beauty</Link></li>
            <li><Link href="/about" className="block py-2 md:py-3 text-foreground hover:text-primary transition-colors">About Us</Link></li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
