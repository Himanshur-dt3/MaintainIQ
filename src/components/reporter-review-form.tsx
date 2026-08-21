"use client";

import { useState } from "react";

type ReporterReviewFormProps = {
  ticketId: string;
  ticketTitle: string;
  location: string;
  technicianName: string;
};

export function ReporterReviewForm({
  ticketId,
  ticketTitle,
  location,
  technicianName,
}: ReporterReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (rating < 1) {
      setError("Please select a rating.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId,
          rating,
          comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to submit review.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit review.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <p className="text-sm font-bold text-emerald-400">
          Review submitted successfully.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Thank you for your feedback on {technicianName}.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submitReview}
      className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-white">
            {ticketTitle}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {location} · Technician: {technicianName}
          </p>
        </div>

        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Rate ${value} out of 5`}
              onClick={() => setRating(value)}
              className={`text-2xl transition hover:scale-110 ${
                value <= rating ? "text-amber-400" : "text-slate-700"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Share your feedback about the technician..."
        className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
      />

      {error ? (
        <p className="mt-3 text-xs font-semibold text-red-400">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
