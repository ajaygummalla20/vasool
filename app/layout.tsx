import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://usesettlr.in"),
  title: {
    default: "Settlr — MSME Invoicing, GST & Payment Recovery OS",
    template: "%s | Settlr",
  },
  description: "Automated GST invoicing, 45-day MSMED Act statutory protection, dynamic NPCI UPI QR billing, and AI cashflow forecasting for Indian MSMEs & contractors.",
  keywords: [
    "MSME Invoicing",
    "GST Invoicing Software India",
    "MSMED Act 2006 Late Fee",
    "UPI QR Invoicing",
    "TDS Section 194J 194C",
    "Section 44ADA Presumptive Tax",
    "Freelance Invoicing India",
    "Settlr",
  ],
  authors: [{ name: "Settlr" }],
  openGraph: {
    title: "Settlr — MSME Invoicing, GST & Payment Recovery OS",
    description: "The modern financial operating system for Indian MSMEs, freelancers, and agencies.",
    url: "https://usesettlr.in",
    siteName: "Settlr",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/settlr-logo.png",
        width: 512,
        height: 512,
        alt: "Settlr MSME Financial OS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Settlr — MSME Invoicing, GST & Payment Recovery OS",
    description: "Automated GST invoicing, MSMED Act interest calculations, and instant UPI QR payments.",
    images: ["/settlr-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, minHeight: '100vh' }}>{children}</body>
    </html>
  );
}
