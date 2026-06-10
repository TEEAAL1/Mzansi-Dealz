import { Truck, ShieldCheck, CreditCard, Mail, Heart, Star, BadgePercent, Users } from "lucide-react";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="bg-secondary text-white py-14 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tight mb-4">
            About Mzansi<span className="text-primary">Dealz</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-xl mx-auto">
            South Africa's favourite online deals store — bringing you the best prices on electronics, home essentials, beauty, fashion and more.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-12">
        {/* Mission */}
        <div className="border-l-4 border-primary pl-5 mb-12">
          <p className="text-lg font-medium text-foreground leading-relaxed">
            At MzansiDealz, we believe every South African deserves access to quality products at fair prices. We source trusted items across electronics, home living, beauty, fashion, outdoor lifestyle and wellness — and deliver them to your door at unbeatable prices.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: BadgePercent, value: "Up to 60%", label: "Savings on deals" },
            { icon: Users, value: "10,000+", label: "Happy customers" },
            { icon: Star, value: "6", label: "Product categories" },
            { icon: Truck, value: "Nationwide", label: "Delivery available" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-5 text-center shadow-sm">
              <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-black text-primary">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Why Choose Us */}
        <h2 className="text-2xl font-black italic tracking-tight mb-6">Why Choose MzansiDealz?</h2>
        <div className="grid md:grid-cols-2 gap-5 mb-12">
          {[
            {
              icon: BadgePercent,
              title: "Unbeatable Deals",
              body: "We work directly with suppliers to bring you savings of up to 60% off standard retail prices. Our deals are updated daily so there's always something new to discover.",
            },
            {
              icon: ShieldCheck,
              title: "Safe & Secure Shopping",
              body: "We use PayFast — South Africa's leading payment gateway — to process all transactions. Your payment information is encrypted and never stored on our servers.",
            },
            {
              icon: Truck,
              title: "Fast Nationwide Delivery",
              body: "We deliver anywhere in South Africa. Orders over R400 qualify for free delivery. Gauteng flat rate R69, nationwide flat rate R99. Tracking number provided on dispatch.",
            },
            {
              icon: Heart,
              title: "Customer First",
              body: "We stand behind every product we sell. Our 7-day return policy means you can shop with confidence. Contact our support team on WhatsApp or email — we respond quickly.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-card border border-border p-6 rounded-xl shadow-sm">
              <div className="bg-primary/10 w-11 h-11 rounded-full flex items-center justify-center mb-4 text-primary">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center text-primary">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Get In Touch</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold text-foreground">Email Support</p>
              <a href="mailto:sales@mzansidealz.com" className="text-primary hover:underline">sales@mzansidealz.com</a>
            </div>
            <div>
              <p className="font-semibold text-foreground">WhatsApp</p>
              <a href="https://wa.me/27677664764" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">+27 67 766 4764</a>
              <p className="text-muted-foreground text-xs mt-0.5">Messages only</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Business Hours</p>
              <p className="text-muted-foreground">Mon – Fri: 08:00 – 17:00</p>
              <p className="text-muted-foreground">Sat: 09:00 – 13:00</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Link href="/contact" className="text-primary font-bold hover:underline text-sm">Send us a message &rarr;</Link>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/shop" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold hover:bg-primary/90 transition-colors text-sm">
            Start Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
