"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
      onClick={async () => {
        await api("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
