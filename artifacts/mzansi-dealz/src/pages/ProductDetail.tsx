import { useGetProduct, getGetProductQueryKey } from "@workspace/api-client-react";
import { formatZAR } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Truck, ShieldCheck, ArrowLeft, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetail({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const { data: product, isLoading } = useGetProduct(id, { query: { enabled: !isNaN(id), queryKey: getGetProductQueryKey(id) } });
  
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  if (isNaN(id)) return <div className="container p-8">Invalid product ID</div>;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          <div className="w-full md:w-1/2">
            <Skeleton className="aspect-square w-full rounded-2xl" />
          </div>
          <div className="w-full md:w-1/2 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-16 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-8">This deal might have expired or sold out.</p>
        <Button asChild><Link href="/shop">Back to Shop</Link></Button>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity
    });
    toast({
      title: "Added to cart",
      description: `${quantity}x ${product.name} added.`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/shop" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Deals
      </Link>
      
      <div className="bg-card border border-border rounded-2xl p-4 md:p-8 shadow-sm flex flex-col md:flex-row gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div className="w-full md:w-1/2">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted border border-border">
            {product.discountPercent > 0 && (
              <div className="absolute top-4 left-4 z-10 bg-destructive text-white px-3 py-1.5 text-sm font-black rounded-lg shadow-lg transform -rotate-2">
                SAVE {product.discountPercent}%
              </div>
            )}
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="mb-2">
            <Link href={`/shop/${product.categoryId}`} className="text-sm font-bold text-primary hover:underline uppercase tracking-wider">
              {product.categoryName}
            </Link>
          </div>
          
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
            {product.name}
          </h1>

          <div className="flex items-end gap-4 mb-6 pb-6 border-b border-border">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground mb-1">Deal Price</span>
              <span className="text-4xl font-black text-primary">
                {formatZAR(product.price)}
              </span>
            </div>
            
            {product.originalPrice > product.price && (
              <div className="flex flex-col pb-1">
                <span className="text-sm text-muted-foreground mb-0.5">Was</span>
                <span className="text-xl font-medium text-muted-foreground line-through decoration-destructive decoration-2">
                  {formatZAR(product.originalPrice)}
                </span>
              </div>
            )}
          </div>

          <div className="prose prose-sm md:prose-base dark:prose-invert mb-8 max-w-none text-muted-foreground">
            {product.description ? (
              <p>{product.description}</p>
            ) : (
              <p>No description available for this deal.</p>
            )}
          </div>

          <div className="mt-auto space-y-6">
            {/* Quantity & Add to Cart */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center border-2 border-input rounded-xl overflow-hidden h-14 w-full sm:w-32 shrink-0">
                <button 
                  className="w-10 h-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center font-bold text-lg">
                  {quantity}
                </div>
                <button 
                  className="w-10 h-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <Button 
                onClick={handleAddToCart}
                size="lg" 
                className="flex-1 h-14 text-lg font-bold tracking-wide shadow-md hover:shadow-lg"
                disabled={!product.inStock}
              >
                {product.inStock ? (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    ADD TO CART
                  </>
                ) : (
                  "OUT OF STOCK"
                )}
              </Button>
            </div>

            {/* Delivery/Trust Info */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3 border border-border">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Delivery Info</h4>
                  <p className="text-xs text-muted-foreground mt-1">Free delivery for orders over R400. R69 Gauteng, R99 Nationwide. Usually takes 2-5 working days.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 pt-3 border-t border-border/50">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Buyer Protection</h4>
                  <p className="text-xs text-muted-foreground mt-1">Secure payment. 7-day return policy for unused items.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
