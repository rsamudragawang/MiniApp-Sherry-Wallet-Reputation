// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./provider"; // Import the providers

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wallet Reputation",
  description: "A decentralized Wallet Reputation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <Providers>{children}</Providers> {/* Wrap with Providers */}
      </body>
    </html>
  );
}
