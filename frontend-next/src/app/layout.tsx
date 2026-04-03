import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const fontSans = Google_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fontSerif = Google_Sans({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
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
    <html lang="en" className={`${fontSans.variable} ${fontSerif.variable}`}>
      <body className="app-root" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
