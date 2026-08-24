"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  frequency: string;
  priority: string;
  nextDueAt: Date | string;
  notes: string | null;
  technician: {
    id: string;
    name: string;
    email: string;
    jobTitle: string | null;
  } | null;
};

interface Props {
  plan: Plan;
}

const inputClass =
  "mt-1.5 w-full rounded-md border border-[#35393c] bg-[#141718] px-3 py-2.5 text-xs text-[#dedfd9] outline-none transition placeholder:text-[#5f645f] focus:border-[#626866]";

const labelClass =
  "text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]";

function toDateInput(value: Date | string) {
  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function MaintenancePlanEditForm({ plan }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(plan.title);
  const [description, setDescription] = useState(plan.description ?? "");
  const [type, setType] = useState(plan.type);
  const [frequency, setFrequency] = useState(plan.frequency);
  const [priority, setPriority] = useState(plan.priority);
  const [nextDueAt, setNextDueAt] = useState(
    toDateInput(plan.nextDueAt),
  );
  const [notes, setNotes] = useState(plan.notes ?? "");
  const [technicianId, setTechnicianId] = useState(
    plan.technician?.id ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/maintenance-plans/${plan.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description: description || null,
            type,
            frequency,
            priority,
            nextDueAt,
            notes: notes || null,
            technicianId: technicianId || null,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error?.message ??
            payload?.message ??
            "Unable to update the maintenance plan.",
        );
      }

      router.push(`/admin/maintenance-plans/${plan.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update the maintenance plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 p-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="title">
            Title
          </label>

          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={inputClass}
            maxLength={160}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="description">
            Description
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${inputClass} min-h-28 resize-y`}
            maxLength={2000}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="type">
            Maintenance Type
          </label>

          <select
            id="type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={inputClass}
          >
            <option value="PREVENTIVE">Preventive</option>
            <option value="INSPECTION">Inspection</option>
            <option value="SERVICING">Servicing</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="frequency">
            Frequency
          </label>

          <select
            id="frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value)}
            className={inputClass}
          >
            <option value="ONCE">Once</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="SEMI_ANNUALLY">
              Semi-Annually
            </option>
            <option value="ANNUALLY">Annually</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="priority">
            Priority
          </label>

          <select
            id="priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className={inputClass}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="nextDueAt">
            Next Due Date
          </label>

          <input
            id="nextDueAt"
            type="date"
            value={nextDueAt}
            onChange={(event) => setNextDueAt(event.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="technicianId">
            Technician ID
          </label>

          <input
            id="technicianId"
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
            className={inputClass}
            placeholder="Leave blank to unassign"
          />

          <p className="mt-1.5 text-[10px] text-[#5f645f]">
            The API validates that the selected ID belongs to a technician.
          </p>

          {plan.technician && (
            <p className="mt-1 text-[10px] text-[#777c77]">
              Current technician: {plan.technician.name}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="notes">
            Notes
          </label>

          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={`${inputClass} min-h-28 resize-y`}
            maxLength={4000}
          />
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-5 rounded-md border border-red-500/25 bg-red-500/[0.05] px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <footer className="flex items-center justify-end gap-3 border-t border-[#303438] bg-[#151819] px-6 py-4">
        <button
          type="button"
          onClick={() =>
            router.push(`/admin/maintenance-plans/${plan.id}`)
          }
          disabled={saving}
          className="rounded-md border border-[#35393c] bg-[#202326] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#929792] transition hover:bg-[#272a2d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md border border-[#d8d9d4]/20 bg-[#d8d9d4] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#17191b] transition hover:bg-[#ededE9] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </footer>
    </form>
  );
}