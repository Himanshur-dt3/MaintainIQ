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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
