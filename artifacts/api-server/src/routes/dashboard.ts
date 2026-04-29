import { Router, type IRouter } from "express";
import { eq, and, lt, ne, sql, inArray, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db,
  tasksTable,
  projectsTable,
  projectMembersTable,
  usersTable,
} from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { serializeTask, type EnrichedTask } from "../lib/serializers";

const router: IRouter = Router();

const assigneeAlias = alias(usersTable, "d_assignee");
const creatorAlias = alias(usersTable, "d_creator");

function selectTasks() {
  return db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      description: tasksTable.description,
      status: tasksTable.status,
      priority: tasksTable.priority,
      dueDate: tasksTable.dueDate,
      projectId: tasksTable.projectId,
      assigneeId: tasksTable.assigneeId,
      createdBy: tasksTable.createdBy,
      createdAt: tasksTable.createdAt,
      projectName: projectsTable.name,
      assigneeName: assigneeAlias.name,
      createdByName: creatorAlias.name,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(assigneeAlias, eq(tasksTable.assigneeId, assigneeAlias.id))
    .leftJoin(creatorAlias, eq(tasksTable.createdBy, creatorAlias.id));
}

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const today = new Date().toISOString().slice(0, 10);

  let visibleProjectIds: number[];
  if (user.role === "admin") {
    const all = await db.select({ id: projectsTable.id }).from(projectsTable);
    visibleProjectIds = all.map((p) => p.id);
  } else {
    const rows = await db
      .select({ projectId: projectMembersTable.projectId })
      .from(projectMembersTable)
      .where(eq(projectMembersTable.userId, user.id));
    visibleProjectIds = rows.map((r) => r.projectId);
  }

  const inScope = (col: typeof tasksTable.projectId) =>
    visibleProjectIds.length > 0
      ? inArray(col, visibleProjectIds)
      : sql`false`;

  const totalProjects = visibleProjectIds.length;

  const [tasksTotalRow] =
    visibleProjectIds.length > 0
      ? await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tasksTable)
          .where(inScope(tasksTable.projectId))
      : [{ count: 0 }];
  const totalTasks = tasksTotalRow?.count ?? 0;

  const statusRows =
    visibleProjectIds.length > 0
      ? await db
          .select({
            status: tasksTable.status,
            count: sql<number>`count(*)::int`,
          })
          .from(tasksTable)
          .where(inScope(tasksTable.projectId))
          .groupBy(tasksTable.status)
      : [];
  const tasksByStatus = { todo: 0, in_progress: 0, done: 0 };
  for (const row of statusRows) {
    if (row.status === "todo") tasksByStatus.todo = row.count;
    else if (row.status === "in_progress") tasksByStatus.in_progress = row.count;
    else if (row.status === "done") tasksByStatus.done = row.count;
  }

  const overdueRows =
    visibleProjectIds.length > 0
      ? await selectTasks()
          .where(
            and(
              inScope(tasksTable.projectId),
              lt(tasksTable.dueDate, today),
              ne(tasksTable.status, "done"),
            ),
          )
          .orderBy(tasksTable.dueDate)
      : [];

  const recentRows =
    visibleProjectIds.length > 0
      ? await selectTasks()
          .where(inScope(tasksTable.projectId))
          .orderBy(desc(tasksTable.createdAt))
          .limit(8)
      : [];

  const myRows =
    visibleProjectIds.length > 0
      ? await selectTasks()
          .where(
            and(
              inScope(tasksTable.projectId),
              eq(tasksTable.assigneeId, user.id),
            ),
          )
          .orderBy(tasksTable.dueDate)
      : [];

  const enrich = (rows: typeof overdueRows) =>
    rows.map((t) =>
      serializeTask({
        ...t,
        projectName: t.projectName ?? null,
        assigneeName: t.assigneeName ?? null,
        createdByName: t.createdByName ?? null,
      } as EnrichedTask),
    );

  res.json(
    GetDashboardResponse.parse({
      totalProjects,
      totalTasks,
      tasksByStatus,
      overdueCount: overdueRows.length,
      overdueTasks: enrich(overdueRows),
      recentTasks: enrich(recentRows),
      myTasks: enrich(myRows),
    }),
  );
});

export default router;
