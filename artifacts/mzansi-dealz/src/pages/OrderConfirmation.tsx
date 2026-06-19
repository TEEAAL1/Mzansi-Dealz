import { useGetOrder } from "@workspace/api-client-react";
import { formatZAR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CheckCircle2, Clock, XCircle, ShoppingBag, MapPin, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderConfirmation({ params }: { params: { orderNumber: string } }) {
  const { data: order, isLoading, error } = useGetOrder(params.orderNumber, {
    query: {
      enabled: !!params.orderNumber,
      refetchInterval: 5000,
      queryKey: ["order", params.orderNumber]
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <Skeleton className="w-24 h-24 rounded-full mx-auto mb-8" />
        <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
        <Skeleton className="h-6 w-1/2 mx-auto mb-12" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="bg-destructive/10 text-destructive w-24 h-24 rounded-full flex items-center justify-center mb-6">
          <XCircle className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black italic tracking-tight mb-2">Order Not Found</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          We couldn't find the details for order #{params.orderNumber}.
        </p>
        <Button asChild size="lg" className="font-bold">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  const isPending = order.status === "pending";
  const isPaid = order.status === "paid";
  const isCancelled = order.status === "cancelled";

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-sm border-4 ${
          isPaid ? "bg-green-100 text-green-600 border-green-200" : 
          isPending ? "bg-yellow-100 text-yellow-600 border-yellow-200" : 
          "bg-red-100 text-red-600 border-red-200"
        }`}>
          {isPaid ? <CheckCircle2 className="w-12 h-12" /> :
           isPending ? <Clock className="w-12 h-12" /> :
           <XCircle className="w-12 h-12" />}
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tight mb-4">
          Thank you, {order.customerName.split(' ')[0]}!
        </h1>
        
        <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full mb-6 text-sm font-medium">
          <span className="text-muted-foreground">Order #</span>
          <span className="font-bold tracking-wider">{order.orderNumber}</span>
        </div>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {isPending && `Your payment is being confirmed. We'll email you at ${order.customerEmail} once confirmed.`}
          {isPaid && "Payment confirmed! Your order is being packed for delivery."}
          {isCancelled && "This order has been cancelled."}
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 bg-muted/50 border-b border-border flex items-center gap-3">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Order Items</h2>
            </div>
            <div className="p-6">
              <ul className="space-y-6">
                {order.items.map(item => (
                  <li key={item.id} className="flex gap-4">
                    <div className="w-20 h-20 shrink-0 bg-muted rounded-md border border-border overflow-hidden">
                      <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold line-clamp-2 leading-tight mb-2">{item.productName}</h4>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Qty: {item.quantity} × {formatZAR(item.price)}</span>
                        <span className="font-bold text-base">{formatZAR(item.subtotal)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-muted/30 p-6 border-t border-border space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatZAR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-medium">
                  {order.deliveryFee === 0 ? <span className="text-green-600 font-bold">FREE</span> : formatZAR(order.deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
                <span className="font-bold text-lg">Total Paid</span>
                <span className="font-black text-2xl text-primary">{formatZAR(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 bg-muted/50 border-b border-border flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Delivery Details</h2>
            </div>
            <div className="p-6 text-sm space-y-4">
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Customer</h4>
                <p className="font-medium">{order.customerName}</p>
                <p>{order.customerEmail}</p>
                <p>{order.customerPhone}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Address</h4>
                <p className="font-medium">{order.deliveryAddress}</p>
                <p>{order.deliveryCity}</p>
                <p>{order.deliveryProvince}</p>
                <p>{order.deliveryPostalCode}</p>
              </div>
            </div>
          </div>

          <Button asChild size="lg" className="w-full h-14 font-bold">
            <Link href="/shop">
              <ShoppingBag className="w-5 h-5 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
