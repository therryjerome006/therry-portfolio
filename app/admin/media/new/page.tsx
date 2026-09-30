import { MediaEditor } from "@/components/admin/MediaEditor";
import { requireAdmin } from "@/lib/auth/session";

export default async function NewMediaPage() {
  await requireAdmin();
  return (
    <div>
      <div className="border-t-[8px] border-[#1d6fe8] bg-white px-5 py-7 sm:px-7">
        <p className="kicker">Media</p>
        <h1 className="display mt-3 text-4xl text-ink">Nouvelle publication</h1>
      </div>
      <div className="mt-6">
        <MediaEditor />
      </div>
    </div>
  );
}
