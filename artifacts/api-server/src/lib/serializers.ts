import type { UserRow, ProjectRow, TaskRow } from "@workspace/db";

export function serializeUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role === "admin" ? "admin" : "member") as "admin" | "member",
    createdAt: u.createdAt.toISOString(),
  };
}

export function serializeProjectBase(p: ProjectRow) {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    ownerId: p.ownerId ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

export type EnrichedTask = TaskRow & {
  projectName: string | null;
  assigneeName: string | null;
  createdByName: string | null;
};

export function serializeTask(t: EnrichedTask) {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    status: (t.status as "todo" | "in_progress" | "done"),
    priority: (t.priority as "low" | "medium" | "high"),
    dueDate: t.dueDate ?? null,
    projectId: t.projectId,
    projectName: t.projectName,
    assigneeId: t.assigneeId ?? null,
    assigneeName: t.assigneeName,
    createdBy: t.createdBy ?? null,
    createdByName: t.createdByName,
    createdAt: t.createdAt.toISOString(),
  };
}
