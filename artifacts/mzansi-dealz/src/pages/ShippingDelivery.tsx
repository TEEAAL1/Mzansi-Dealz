import { Truck, Clock, MapPin, Package, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function ShippingDelivery() {
  return (
    <div className="pb-16">
      <div className="bg-secondary text-white py-12 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black italic tracking-tight mb-3">Shipping &amp; <span className="text-primary">Delivery</span></h1>
          <p className="text-gray-300">Fast, reliable nationwide delivery across South Africa.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-12">
        {/* Delivery Rates */}
        <h2 className="text-2xl font-black italic tracking-tight mb-5">Delivery Rates</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Package, label: "Orders over R400", rate: "FREE", note: "Standard delivery nationwide", highlight: true },
            { icon: MapPin, label: "Gauteng", rate: "R 69", note: "1–3 working days", highlight: false },
            { icon: Truck, label: "Nationwide (All Provinces)", rate: "R 99", note: "3–5 working days", highlight: false },
          ].map(({ icon: Icon, label, rate, note, highlight }) => (
            <div key={label} className={`rounded-xl p-5 border text-center ${highlight ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-card border-border"}`}>
              <Icon className={`w-8 h-8 mx-auto mb-3 ${highlight ? "text-primary-foreground" : "text-primary"}`} />
              <div className={`text-3xl font-black mb-1 ${highlight ? "text-primary-foreground" : "text-primary"}`}>{rate}</div>
              <div className={`font-bold text-sm mb-0.5 ${highlight ? "text-primary-foreground" : "text-foreground"}`}>{label}</div>
              <div className={`text-xs ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{note}</div>
            </div>
          ))}
        </div>

        {/* Delivery Times */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Estimated Delivery Times
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left px-4 py-3 font-bold">Province / Area</th>
                  <th className="text-left px-4 py-3 font-bold">Estimated Delivery</th>
                  <th className="text-left px-4 py-3 font-bold">Delivery Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { area: "Gauteng (major cities)", time: "1–3 working days", fee: "R 69" },
                  { area: "Cape Town, Durban, Port Elizabeth", time: "2–4 working days", fee: "R 99" },
                  { area: "Other major cities", time: "3–5 working days", fee: "R 99" },
                  { area: "Remote / rural areas", time: "5–7 working days", fee: "R 99" },
                  { area: "All orders over R400", time: "Standard delivery time applies", fee: "FREE" },
                ].map(({ area, time, fee }) => (
                  <tr key={area} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{area}</td>
                    <td className="px-4 py-3 text-muted-foreground">{time}</td>
                    <td className={`px-4 py-3 font-bold ${fee === "FREE" ? "text-green-600" : "text-foreground"}`}>{fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">* Working days exclude weekends and South African public holidays. Delivery times are estimates and not guaranteed.</p>
        </section>

        {/* How it works */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">How Delivery Works</h2>
          <div className="space-y-3">
            {[
              { title: "Order Placed", body: "You place your order and complete payment via PayFast." },
              { title: "Order Confirmed", body: "You receive an email confirmation with your order number. We process orders Monday–Friday." },
              { title: "Dispatched", body: "Your order is packed and handed to our courier. You'll receive a tracking number via email or SMS." },
              { title: "Out for Delivery", body: "You'll receive a notification when your order is out for delivery." },
              { title: "Delivered", body: "Your order arrives at your specified address. A signature may be required." },
            ].map(({ title, body }, i) => (
              <div key={title} className="flex gap-4 bg-card border border-border rounded-xl p-4">
                <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="font-bold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Important Notes */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" /> Important Notes
          </h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 space-y-2.5">
            {[
              "Ensure your delivery address is correct at checkout — re-delivery charges may apply for failed deliveries due to incorrect addresses.",
              "We currently only deliver within South Africa. We do not ship internationally.",
              "Orders placed on weekends or public holidays are processed on the next working day.",
              "If your order is split across multiple items, they may be delivered in separate parcels.",
              "Please inspect your parcel upon delivery and report any damage within 48 hours.",
            ].map((note, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-yellow-800">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />
                <p>{note}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-secondary text-white rounded-xl p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Questions About Your Delivery?</h3>
          <p className="text-gray-300 text-sm mb-4">Contact us with your order number and we'll track it for you.</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-primary/90 transition-colors">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
