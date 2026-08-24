"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Option = {
  id: string;
  label: string;
  detail?: string;
};

type MaintenancePlanFormProps = {
  assets: Option[];
  technicians: Option[];
};

const frequencies = [
  ["ONCE", "One time"],
  ["WEEKLY", "Weekly"],
  ["MONTHLY", "Monthly"],
  ["QUARTERLY", "Quarterly"],
  ["SEMI_ANNUALLY", "Every 6 months"],
  ["ANNUALLY", "Annually"],
] as const;

const types = [
  ["PREVENTIVE", "Preventive"],
  ["INSPECTION", "Inspection"],
  ["SERVICING", "Servicing"],
] as const;

const priorities = [
  ["LOW", "Low"],
  ["MEDIUM", "Medium"],
  ["HIGH", "High"],
  ["CRITICAL", "Critical"],
] as const;

export default function MaintenancePlanForm({
  assets,
  technicians,
}: MaintenancePlanFormProps) {
  const router = useRouter();

  const [assetId, setAssetId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("PREVENTIVE");
  const [frequency, setFrequency] = useState("ONCE");
  const [priority, setPriority] = useState("MEDIUM");
  const [nextDueAt, setNextDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!assetId) {
      setError("Select an asset.");
      return;
    }

    if (!title.trim()) {
      setError("Enter a maintenance plan title.");
      return;
    }

    if (!nextDueAt) {
      setError("Select the next due date and time.");
      return;
    }

    const dueDate = new Date(nextDueAt);

    if (Number.isNaN(dueDate.getTime())) {
      setError("Enter a valid due date.");
      return;
    }

    if (dueDate.getTime() < Date.now()) {
      setError("Next due date cannot be in the past.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/maintenance-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetId,
          technicianId: technicianId || null,
          title: title.trim(),
          description: description.trim() || null,
          type,
          frequency,
          priority,
          nextDueAt: dueDate.toISOString(),
          notes: notes.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error?.message ||
            payload?.message ||
            "Unable to create the maintenance plan.",
        );
      }

      router.push("/admin/maintenance-plans");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create the maintenance plan.",
      );
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-[#35393c] bg-[#141718] px-3 py-2.5 text-sm text-[#e5e6e1] outline-none transition placeholder:text-[#555a56] focus:border-[#666c68]";

  const labelClass =
    "text-[10px] font-bold uppercase tracking-[0.14em] text-[#777c77]";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="border-b border-[#2d3033] pb-4">
          <p className={labelClass}>Plan Details</p>
          <h2 className="mt-1 text-base font-bold text-[#ededE9]">
            Maintenance definition
          </h2>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className={labelClass}>Asset *</span>
            <select
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select an active asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                  {asset.detail ? ` — ${asset.detail}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2">
            <span className={labelClass}>Technician</span>
            <select
              value={technicianId}
              onChange={(event) => setTechnicianId(event.target.value)}
              className={inputClass}
            >
              <option value="">Unassigned</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.label}
                  {technician.detail ? ` — ${technician.detail}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2">
            <span className={labelClass}>Title *</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              placeholder="e.g. Quarterly HVAC inspection"
              maxLength={160}
              required
            />
          </label>

          <label className="md:col-span-2">
            <span className={labelClass}>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`${inputClass} min-h-24 resize-y`}
              placeholder="Describe the planned maintenance activity."
              maxLength={2000}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="border-b border-[#2d3033] pb-4">
          <p className={labelClass}>Schedule</p>
          <h2 className="mt-1 text-base font-bold text-[#ededE9]">
            Maintenance cadence
          </h2>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <label>
            <span className={labelClass}>Type *</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={inputClass}
            >
              {types.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>Frequency *</span>
            <select
              value={frequency}
              onChange={(event) => setFrequency(event.target.value)}
              className={inputClass}
            >
              {frequencies.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>Priority *</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className={inputClass}
            >
              {priorities.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-3">
            <span className={labelClass}>Next Due *</span>
            <input
              type="datetime-local"
              value={nextDueAt}
              onChange={(event) => setNextDueAt(event.target.value)}
              className={inputClass}
              required
            />
            <span className="mt-1 block text-[10px] text-[#5f645f]">
              The first scheduled occurrence. Recurring plans advance
              automatically after completion.
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="border-b border-[#2d3033] pb-4">
          <p className={labelClass}>Additional Information</p>
          <h2 className="mt-1 text-base font-bold text-[#ededE9]">
            Operational notes
          </h2>
        </div>

        <label className="mt-5 block">
          <span className={labelClass}>Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={`${inputClass} min-h-28 resize-y`}
            placeholder="Add internal maintenance notes or instructions."
            maxLength={4000}
          />
        </label>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/admin/maintenance-plans")}
          disabled={submitting}
          className="rounded-md border border-[#383c3f] bg-[#202326] px-5 py-2.5 text-sm font-semibold text-[#b7bbb6] transition hover:border-[#50565a] hover:text-[#e0e1dc] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[#e8e8e3] px-5 py-2.5 text-sm font-bold text-[#17191b] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Maintenance Plan"}
        </button>
      </div>
    </form>
  );
}