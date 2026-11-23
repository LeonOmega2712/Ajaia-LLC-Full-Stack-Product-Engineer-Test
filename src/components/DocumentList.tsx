import Link from "next/link";
import type { DocumentListItem } from "@/lib/documents/types";
import { AccessBadge } from "./AccessBadge";

interface Props {
  title: string;
  items: DocumentListItem[];
  empty: string;
}

export function DocumentList({ title, items, empty }: Props) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title} <span className="text-gray-400">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {items.map((d) => (
            <li key={d.id}>
              <Link href={`/documents/${d.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.title}</p>
                  <p className="text-xs text-gray-500">
                    {d.access === "OWNER" ? "Owned by you" : `Owner: ${d.owner.name}`} · Updated{" "}
                    {d.updatedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <AccessBadge access={d.access} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
