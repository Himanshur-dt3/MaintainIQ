"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AssetCriticality, AssetStatus } from "@prisma/client";

const criticalityOptions = [
  {
    value: AssetCriticality.LOW,
    label: "Low",
    description: "Limited operational impact.",
  },
  {
    value: AssetCriticality.MEDIUM,
    label: "Medium",
    description: "Normal operational importance.",
  },
  {
    value: AssetCriticality.HIGH,
    label: "High",
    description: "Failure may significantly affect operations.",
  },
  {
    value: AssetCriticality.CRITICAL,
    label: "Critical",
    description: "Failure may cause major operational disruption.",
  },
];

interface FormState {
  name: string;
  type: string;
  location: string;
  criticality: AssetCriticality;
  status: AssetStatus;
}

export function AssetForm() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    type: "",
    location: "",
    criticality: AssetCriticality.MEDIUM,
    status: AssetStatus.ACTIVE,
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(
          payload?.error ??
            "Unable to create the asset. Please check the entered information.",
        );
        return;
      }

      router.push(`/admin/assets/${payload.asset.id}`);
      router.refresh();
    } catch {
      setError("Unable to create the asset. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-xs text-red-300"
        >
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#303438] bg-[#181b1d]">
        <div className="border-b border-[#2d3033] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
            Asset Information
          </p>

          <h2 className="mt-1 text-base font-bold text-[#edede9]">
            Basic Details
          </h2>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#858a85]">
              Asset Name
            </span>

            <input
              required
              maxLength={160}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="e.g. Lobby Air Conditioner"
              className="h-10 w-full rounded-md border border-[#383c3f] bg-[#202326] px-3 text-xs text-[#e8e8e3] outline-none placeholder:text-[#5f6460] focus:border-[#666b67]"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#858a85]">
              Asset Type
            </span>

            <input
              required
              maxLength={120}
              value={form.type}
              onChange={(event) => updateField("type", event.target.value)}
              placeholder="e.g. HVAC Unit"
              className="h-10 w-full rounded-md border border-[#383c3f] bg-[#202326] px-3 text-xs text-[#e8e8e3] outline-none placeholder:text-[#5f6460] focus:border-[#666b67]"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#858a85]">
              Location
            </span>

            <input
              required
              maxLength={160}
              value={form.location}
              onChange={(event) =>
                updateField("location", event.target.value)
              }
              placeholder="e.g. Main Lobby"
              className="h-10 w-full rounded-md border border-[#383c3f] bg-[#202326] px-3 text-xs text-[#e8e8e3] outline-none placeholder:text-[#5f6460] focus:border-[#666b67]"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-[#303438] bg-[#181b1d]">
        <div className="border-b border-[#2d3033] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
            Operational Classification
          </p>

          <h2 className="mt-1 text-base font-bold text-[#edede9]">
            Criticality
          </h2>

          <p className="mt-1 text-[11px] leading-5 text-[#686d68]">
            Criticality influences maintenance intelligence and prioritization.
          </p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {criticalityOptions.map((option) => {
            const selected = form.criticality === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateField("criticality", option.value)}
                className={`rounded-md border p-4 text-left transition ${
                  selected
                    ? "border-[#777c77] bg-[#25282a]"
                    : "border-[#303438] bg-[#1d2022] hover:border-[#4b5053]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-[#e1e2dd]">
                    {option.label}
                  </span>

                  <span
                    className={`h-2 w-2 rounded-full ${
                      selected ? "bg-[#e8e8e3]" : "bg-[#4d5250]"
                    }`}
                  />
                </div>

                <p className="mt-1 text-[10px] leading-4 text-[#777c77]">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-[#303438] bg-[#181b1d]">
        <div className="border-b border-[#2d3033] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
            Lifecycle
          </p>

          <h2 className="mt-1 text-base font-bold text-[#edede9]">
            Asset Status
          </h2>
        </div>

        <div className="p-5">
          <select
            value={form.status}
            onChange={(event) =>
              updateField("status", event.target.value as AssetStatus)
            }
            className="h-10 w-full rounded-md border border-[#383c3f] bg-[#202326] px-3 text-xs text-[#e8e8e3] outline-none focus:border-[#666b67] md:max-w-md"
          >
            <option value={AssetStatus.ACTIVE}>Active</option>
            <option value={AssetStatus.INACTIVE}>Inactive</option>
            <option value={AssetStatus.RETIRED}>Retired</option>
          </select>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/admin/assets")}
          disabled={submitting}
          className="rounded-md border border-[#383c3f] bg-[#202326] px-4 py-2.5 text-xs font-semibold text-[#aeb3ae] transition hover:bg-[#282b2d] hover:text-[#eeeeea] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[#e8e8e3] px-5 py-2.5 text-xs font-bold text-[#17191b] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Asset"}
        </button>
      </div>
    </form>
  );
}