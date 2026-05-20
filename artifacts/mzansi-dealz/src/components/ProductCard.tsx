import { Link } from "wouter";
import { formatZAR } from "@/lib/utils";
import { Product } from "@workspace/api-client-react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
    });
    toast({
      title: "Added to cart",
      description: `${product.name} added to your cart.`,
    });
  };

  return (
    <Link href={`/product/${product.id}`} className="group block h-full">
      <div className="bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all h-full flex flex-col relative">
        {product.discountPercent > 0 && (
          <div className="absolute top-2 left-2 z-10 bg-destructive text-white px-2 py-1 text-xs font-bold rounded shadow-sm">
            {product.discountPercent}% OFF
          </div>
        )}
        <div className="aspect-[4/3] bg-muted w-full overflow-hidden relative">
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors flex-1">
            {product.name}
          </h3>
          
          <div className="mt-auto space-y-3">
            <div className="flex flex-col">
              <span className="text-xl font-bold text-primary">
                {formatZAR(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatZAR(product.originalPrice)}
                </span>
              )}
            </div>
            
            <Button 
              onClick={handleAddToCart}
              className="w-full font-bold uppercase tracking-wider"
              size="sm"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
