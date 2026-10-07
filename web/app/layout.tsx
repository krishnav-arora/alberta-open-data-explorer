import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alberta Open Data Explorer",
  description:
    "Explore and compare Alberta municipality population estimates with traceable public data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
