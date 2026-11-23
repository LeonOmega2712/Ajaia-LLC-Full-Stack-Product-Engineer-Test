import type { AccessLevel } from "@/lib/access/policy";

const STYLES: Record<AccessLevel, { label: string; className: string }> = {
  OWNER: { label: "Owner", className: "bg-blue-100 text-blue-800" },
  EDITOR: { label: "Can edit", className: "bg-green-100 text-green-800" },
  VIEWER: { label: "View only", className: "bg-gray-100 text-gray-700" },
  NONE: { label: "No access", className: "bg-red-100 text-red-800" },
};

export function AccessBadge({ access }: { access: AccessLevel }) {
  const { label, className } = STYLES[access];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}
