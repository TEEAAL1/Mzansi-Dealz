export default function PrivacyPolicy() {
  return (
    <div className="pb-16">
      <div className="bg-secondary text-white py-12 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black italic tracking-tight mb-3">Privacy <span className="text-primary">Policy</span></h1>
          <p className="text-gray-300">Last updated: June 2025</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-12 prose prose-sm max-w-none">
        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-bold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              MzansiDealz ("we", "us", or "our") is committed to protecting your personal information in accordance with the Protection of Personal Information Act (POPIA) of South Africa. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and make purchases from us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Personal Identification Information:</strong> Name, email address, phone number, and delivery address when you place an order.</li>
              <li><strong className="text-foreground">Payment Information:</strong> Payment is processed by PayFast. We do not store your card details on our servers.</li>
              <li><strong className="text-foreground">Order Information:</strong> Products purchased, order amounts, and order history.</li>
              <li><strong className="text-foreground">Usage Data:</strong> Pages visited, time spent on site, browser type, and device information collected via cookies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>To process and fulfil your orders</li>
              <li>To send order confirmations, tracking updates, and delivery notifications</li>
              <li>To respond to customer service enquiries</li>
              <li>To improve our website and product offerings</li>
              <li>To send promotional communications (only if you have opted in)</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Sharing Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal information to third parties. We may share your information with:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground mt-3">
              <li><strong className="text-foreground">Payment processors</strong> (PayFast) to complete transactions</li>
              <li><strong className="text-foreground">Delivery partners</strong> to fulfil and track your orders</li>
              <li><strong className="text-foreground">Legal authorities</strong> when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies to improve your browsing experience, remember your cart items, and analyse website traffic. You can disable cookies in your browser settings, but some features of the site may not function properly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. All data transmitted between you and our website is encrypted using SSL technology.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Your Rights (POPIA)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Under POPIA, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your data (subject to legal requirements)</li>
              <li>Opt out of marketing communications at any time</li>
              <li>Lodge a complaint with the Information Regulator of South Africa</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For any privacy-related queries or to exercise your rights, please contact us at:{" "}
              <a href="mailto:sales@mzansidealz.com" className="text-primary hover:underline">sales@mzansidealz.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
