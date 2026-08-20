import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "MaintainIQ",
  description: "Operational maintenance issue reporting and workflow management."
};

interface RootLayoutProps {
  children: ReactNode;
}

/**
 * Provides the document shell for all MaintainIQ application routes.
 *
 * @param children - The route content rendered within the application document.
 * @returns The root HTML and body structure.
 */
export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full font-sans antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
