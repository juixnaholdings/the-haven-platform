import type { Metadata } from "next";
import { Merriweather, Source_Sans_3 } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const fontSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fontSerif = Merriweather({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "The Haven | Next Migration",
    template: "%s | The Haven",
  },
  description:
    "Parallel Next.js App Router migration scaffold for The Haven. Current production frontend remains the Vite app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontSerif.variable}`}>
      <body className="app-root">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
