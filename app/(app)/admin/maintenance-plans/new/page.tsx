import Link from "next/link";

import prisma from "@/src/server/db/prisma";
import { requireUser } from "@/src/server/auth/guards";

import MaintenancePlanForm from "./maintenance-plan-form";

type NewMaintenancePlanPageProps = {
  searchParams: Promise<{
    assetId?: string;
  }>;
};

export default async function NewMaintenancePlanPage({
  searchParams,
}: NewMaintenancePlanPageProps) {
  const session = await requireUser();

  if (session.user.role !== "ADMIN") {
    return null;
  }

  const params = await searchParams;
  const requestedAssetId = params.assetId ?? "";

  const [assets, technicians] = await Promise.all([
    prisma.asset.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.user.findMany({
      where: {
        role: "TECHNICIAN",
      },
      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const initialAssetId = assets.some(
    (asset) => asset.id === requestedAssetId,
  )
    ? requestedAssetId
    : "";

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <div className="mb-6">
        <Link
          href="/admin/maintenance-plans"
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-400 transition hover:text-sky-300"
        >
          ← Maintenance Plans
        </Link>

        <div className="mt-4 border-b border-sky-500/20 border-l-2 border-l-sky-400/60 pb-6 pl-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-400">
            Maintenance Operations
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#ededE9]">
            Create Maintenance Plan
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#686d68]">
            Define a maintenance schedule for an active asset and optionally
            assign a technician responsible for the work.
          </p>
        </div>
      </div>

      <MaintenancePlanForm
        assets={assets.map((asset) => ({
          id: asset.id,
          label: asset.name,
          detail: `${asset.type} · ${asset.location}`,
        }))}
        technicians={technicians.map((technician) => ({
          id: technician.id,
          label: technician.name,
          detail: technician.jobTitle ?? technician.email,
        }))}
        initialAssetId={initialAssetId}
      />
    </main>
  );
}
