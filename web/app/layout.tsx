import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "KYB Platform",
  description: "Know Your Business para agencias aduanales mexicanas",
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background text-foreground flex flex-col`}
      >
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-14 items-center px-4 max-w-6xl">
            <div className="mr-4 flex">
              <a className="mr-6 flex items-center space-x-2" href="/">
                <div className="size-6 rounded-md bg-primary flex items-center justify-center">
                  <span className="font-bold text-primary-foreground text-xs">K</span>
                </div>
                <span className="font-bold sm:inline-block text-sm tracking-tight">KYB Platform</span>
              </a>
            </div>
            <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
              <div className="w-full flex-1 md:w-auto md:flex-none">
                {/* Search or user profile could go here */}
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1">
          {children}
        </div>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
