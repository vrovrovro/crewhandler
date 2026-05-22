import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crew Handler",
  description: "Field service intervention management platform",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
