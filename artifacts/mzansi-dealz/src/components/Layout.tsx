import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppButton } from "./WhatsAppButton";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground font-sans">
      <Header />
      <main className="flex-1 flex flex-col w-full">
        {children}
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
