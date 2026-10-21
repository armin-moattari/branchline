import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const metadata: Metadata = {
  title: "Branchline",
  description: "Save the transitions you trust. Explore every set they add up to.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${bricolage.variable}`}>
      {/* Browser extensions often add attributes to <body>; don't report those as hydration errors. */}
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
