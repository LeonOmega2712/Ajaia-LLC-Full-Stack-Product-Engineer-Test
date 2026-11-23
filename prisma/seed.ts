import { PrismaClient } from "@prisma/client";
import { SEED_USERS } from "../src/lib/auth/seedUsers";

const prisma = new PrismaClient();

async function main() {
  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: user,
    });
  }

  const alice = await prisma.user.findUniqueOrThrow({ where: { email: SEED_USERS[0].email } });
  const bob = await prisma.user.findUniqueOrThrow({ where: { email: SEED_USERS[1].email } });

  const existing = await prisma.document.count({ where: { ownerId: alice.id } });
  if (existing === 0) {
    await prisma.document.create({
      data: {
        title: "Welcome to Ajaia Docs",
        ownerId: alice.id,
        content:
          "<h1>Welcome</h1><p>This document is owned by <strong>Alice</strong> and shared with <em>Bob</em> as an editor.</p><ul><li>Try <u>formatting</u></li><li>Rename the title above</li></ul>",
        shares: { create: { userId: bob.id, role: "EDITOR" } },
      },
    });
  }
  console.log(`Seeded ${SEED_USERS.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
