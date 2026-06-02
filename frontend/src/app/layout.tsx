import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Login Flow Demo",
  description: "Keycloak broker authentication demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AntdRegistry>
          <div className="site-shell">
            <header className="site-header">
              <Link href="/" className="brand-link">
                Login Flow Demo
              </Link>
              <nav className="site-nav" aria-label="Primary navigation">
              <Link href="/">Login</Link>
              <Link href="/register">Register</Link>
              <Link href="/line">LINE</Link>
              <Link href="/profile">Profile</Link>
              </nav>
            </header>
            <main className="site-main">{children}</main>
          </div>
        </AntdRegistry>
      </body>
    </html>
  );
}
