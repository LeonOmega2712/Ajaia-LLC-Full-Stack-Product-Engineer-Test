"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/apiClient";

export function LoginForm({ users, next }: { users: { email: string; name: string }[]; next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function signIn(email: string) {
    setPending(email);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email }) });
      router.push(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <button
          key={u.email}
          disabled={pending !== null}
          onClick={() => signIn(u.email)}
          className="flex w-full items-center justify-between rounded border border-gray-300 px-3 py-2 text-left hover:bg-blue-50 disabled:opacity-50"
        >
          <span className="font-medium">{u.name}</span>
          <span className="text-sm text-gray-500">{pending === u.email ? "Signing in..." : u.email}</span>
        </button>
      ))}
      {users.length === 0 && <p className="text-sm text-red-600">No users found. Run the seed script.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
