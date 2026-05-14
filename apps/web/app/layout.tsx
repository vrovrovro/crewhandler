import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const displaySans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Intervention Hub",
  description: "Field service intervention management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${displaySans.variable}`}>{children}</body>
    </html>
  );
}
