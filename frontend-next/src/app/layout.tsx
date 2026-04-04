import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "The Haven Operations",
    template: "%s | The Haven",
  },
  description:
    "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="app-root" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
