"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MaintenancePlanActionsProps {
  planId: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
}

const actionLabels = {
  pause: "Pause Plan",
  resume: "Resume Plan",
  complete: "Complete Plan",
  cancel: "Cancel Plan",
} as const;

export function MaintenancePlanActions({
  planId,
  status,
}: MaintenancePlanActionsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: keyof typeof actionLabels) {
    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabels[action].toLowerCase()}?`,
    );

    if (!confirmed) {
      return;
    }

    setLoadingAction(action);
    setError(null);

    try {
      const response = await fetch(
        `/api/maintenance-plans/${planId}/actions/${action}`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            `Unable to ${actionLabels[action].toLowerCase()}.`,
        );
      }

      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Something went wrong.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  if (status === "COMPLETED" || status === "CANCELLED") {
    return null;
  }

  return (
    <div className="border-t border-[#303438] bg-[#151819] px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
            Plan Actions
          </p>

          {error && (
            <p className="mt-1 text-[10px] text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {status === "ACTIVE" && (
            <>
              <button
                type="button"
                onClick={() => handleAction("complete")}
                disabled={loadingAction !== null}
                className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.08] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300 transition hover:bg-emerald-500/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "complete"
                  ? "Completing..."
                  : "Complete Plan"}
              </button>

              <button
                type="button"
                onClick={() => handleAction("pause")}
                disabled={loadingAction !== null}
                className="rounded-md border border-amber-500/25 bg-amber-500/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-300 transition hover:bg-amber-500/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "pause"
                  ? "Pausing..."
                  : "Pause Plan"}
              </button>

              <button
                type="button"
                onClick={() => handleAction("cancel")}
                disabled={loadingAction !== null}
                className="rounded-md border border-red-500/25 bg-red-500/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-red-300 transition hover:bg-red-500/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "cancel"
                  ? "Cancelling..."
                  : "Cancel Plan"}
              </button>
            </>
          )}

          {status === "PAUSED" && (
            <>
              <button
                type="button"
                onClick={() => handleAction("resume")}
                disabled={loadingAction !== null}
                className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.08] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300 transition hover:bg-emerald-500/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "resume"
                  ? "Resuming..."
                  : "Resume Plan"}
              </button>

              <button
                type="button"
                onClick={() => handleAction("cancel")}
                disabled={loadingAction !== null}
                className="rounded-md border border-red-500/25 bg-red-500/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-red-300 transition hover:bg-red-500/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "cancel"
                  ? "Cancelling..."
                  : "Cancel Plan"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}