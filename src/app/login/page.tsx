import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/nextPath";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  const users = await prisma.user.findMany({ select: { email: true, name: true }, orderBy: { email: "asc" } });
  return (
    <div className="mx-auto mt-12 max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
      <p className="mb-4 text-sm text-gray-600">
        Demo auth: pick a seeded account (no password). Use two browsers or sign out and back in to test sharing.
      </p>
      <LoginForm users={users} next={next} />
    </div>
  );
}
