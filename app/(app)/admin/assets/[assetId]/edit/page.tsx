import { requireRole } from "@/src/server/auth/guards";
import { getAsset } from "@/src/server/services/assets";
import { AssetEditForm } from "./asset-edit-form";

interface AssetEditPageProps {
  params: Promise<{
    assetId: string;
  }>;
}

export default async function AssetEditPage({
  params,
}: AssetEditPageProps) {
  const session = await requireRole("ADMIN");
  const { assetId } = await params;

  const asset = await getAsset(
    {
      id: session.user.id,
      role: session.user.role,
    },
    assetId,
  );

  return (
    <main className="mx-auto w-full max-w-[900px] px-6 py-8">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
          Asset Management
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#edede9]">
          Edit Asset
        </h1>

        <p className="mt-2 text-xs text-[#747974]">
          Update the configuration and operational classification for{" "}
          <span className="font-semibold text-[#bfc2bd]">
            {asset.name}
          </span>
          .
        </p>
      </div>

      <AssetEditForm
        asset={{
          id: asset.id,
          name: asset.name,
          type: asset.type,
          location: asset.location,
          criticality: asset.criticality,
          status: asset.status,
        }}
      />
    </main>
  );
}