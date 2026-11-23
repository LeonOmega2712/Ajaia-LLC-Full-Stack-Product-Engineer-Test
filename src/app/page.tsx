import { requireUserOrRedirect } from "@/lib/auth/session";
import { documentService } from "@/lib/documents";
import { DocumentList } from "@/components/DocumentList";
import { DashboardActions } from "@/components/DashboardActions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUserOrRedirect();
  const { owned, shared } = await documentService.list(user.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <DashboardActions />
      </div>
      <DocumentList title="My documents" items={owned} empty="You have no documents yet. Create one or import a file." />
      <DocumentList title="Shared with me" items={shared} empty="Nothing has been shared with you yet." />
    </div>
  );
}
