export default function TermsConditions() {
  return (
    <div className="pb-16">
      <div className="bg-secondary text-white py-12 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black italic tracking-tight mb-3">Terms &amp; <span className="text-primary">Conditions</span></h1>
          <p className="text-gray-300">Last updated: June 2025</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-12">
        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-bold mb-3">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using MzansiDealz.co.za ("the Website"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our website or purchase from us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Products and Pricing</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>All prices are displayed in South African Rand (ZAR) and include VAT.</li>
              <li>We reserve the right to change prices at any time without notice.</li>
              <li>Product images are for illustration purposes. Actual products may vary slightly.</li>
              <li>We make every effort to display accurate stock availability, but cannot guarantee stock levels in real-time.</li>
              <li>In the event of a pricing error, we reserve the right to cancel an order and issue a full refund.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. Orders and Payment</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Orders are confirmed only once payment has been successfully processed.</li>
              <li>We accept payment via PayFast (Instant EFT, Capitec Pay, Visa, Mastercard).</li>
              <li>Payment must be completed in full before any order is processed and dispatched.</li>
              <li>We reserve the right to refuse or cancel any order at our discretion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Delivery</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Delivery times are estimates and not guaranteed.</li>
              <li>We are not responsible for delays caused by courier services or circumstances beyond our control.</li>
              <li>Risk of loss passes to you upon delivery to the specified address.</li>
              <li>Please ensure your delivery address is correct at checkout. Re-delivery charges may apply for incorrect addresses.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Returns and Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              Please refer to our <a href="/returns-refunds" className="text-primary hover:underline">Returns &amp; Refunds Policy</a> for full details on how to return items and request refunds.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on this website, including text, images, logos, and graphics, is the property of MzansiDealz and is protected by applicable intellectual property laws. You may not reproduce, distribute, or use any content without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              MzansiDealz shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our website or products. Our maximum liability shall not exceed the amount paid for the specific product in dispute.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms and Conditions are governed by the laws of the Republic of South Africa. Any disputes shall be subject to the jurisdiction of the South African courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For any questions regarding these terms, contact us at{" "}
              <a href="mailto:sales@mzansidealz.com" className="text-primary hover:underline">sales@mzansidealz.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
