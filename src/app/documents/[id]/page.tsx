import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { documentService } from "@/lib/documents";
import { NotFoundError } from "@/lib/errors";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserOrRedirect();
  const doc = await documentService.get(user.id, (await params).id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  return (
    <DocumentEditor
      id={doc.id}
      initialTitle={doc.title}
      initialContent={doc.content}
      initialVersion={doc.version}
      access={doc.access}
      owner={doc.owner}
      initialShares={doc.shares}
    />
  );
}
