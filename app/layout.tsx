import type { Metadata } from "next";
import { AppStoreProvider } from "@/context/AppStore";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPICA ARENA OS",
  description: "A premium SPICA credits dashboard for cross-zone gaming cafe management.",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppStoreProvider>{children}</AppStoreProvider>
      </body>
    </html>
  );
}
