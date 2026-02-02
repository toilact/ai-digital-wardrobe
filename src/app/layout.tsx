import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Digital Wardrobe",
  description: "AI-powered digital wardrobe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
