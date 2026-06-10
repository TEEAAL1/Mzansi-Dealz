import { Link } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Search, ShoppingCart, Menu, X, Truck } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

export function Header() {
  const { totalItems } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "All Deals", href: "/shop" },
    { label: "Electronics", href: "/shop/electronics" },
    { label: "Home & Living", href: "/shop/home-living" },
    { label: "Beauty & Health", href: "/shop/health-beauty" },
    { label: "Fashion", href: "/shop/fashion" },
    { label: "Outdoor & Lifestyle", href: "/shop/outdoor-lifestyle" },
    { label: "Wellness", href: "/shop/wellness" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="bg-secondary text-white text-xs py-1.5 px-4 text-center flex justify-center items-center gap-2">
        <Truck className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium">FREE DELIVERY on orders over R400 — Nationwide delivery available</span>
      </div>

      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>

            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="bg-primary text-white w-9 h-9 rounded-lg flex items-center justify-center font-black text-lg italic tracking-tighter">
                MD
              </div>
              <span className="text-lg font-black italic tracking-tight hidden sm:block text-foreground">
                Mzansi<span className="text-primary">Dealz</span>
              </span>
            </Link>
          </div>

          <div className="flex-1 max-w-xl hidden md:flex items-center">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search products, brands and categories..."
                className="w-full border-2 border-primary/20 focus:border-primary rounded-full py-2 pl-4 pr-12 outline-none transition-colors text-sm"
              />
              <button className="absolute right-1 top-1 bottom-1 w-9 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/cart" className="relative p-2 text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </div>
              <span className="hidden sm:block font-bold text-sm">Cart</span>
            </Link>
          </div>
        </div>

        <div className="mt-3 relative w-full md:hidden">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full border border-input rounded-full py-2 pl-4 pr-10 outline-none focus:border-primary text-sm"
          />
          <button className="absolute right-3 top-2.5 text-muted-foreground">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      <nav className={`${mobileMenuOpen ? "block" : "hidden"} lg:block border-t border-border bg-muted/30`}>
        <div className="container mx-auto px-4">
          <ul className="flex flex-col lg:flex-row lg:items-center py-2 lg:py-0 gap-0.5 lg:gap-5 text-sm font-semibold overflow-x-auto">
            {navLinks.map((link) => (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  className="block py-2 lg:py-3 text-foreground hover:text-primary transition-colors whitespace-nowrap"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="shrink-0">
              <Link
                href="/contact"
                className="block py-2 lg:py-3 text-foreground hover:text-primary transition-colors whitespace-nowrap"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
