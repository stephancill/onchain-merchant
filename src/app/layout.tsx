import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onchain Merchant",
  description: "An API for selling products onchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
