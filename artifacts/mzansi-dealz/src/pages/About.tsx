import { Truck, ShieldCheck, CreditCard, Mail } from "lucide-react";

export default function About() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tight mb-4">
          About Mzansi<span className="text-primary">Dealz</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          South Africa's fastest-growing discount marketplace.
        </p>
      </div>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="lead font-medium text-xl border-l-4 border-primary pl-4 mb-8">
          We believe everyone deserves a great deal. That's why we source products directly from manufacturers to bring you discounts of 40-60% off standard retail prices.
        </p>

        <div className="grid md:grid-cols-2 gap-8 my-12">
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-primary">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Delivery Information</h3>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li><strong>Free Delivery</strong> on all orders over R400</li>
              <li><strong>Gauteng:</strong> R69 flat rate (1-3 working days)</li>
              <li><strong>Nationwide:</strong> R99 flat rate (3-5 working days)</li>
              <li>Tracking numbers provided via email/SMS</li>
            </ul>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-primary">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Payment Methods</h3>
            <p className="text-muted-foreground text-sm mb-3">
              We use 100% secure, encrypted payment gateways. We never store your card details.
            </p>
            <ul className="space-y-1 text-muted-foreground text-sm">
              <li>• Instant EFT (Ozow)</li>
              <li>• Capitec Pay</li>
              <li>• Visa & Mastercard</li>
              <li>• PayFast</li>
            </ul>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Returns Policy</h3>
            <p className="text-muted-foreground text-sm">
              Not happy? No problem. We offer a 7-day return policy for items in their original, unopened packaging. Contact support to initiate a return. Refunds are processed within 3-5 days of receiving the item back at our warehouse.
            </p>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-primary">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Contact Us</h3>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li><strong>Email:</strong> support@mzansidealz.co.za</li>
              <li><strong>WhatsApp:</strong> 060 123 4567 (Messages only)</li>
              <li><strong>Hours:</strong> Mon-Fri 08:00 - 17:00</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
