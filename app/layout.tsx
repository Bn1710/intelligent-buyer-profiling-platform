import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIRA · Prospect workspace",
  description: "Understand your prospects and prepare a more personal conversation at AIRA Residence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
