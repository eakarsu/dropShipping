import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dropship Manager",
  description: "Manage Amazon, Shopify, and Etsy dropshipping with AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
