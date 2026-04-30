import type { Metadata } from "next";
import { Nunito, Pacifico } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const pacifico = Pacifico({
  subsets: ["latin"],
  variable: "--font-pacifico",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Habit Tracker",
  description: "Habit tracker cantik dengan daily, weekly, monthly, dan grafik progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${nunito.variable} ${pacifico.variable}`}>{children}</body>
    </html>
  );
}
