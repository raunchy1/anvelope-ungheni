import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Anvelope Ungheni – Administrare",
  description: "Sistem intern de administrare – Service Roți Anvelope Ungheni",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
