import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Settlr — MSME Invoicing, GST & Payment Recovery OS",
  description: "Automated GST invoicing, 45-day MSMED Act statutory protection, dynamic NPCI UPI QR billing, and payment recovery for Indian MSMEs & contractors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="te">
      <body style={{ margin: 0, padding: 0, minHeight: '100vh' }}>{children}</body>
    </html>
  );
}
