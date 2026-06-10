import { Link } from "wouter";
import { RotateCcw, CheckCircle, XCircle, Clock, Package, AlertTriangle } from "lucide-react";

export default function ReturnsRefunds() {
  return (
    <div className="pb-16">
      <div className="bg-secondary text-white py-12 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black italic tracking-tight mb-3">Returns &amp; <span className="text-primary">Refunds</span></h1>
          <p className="text-gray-300">We want you to shop with confidence.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-12">
        {/* Quick Summary */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-10">
          <div className="flex items-center gap-3 mb-4">
            <RotateCcw className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Our Return Policy at a Glance</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div><strong>7 days</strong> from delivery to request a return</div>
            </div>
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>Items must be <strong>unused</strong> in original packaging</div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>Refunds processed within <strong>3–5 business days</strong></div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">What Can Be Returned?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-green-800">Eligible for Return</h3>
                </div>
                <ul className="space-y-1.5 text-sm text-green-700">
                  <li>Unused items in original, sealed packaging</li>
                  <li>Items with all tags and accessories included</li>
                  <li>Defective or damaged items (reported within 48 hours)</li>
                  <li>Wrong item delivered</li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-red-800">Not Eligible for Return</h3>
                </div>
                <ul className="space-y-1.5 text-sm text-red-700">
                  <li>Used or opened items (unless defective)</li>
                  <li>Items returned after 7 days</li>
                  <li>Personal hygiene products once opened</li>
                  <li>Digital products or downloads</li>
                  <li>Items damaged through misuse</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">How to Return an Item</h2>
            <div className="space-y-4">
              {[
                { step: "1", title: "Contact Us", body: "Email us at sales@mzansidealz.com or WhatsApp +27 67 766 4764 within 7 days of delivery. Include your order number and reason for return." },
                { step: "2", title: "Get Approval", body: "We'll review your request and send you a Return Merchandise Authorisation (RMA) number and return instructions within 24 hours on business days." },
                { step: "3", title: "Package and Send", body: "Pack the item securely in its original packaging. Write the RMA number on the outside of the package. You are responsible for return shipping costs unless the item is defective or incorrect." },
                { step: "4", title: "Receive Your Refund", body: "Once we receive and inspect the returned item, we'll process your refund within 3–5 business days. Refunds are issued to the original payment method." },
              ].map(({ step, title, body }) => (
                <div key={step} className="flex gap-4 bg-card border border-border rounded-xl p-4">
                  <div className="bg-primary text-primary-foreground w-9 h-9 rounded-full flex items-center justify-center font-black text-lg shrink-0">
                    {step}
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">Refund Information</h2>
            <div className="bg-card border border-border rounded-xl p-5 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <p>Refunds are processed to the <strong className="text-foreground">original payment method</strong> (card, EFT, Capitec Pay).</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <p><strong className="text-foreground">Delivery fees</strong> are non-refundable unless the return is due to our error.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <p>Refunds may take <strong className="text-foreground">3–7 banking days</strong> to reflect in your account depending on your bank.</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                <p>Damaged or incomplete returns may be subject to a restocking fee or may be declined.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 bg-secondary text-white rounded-xl p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Need Help With a Return?</h3>
          <p className="text-gray-300 text-sm mb-4">Our team is ready to assist you. Contact us and we'll sort it out quickly.</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-primary/90 transition-colors">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
