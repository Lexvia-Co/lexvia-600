import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "../lib/neon/database";
import { usersTable } from "../src/db/schema";

export function runUserDemo() {
  return getDatabase().transaction(async (tx) => {
    const [created] = await tx.insert(usersTable).values({
      name: "John",
      age: 30,
      email: `john-${randomUUID()}@example.com`,
    }).returning({ id: usersTable.id });
    const sampleUser = eq(usersTable.id, created.id);
    const [user] = await tx.select().from(usersTable).where(sampleUser);
    const [updated] = await tx.update(usersTable).set({ age: 31 }).where(sampleUser).returning();
    await tx.delete(usersTable).where(sampleUser);
    return { user, updated };
  });
}
