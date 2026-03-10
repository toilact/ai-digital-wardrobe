import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import Footer from "@/components/Footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="flex flex-col min-h-screen">
        <AuthProvider>
          <div className="dashboard-container flex-1">
            <div className="wrap">{children}</div>
          </div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
