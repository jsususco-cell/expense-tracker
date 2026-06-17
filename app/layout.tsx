import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Budget",
  description: "A simple personal budgeting app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
