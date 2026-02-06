import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-[#FFFDD0]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
