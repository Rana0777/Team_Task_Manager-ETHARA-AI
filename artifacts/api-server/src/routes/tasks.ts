import { Router, type IRouter } from "express";
import { eq, and, lt, sql, inArray, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db,
  tasksTable,
  projectsTable,
  projectMembersTable,
  usersTable,
} from "@workspace/db";
import {
  CreateTaskBody,
  UpdateTaskBody,
  GetTaskParams,
  ListTasksQueryParams,
  CreateTaskResponse,
  GetTaskResponse,
  UpdateTaskResponse,
  ListTasksResponse,
  DeleteTaskResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { serializeTask, type EnrichedTask } from "../lib/serializers";

const router: IRouter = Router();

router.use("/tasks", requireAuth);

const assigneeAlias = alias(usersTable, "assignee_user");
const creatorAlias = alias(usersTable, "creator_user");

function buildTaskSelect() {
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

router.get("/tasks", async (req, res): Promise<void> => {
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.user!;

  let visibleProjectIds: number[] | null = null;
  if (user.role !== "admin") {
    const rows = await db
      .select({ projectId: projectMembersTable.projectId })
      .from(projectMembersTable)
      .where(eq(projectMembersTable.userId, user.id));
    visibleProjectIds = rows.map((r) => r.projectId);
    if (visibleProjectIds.length === 0) {
      res.json(ListTasksResponse.parse([]));
      return;
    }
  }

  const conds = [];
  if (visibleProjectIds) conds.push(inArray(tasksTable.projectId, visibleProjectIds));
  if (parsed.data.projectId !== undefined)
    conds.push(eq(tasksTable.projectId, parsed.data.projectId));
  if (parsed.data.assigneeId !== undefined)
    conds.push(eq(tasksTable.assigneeId, parsed.data.assigneeId));
  if (parsed.data.status !== undefined)
    conds.push(eq(tasksTable.status, parsed.data.status));
  if (parsed.data.overdue === true) {
    const today = new Date().toISOString().slice(0, 10);
    conds.push(lt(tasksTable.dueDate, today));
    conds.push(ne(tasksTable.status, "done"));
  }

  const rows = await (conds.length > 0
    ? buildTaskSelect().where(and(...conds))
    : buildTaskSelect()
  ).orderBy(tasksTable.createdAt);

  const tasks = rows.map((t) =>
    serializeTask({
      ...t,
      projectName: t.projectName ?? null,
      assigneeName: t.assigneeName ?? null,
      createdByName: t.createdByName ?? null,
    } as EnrichedTask),
  );
  res.json(ListTasksResponse.parse(tasks));
});

router.post(
  "/tasks",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const parsed = CreateTaskBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, parsed.data.projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (parsed.data.assigneeId != null) {
      const [m] = await db
        .select()
        .from(projectMembersTable)
        .where(
          and(
            eq(projectMembersTable.projectId, parsed.data.projectId),
            eq(projectMembersTable.userId, parsed.data.assigneeId),
          ),
        );
      if (!m) {
        res.status(400).json({ error: "Assignee must be a project member" });
        return;
      }
    }
    const [created] = await db
      .insert(tasksTable)
      .values({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: "todo",
        priority: parsed.data.priority ?? "medium",
        dueDate: parsed.data.dueDate ?? null,
        projectId: parsed.data.projectId,
        assigneeId: parsed.data.assigneeId ?? null,
        createdBy: user.id,
      })
      .returning();

    const [enriched] = await buildTaskSelect().where(eq(tasksTable.id, created.id));
    res.json(
      CreateTaskResponse.parse(
        serializeTask({
          ...enriched,
          projectName: enriched.projectName ?? null,
          assigneeName: enriched.assigneeName ?? null,
          createdByName: enriched.createdByName ?? null,
        } as EnrichedTask),
      ),
    );
  },
);

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await buildTaskSelect().where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const user = req.user!;
  if (user.role !== "admin") {
    const [m] = await db
      .select()
      .from(projectMembersTable)
      .where(
        and(
          eq(projectMembersTable.projectId, task.projectId),
          eq(projectMembersTable.userId, user.id),
        ),
      );
    if (!m) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  res.json(
    GetTaskResponse.parse(
      serializeTask({
        ...task,
        projectName: task.projectName ?? null,
        assigneeName: task.assigneeName ?? null,
        createdByName: task.createdByName ?? null,
      } as EnrichedTask),
    ),
  );
});

router.put("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const user = req.user!;
  const updates: Record<string, unknown> = {};
  if (user.role === "admin") {
    if (parsed.data.title !== undefined) updates["title"] = parsed.data.title;
    if (parsed.data.description !== undefined)
      updates["description"] = parsed.data.description ?? null;
    if (parsed.data.status !== undefined) updates["status"] = parsed.data.status;
    if (parsed.data.priority !== undefined) updates["priority"] = parsed.data.priority;
    if (parsed.data.dueDate !== undefined) updates["dueDate"] = parsed.data.dueDate ?? null;
    if (parsed.data.assigneeId !== undefined) {
      if (parsed.data.assigneeId !== null) {
        const [m] = await db
          .select()
          .from(projectMembersTable)
          .where(
            and(
              eq(projectMembersTable.projectId, existing.projectId),
              eq(projectMembersTable.userId, parsed.data.assigneeId),
            ),
          );
        if (!m) {
          res.status(400).json({ error: "Assignee must be a project member" });
          return;
        }
      }
      updates["assigneeId"] = parsed.data.assigneeId ?? null;
    }
  } else {
    if (existing.assigneeId !== user.id) {
      res.status(403).json({ error: "Members can only update their own assigned tasks" });
      return;
    }
    const onlyStatus =
      parsed.data.status !== undefined &&
      parsed.data.title === undefined &&
      parsed.data.description === undefined &&
      parsed.data.priority === undefined &&
      parsed.data.dueDate === undefined &&
      parsed.data.assigneeId === undefined;
    if (!onlyStatus) {
      res.status(403).json({ error: "Members can only update status" });
      return;
    }
    updates["status"] = parsed.data.status;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  await db.update(tasksTable).set(updates).where(eq(tasksTable.id, params.data.id));
  const [enriched] = await buildTaskSelect().where(eq(tasksTable.id, params.data.id));
  res.json(
    UpdateTaskResponse.parse(
      serializeTask({
        ...enriched,
        projectName: enriched.projectName ?? null,
        assigneeName: enriched.assigneeName ?? null,
        createdByName: enriched.createdByName ?? null,
      } as EnrichedTask),
    ),
  );
});

router.delete(
  "/tasks/:id",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = GetTaskParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [deleted] = await db
      .delete(tasksTable)
      .where(eq(tasksTable.id, params.data.id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(DeleteTaskResponse.parse({ success: true }));
  },
);

// avoid sql import warning
void sql;

export default router;
