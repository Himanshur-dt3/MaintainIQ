'use client';

import { useState } from "react";

type Props = {
  ticketId: string;
};

export function ReanalyzeTicketButton({ ticketId }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reanalyze() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        "/api/tickets/" + ticketId + "/actions/reanalyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            "Unable to re-analyze this ticket.",
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to re-analyze this ticket.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={reanalyze}
        disabled={busy}
        className="rounded-md border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-200 transition hover:border-violet-300/50 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Analyzing..." : "Re-analyze with AI"}
      </button>

      {error ? (
        <p className="max-w-xs text-right text-[10px] text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
