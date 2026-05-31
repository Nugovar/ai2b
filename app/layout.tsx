import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ChatProvider } from "@/components/ChatProvider";

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
  title: "AI2Business | AI შენი ბიზნესის სამსახურში",
  description:
    "AI2Business: ქართული AI პლატფორმა მცირე და საშუალო ბიზნესისთვის. აღწერე საჭიროება, მიიღე გადაწყვეტა.",
  icons: {
    icon: [{ url: "/logo2.png", type: "image/png" }],
    shortcut: "/logo2.png",
    apple: "/logo2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ChatProvider>{children}</ChatProvider>
      </body>
    </html>
  );
}
