import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { apiUrl, useCreateCheckout } from "@workspace/api-client-react";
import { formatZAR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, CreditCard, Landmark, Lock, ShieldCheck, ShoppingBag, Wallet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Limpopo",
  "Mpumalanga",
  "Free State",
  "North West",
  "Northern Cape",
];

type GatewayId = "yoco" | "payfast";
type GatewayOption = {
  id: GatewayId;
  name: string;
  available: boolean;
  description: string;
  methods: string[];
};

type CheckoutOptions = {
  defaultGateway: GatewayId | null;
  gateways: GatewayOption[];
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, subtotal, clearCart, totalItems } = useCart();
  const { mutate: checkout, isPending } = useCreateCheckout();
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutOptions, setCheckoutOptions] = useState<CheckoutOptions | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<GatewayId>("yoco");
  const [optionsError, setOptionsError] = useState("");

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    deliveryAddress: "",
    deliveryCity: "",
    deliveryProvince: "",
    deliveryPostalCode: "",
  });

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/checkout/options"), { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Payment methods are temporarily unavailable.");
        return response.json() as Promise<CheckoutOptions>;
      })
      .then((data) => {
        if (cancelled) return;
        setCheckoutOptions(data);
        if (data.defaultGateway) setSelectedGateway(data.defaultGateway);
      })
      .catch((error) => {
        if (!cancelled) setOptionsError(error instanceof Error ? error.message : "Payment methods are temporarily unavailable.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // If cart is empty, user shouldn't be here
  if (items.length === 0) {
    setLocation("/cart");
    return null;
  }

  const deliveryFee = subtotal >= 400 ? 0 : 69;
  const grandTotal = subtotal + deliveryFee;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");
    checkout({
      data: {
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        ...formData,
        gateway: selectedGateway,
        idempotencyKey: `web-${Date.now()}-${crypto.randomUUID()}`,
      }
    }, {
      onSuccess: (response) => {
        clearCart();
        if (response.gateway === "yoco") {
          window.location.assign(response.redirectUrl);
          return;
        }
        if (!response.payfastData) {
          window.location.assign(response.redirectUrl);
          return;
        }
        const form = document.createElement("form");
        form.method = "POST";
        form.action = response.payfastUrl ?? response.redirectUrl;
        Object.entries(response.payfastData ?? {}).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "We could not start payment. Please try again.";
        setCheckoutError(message);
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-black italic tracking-tight mb-8">Secure Checkout</h1>

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Customer Details
            </h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customerName">Full Name</Label>
                <Input 
                  id="customerName" 
                  name="customerName" 
                  required 
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="e.g. Sipho Nkosi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email Address</Label>
                <Input 
                  id="customerEmail" 
                  name="customerEmail" 
                  type="email" 
                  required 
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  placeholder="e.g. sipho@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input 
                  id="customerPhone" 
                  name="customerPhone" 
                  type="tel" 
                  required 
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  placeholder="e.g. 082 123 4567"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              Delivery Details
            </h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="deliveryAddress">Street Address</Label>
                <Input 
                  id="deliveryAddress" 
                  name="deliveryAddress" 
                  required 
                  value={formData.deliveryAddress}
                  onChange={handleInputChange}
                  placeholder="e.g. 123 Mandela Street, Sandton"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryCity">City</Label>
                <Input 
                  id="deliveryCity" 
                  name="deliveryCity" 
                  required 
                  value={formData.deliveryCity}
                  onChange={handleInputChange}
                  placeholder="e.g. Johannesburg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryProvince">Province</Label>
                <Select 
                  required 
                  value={formData.deliveryProvince} 
                  onValueChange={(v) => handleSelectChange("deliveryProvince", v)}
                >
                  <SelectTrigger id="deliveryProvince">
                    <SelectValue placeholder="Select a province" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map(prov => (
                      <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryPostalCode">Postal Code</Label>
                <Input 
                  id="deliveryPostalCode" 
                  name="deliveryPostalCode" 
                  required 
                  value={formData.deliveryPostalCode}
                  onChange={handleInputChange}
                  placeholder="e.g. 2196"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              Payment method
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Choose a secure hosted payment page. Your card details never pass through MzansiDealz.
            </p>
            {optionsError ? (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{optionsError}</p>
            ) : !checkoutOptions ? (
              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Loading secure payment methods…</div>
            ) : checkoutOptions.gateways.filter((gateway) => gateway.available).length === 0 ? (
              <p role="alert" className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">No payment gateway is currently available. Please try again later.</p>
            ) : (
              <div className="space-y-3">
                {checkoutOptions.gateways.map((gateway) => {
                  const isSelected = selectedGateway === gateway.id;
                  return (
                    <button
                      key={gateway.id}
                      type="button"
                      disabled={!gateway.available}
                      onClick={() => gateway.available && setSelectedGateway(gateway.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected && gateway.available
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : gateway.available
                            ? "border-border hover:border-primary/50"
                            : "cursor-not-allowed border-border bg-muted/40 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg ${
                          isSelected && gateway.available ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {gateway.id === "yoco" ? <CreditCard className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold">{gateway.name}</span>
                            {isSelected && gateway.available && <Check className="h-5 w-5 text-primary" />}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {gateway.available ? gateway.description : "Currently unavailable"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {gateway.methods.map((method) => (
                              <span key={method} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                                {method.includes("EFT") || method.includes("Pay") ? <Landmark className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                                {method}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[400px] shrink-0">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden sticky top-24">
            <div className="p-6 bg-muted/50 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Your Order
              </h2>
              <span className="text-sm font-medium text-muted-foreground">{totalItems} items</span>
            </div>
            
            <div className="p-6">
              <ul className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                {items.map(item => (
                  <li key={item.productId} className="flex gap-4">
                    <div className="w-16 h-16 shrink-0 bg-muted rounded-md border border-border overflow-hidden">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-bold text-sm line-clamp-2 leading-tight mb-1">{item.name}</h4>
                      <div className="text-sm text-muted-foreground flex justify-between">
                        <span>Qty: {item.quantity}</span>
                        <span className="font-medium text-foreground">{formatZAR(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              
              <div className="space-y-3 mb-6 text-sm border-t border-border pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatZAR(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium">
                    {deliveryFee === 0 ? <span className="text-green-600 font-bold">FREE</span> : formatZAR(deliveryFee)}
                  </span>
                </div>
              </div>
              
              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between items-end">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-black text-2xl text-primary">{formatZAR(grandTotal)}</span>
                </div>
              </div>
              
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-14 text-lg font-bold tracking-wide shadow-md"
                disabled={
                  isPending ||
                  !checkoutOptions ||
                  !checkoutOptions.gateways.some((gateway) => gateway.available)
                }
              >
                {isPending ? "PROCESSING..." : `Continue with ${selectedGateway === "yoco" ? "Yoco" : "PayFast"}`}
              </Button>
              {checkoutError && (
                <p role="alert" className="mt-3 text-sm text-destructive text-center">{checkoutError}</p>
              )}
              
              <div className="mt-6 space-y-3 pt-6 border-t border-border text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>Secure hosted payment. 7-day returns. Free delivery over R400.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
