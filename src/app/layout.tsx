import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">

      <body className="flex flex-col min-h-dvh bg-black">

        <AuthProvider>
          <Header />
          <div className="dashboard-container flex-1 pb-10">
            <div>{children}</div>
          </div>

        </AuthProvider>
        <Footer />

      </body>

    </html>
  );
}
