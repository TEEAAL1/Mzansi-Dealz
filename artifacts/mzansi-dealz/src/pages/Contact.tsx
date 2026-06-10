import { useState } from "react";
import { Mail, MessageCircle, Clock, MapPin, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="bg-secondary text-white py-12 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tight mb-3">
            Contact <span className="text-primary">Us</span>
          </h1>
          <p className="text-gray-300 text-lg">We're here to help. Reach out anytime.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-5">
            <h2 className="text-2xl font-black italic tracking-tight">Get In Touch</h2>
            <p className="text-muted-foreground leading-relaxed">
              Have a question about an order, a product, or need help with anything? We'd love to hear from you. Fill in the form or reach us directly using the details below.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4 bg-card border border-border rounded-xl p-4">
                <div className="bg-primary/10 text-primary w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Email</p>
                  <a href="mailto:support@mzansidealz.co.za" className="text-primary hover:underline text-sm">support@mzansidealz.co.za</a>
                  <p className="text-xs text-muted-foreground mt-0.5">We reply within 24 hours on business days</p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-card border border-border rounded-xl p-4">
                <div className="bg-[#25D366]/10 text-[#25D366] w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">WhatsApp</p>
                  <a href="https://wa.me/27601234567?text=Hi%20MzansiDealz!%20I%20need%20help%20with%20my%20order." target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:underline font-medium text-sm">
                    060 123 4567
                  </a>
                  <p className="text-xs text-muted-foreground mt-0.5">Messages only — fastest response</p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-card border border-border rounded-xl p-4">
                <div className="bg-primary/10 text-primary w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Business Hours</p>
                  <p className="text-sm text-muted-foreground">Monday – Friday: 08:00 – 17:00</p>
                  <p className="text-sm text-muted-foreground">Saturday: 09:00 – 13:00</p>
                  <p className="text-sm text-muted-foreground">Sunday: Closed</p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-card border border-border rounded-xl p-4">
                <div className="bg-primary/10 text-primary w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Location</p>
                  <p className="text-sm text-muted-foreground">Gauteng, South Africa</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Nationwide delivery available</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
                <h3 className="text-xl font-bold">Message Sent!</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Thanks for reaching out. We'll get back to you within 24 hours on business days.
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-5">Send Us a Message</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Full Name <span className="text-destructive">*</span></label>
                      <input
                        name="name"
                        type="text"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Email Address <span className="text-destructive">*</span></label>
                      <input
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Phone Number</label>
                      <input
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="060 000 0000"
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Subject <span className="text-destructive">*</span></label>
                      <select
                        name="subject"
                        required
                        value={form.subject}
                        onChange={handleChange}
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-background"
                      >
                        <option value="">Select a subject</option>
                        <option value="order">Order Enquiry</option>
                        <option value="product">Product Question</option>
                        <option value="returns">Returns &amp; Refunds</option>
                        <option value="delivery">Delivery Issue</option>
                        <option value="payment">Payment Issue</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Message <span className="text-destructive">*</span></label>
                    <textarea
                      name="message"
                      required
                      value={form.message}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Please describe how we can help you..."
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full h-11 font-bold gap-2">
                    {loading ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {loading ? "Sending..." : "Send Message"}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    For urgent queries, WhatsApp us at <a href="https://wa.me/27601234567" target="_blank" rel="noopener noreferrer" className="text-[#25D366] font-bold">060 123 4567</a> for the fastest response.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
