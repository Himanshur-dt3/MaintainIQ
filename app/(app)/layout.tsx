import type { ReactNode } from "react";

import { requirePageUser } from "@/src/server/auth/guards";
import { ApplicationShell } from "@/src/components/application-shell";

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

/**
 * Provides the authenticated route shell for all role-specific workspaces.
 *
 * @param children - Protected workspace content.
 * @returns A role-aware application shell surrounding the workspace.
 */
export default async function AuthenticatedLayout({
  children,
}: Readonly<AuthenticatedLayoutProps>) {
  const session = await requirePageUser("/");

  return (
    <ApplicationShell
      user={{
        id: session.user.id,
        name: session.user.name ?? "MaintainIQ user",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
    >
      {children}
    </ApplicationShell>
  );
}
