import { db, usersTable, projectsTable, projectMembersTable, tasksTable } from "@workspace/db";
import { hashPassword } from "./lib/auth";
import { eq } from "drizzle-orm";

async function main(): Promise<void> {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@demo.com"));
  if (existing) {
    console.log("Seed: data already exists, skipping");
    process.exit(0);
  }

  const adminHash = await hashPassword("admin123");
  const memberHash = await hashPassword("member123");

  const [admin] = await db.insert(usersTable).values({
    name: "Admin User", email: "admin@demo.com", passwordHash: adminHash, role: "admin",
  }).returning();
  const [alice] = await db.insert(usersTable).values({
    name: "Alice Chen", email: "alice@demo.com", passwordHash: memberHash, role: "member",
  }).returning();
  const [bob] = await db.insert(usersTable).values({
    name: "Bob Diaz", email: "bob@demo.com", passwordHash: memberHash, role: "member",
  }).returning();

  const [website] = await db.insert(projectsTable).values({
    name: "Website Redesign",
    description: "Refresh the marketing site with the new brand system, hero, pricing and case studies.",
    ownerId: admin.id,
  }).returning();
  const [mobile] = await db.insert(projectsTable).values({
    name: "Mobile App v2",
    description: "Ship the redesigned navigation, push notifications, and offline mode.",
    ownerId: admin.id,
  }).returning();

  await db.insert(projectMembersTable).values([
    { projectId: website.id, userId: admin.id },
    { projectId: website.id, userId: alice.id },
    { projectId: website.id, userId: bob.id },
    { projectId: mobile.id, userId: admin.id },
    { projectId: mobile.id, userId: alice.id },
  ]);

  const today = new Date();
  const iso = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  await db.insert(tasksTable).values([
    { title: "Audit existing site copy", description: "Review every page for tone and clarity.", status: "done", priority: "medium", dueDate: iso(-10), projectId: website.id, assigneeId: alice.id, createdBy: admin.id },
    { title: "Design new hero section", description: "Three concepts with motion notes.", status: "in_progress", priority: "high", dueDate: iso(-2), projectId: website.id, assigneeId: alice.id, createdBy: admin.id },
    { title: "Write pricing page copy", description: "Clear plan comparison and FAQ.", status: "todo", priority: "medium", dueDate: iso(5), projectId: website.id, assigneeId: bob.id, createdBy: admin.id },
    { title: "Implement marketing site CMS", description: "Headless integration for blog and case studies.", status: "todo", priority: "low", dueDate: iso(14), projectId: website.id, assigneeId: bob.id, createdBy: admin.id },
    { title: "Spec offline mode storage", description: "Plan local cache and sync conflict resolution.", status: "in_progress", priority: "high", dueDate: iso(-1), projectId: mobile.id, assigneeId: alice.id, createdBy: admin.id },
    { title: "Push notification permissions UX", description: "Design the priming screen and settings page.", status: "todo", priority: "medium", dueDate: iso(7), projectId: mobile.id, assigneeId: alice.id, createdBy: admin.id },
    { title: "Migrate icon set to lucide", description: "Replace legacy icons across all screens.", status: "done", priority: "low", dueDate: iso(-7), projectId: mobile.id, assigneeId: admin.id, createdBy: admin.id },
    { title: "Investigate crash on Android 12", description: "Repro from production logs.", status: "todo", priority: "high", dueDate: iso(3), projectId: mobile.id, assigneeId: admin.id, createdBy: admin.id },
  ]);

  console.log("Seed: created admin, 2 members, 2 projects, 8 tasks");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
