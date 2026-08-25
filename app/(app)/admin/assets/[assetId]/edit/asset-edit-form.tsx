"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AssetCriticality,
  AssetStatus,
} from "@prisma/client";

interface AssetEditFormProps {
  asset: {
    id: string;
    name: string;
    type: string;
    location: string;
    criticality: AssetCriticality;
    status: AssetStatus;
  };
}

const criticalityOptions: AssetCriticality[] = [
  AssetCriticality.LOW,
  AssetCriticality.MEDIUM,
  AssetCriticality.HIGH,
  AssetCriticality.CRITICAL,
];

const statusOptions: AssetStatus[] = [
  AssetStatus.ACTIVE,
  AssetStatus.INACTIVE,
  AssetStatus.RETIRED,
];

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AssetEditForm({ asset }: AssetEditFormProps) {
  const router = useRouter();

  const [name, setName] = useState(asset.name);
  const [type, setType] = useState(asset.type);
  const [location, setLocation] = useState(asset.location);
  const [criticality, setCriticality] = useState(asset.criticality);
  const [status, setStatus] = useState(asset.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
          location,
          criticality,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to update asset.");
        return;
      }

      router.push(`/admin/assets/${asset.id}`);
      router.refresh();
    } catch {
      setError("Unable to update the asset. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[#303438] bg-[#181b1d]"
    >
      <div className="grid gap-6 p-6">
        <div>
          <label
            htmlFor="asset-name"
            className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#737873]"
          >
            Asset Name
          </label>

          <input
            id="asset-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={160}
            className="w-full rounded-md border border-[#35393c] bg-[#202326] px-3 py-2.5 text-sm text-[#e8e8e3] outline-none transition placeholder:text-[#686d68] focus:border-[#666b67]"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="asset-type"
              className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#737873]"
            >
              Asset Type
            </label>

            <input
              id="asset-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              required
              maxLength={120}
              className="w-full rounded-md border border-[#35393c] bg-[#202326] px-3 py-2.5 text-sm text-[#e8e8e3] outline-none transition focus:border-[#666b67]"
            />
          </div>

          <div>
            <label
              htmlFor="asset-location"
              className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#737873]"
            >
              Location
            </label>

            <input
              id="asset-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              required
              maxLength={160}
              className="w-full rounded-md border border-[#35393c] bg-[#202326] px-3 py-2.5 text-sm text-[#e8e8e3] outline-none transition focus:border-[#666b67]"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="asset-criticality"
              className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#737873]"
            >
              Criticality
            </label>

            <select
              id="asset-criticality"
              value={criticality}
              onChange={(event) =>
                setCriticality(event.target.value as AssetCriticality)
              }
              className="w-full rounded-md border border-[#35393c] bg-[#202326] px-3 py-2.5 text-sm text-[#e8e8e3] outline-none focus:border-[#666b67]"
            >
              {criticalityOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnum(option)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="asset-status"
              className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#737873]"
            >
              Status
            </label>

            <select
              id="asset-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as AssetStatus)
              }
              className="w-full rounded-md border border-[#35393c] bg-[#202326] px-3 py-2.5 text-sm text-[#e8e8e3] outline-none focus:border-[#666b67]"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnum(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/25 bg-red-500/[0.05] px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-[#303438] px-6 py-4">
        <button
          type="button"
          onClick={() => router.push(`/admin/assets/${asset.id}`)}
          disabled={saving}
          className="rounded-md border border-[#383c3f] px-4 py-2.5 text-xs font-semibold text-[#aeb3ae] transition hover:bg-[#232628] hover:text-[#eeeeea] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-[#e8e8e3] px-4 py-2.5 text-xs font-bold text-[#17191b] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}