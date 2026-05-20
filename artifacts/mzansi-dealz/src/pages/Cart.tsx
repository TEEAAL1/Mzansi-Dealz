import { useCart } from "@/hooks/use-cart";
import { formatZAR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Trash2, Minus, Plus, ShoppingBag, ShieldCheck, CreditCard } from "lucide-react";

export default function Cart() {
  const { items, updateQuantity, removeFromCart, subtotal, totalItems } = useCart();
  
  const deliveryFee = subtotal > 400 ? 0 : 99; // Simple assumption: R99 nationwide unless over R400
  const total = subtotal + (items.length > 0 ? deliveryFee : 0);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="bg-muted w-24 h-24 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-black italic tracking-tight mb-2">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Looks like you haven't added any deals yet. Browse our shop to find massive savings.
        </p>
        <Button asChild size="lg" className="font-bold px-8">
          <Link href="/shop">Start Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-black italic tracking-tight mb-8">
        Your Cart <span className="text-xl text-muted-foreground font-medium not-italic ml-2">({totalItems} items)</span>
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-4">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-4 p-4 bg-muted/50 border-b border-border text-sm font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            
            <ul className="divide-y divide-border">
              {items.map(item => (
                <li key={item.productId} className="p-4 flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center">
                  <div className="col-span-6 flex items-center gap-4 w-full">
                    <Link href={`/product/${item.productId}`} className="w-20 h-20 shrink-0 bg-muted rounded-md border border-border overflow-hidden">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/product/${item.productId}`} className="font-bold text-sm md:text-base hover:text-primary transition-colors line-clamp-2">
                        {item.name}
                      </Link>
                    </div>
                  </div>
                  
                  <div className="col-span-2 text-center font-medium w-full sm:w-auto flex justify-between sm:block">
                    <span className="sm:hidden text-muted-foreground text-sm">Price:</span>
                    {formatZAR(item.price)}
                  </div>
                  
                  <div className="col-span-2 flex justify-center w-full sm:w-auto">
                    <div className="flex items-center border border-input rounded-lg overflow-hidden h-9 w-24">
                      <button 
                        className="w-8 h-full flex items-center justify-center hover:bg-muted text-muted-foreground"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <div className="flex-1 text-center font-bold text-sm">
                        {item.quantity}
                      </div>
                      <button 
                        className="w-8 h-full flex items-center justify-center hover:bg-muted text-muted-foreground"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="col-span-2 w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4">
                    <span className="sm:hidden text-muted-foreground text-sm font-medium">Total:</span>
                    <div className="font-black text-primary text-lg">
                      {formatZAR(item.price * item.quantity)}
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.productId)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-2 sm:p-0"
                      title="Remove item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4 border-b border-border pb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items ({totalItems})</span>
                <span className="font-medium">{formatZAR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium">
                  {deliveryFee === 0 ? <span className="text-green-600 font-bold">FREE</span> : formatZAR(deliveryFee)}
                </span>
              </div>
              {deliveryFee > 0 && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Spend {formatZAR(400 - subtotal)} more to get free delivery!
                </div>
              )}
            </div>
            
            <div className="border-t border-border pt-4 mb-6">
              <div className="flex justify-between items-end">
                <span className="font-bold text-lg">Total</span>
                <span className="font-black text-2xl text-primary">{formatZAR(total)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">Includes VAT</p>
            </div>
            
            <Button size="lg" className="w-full h-14 text-lg font-bold tracking-wide shadow-md">
              SECURE CHECKOUT
            </Button>
            
            <div className="mt-6 space-y-3 border-t border-border pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>100% Secure Encrypted Checkout</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>EFT, Capitec, & Card Accepted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
