import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <div className="dashboard-container">
            <div className="wrap">{children}</div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
