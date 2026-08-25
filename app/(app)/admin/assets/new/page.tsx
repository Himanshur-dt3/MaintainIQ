import Link from "next/link";

import { requireRole } from "@/src/server/auth/guards";
import { AssetForm } from "./asset-form";

export default async function NewAssetPage() {
  await requireRole("ADMIN");

  return (
    <main className="mx-auto w-full max-w-[1000px] px-6 py-8">
      <div className="mb-6">
        <Link
          href="/admin/assets"
          className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#737873] transition hover:text-[#d1d3ce]"
        >
          ← Back to Assets
        </Link>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
          Asset Management
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#edede9]">
          Add Asset
        </h1>

        <p className="mt-2 max-w-2xl text-xs leading-5 text-[#747974]">
          Register equipment or infrastructure so maintenance activity can be
          tracked and prioritized.
        </p>
      </div>

      <AssetForm />
    </main>
  );
}