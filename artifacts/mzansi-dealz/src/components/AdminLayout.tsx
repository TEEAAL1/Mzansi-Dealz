import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ShoppingBag, LogOut, ArrowLeft } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { clearToken } = useAdminAuth();
  const [location] = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/products", icon: Package },
    { name: "Orders", href: "/orders", icon: ShoppingBag },
  ];

  return (
    <div className="flex h-screen w-full bg-gray-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1a2e] text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold tracking-tight">MzansiDealz Admin</h1>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/dashboard");
            return (
              <Link key={item.name} href={item.href}>
                <span className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Link href="/">
            <span className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Back to Shop
            </span>
          </Link>
          <button 
            onClick={clearToken}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
