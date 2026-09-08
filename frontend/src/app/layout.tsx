import type { Metadata } from "next";

import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";



export const metadata: Metadata = {
  title: "Parul University Ticketing System",
  description: "AI-Powered Parul University Helpdesk & Support Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
