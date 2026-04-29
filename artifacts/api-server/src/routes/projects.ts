import { Router, type IRouter } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  db,
  projectsTable,
  projectMembersTable,
  tasksTable,
  usersTable,
} from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  AddProjectMemberBody,
  RemoveProjectMemberParams,
  CreateProjectResponse,
  GetProjectResponse,
  UpdateProjectResponse,
  ListProjectsResponse,
  DeleteProjectResponse,
  AddProjectMemberResponse,
  RemoveProjectMemberResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { serializeUser, serializeTask, type EnrichedTask } from "../lib/serializers";

const router: IRouter = Router();

router.use("/projects", requireAuth);

async function isProjectMember(projectId: number, userId: number): Promise<boolean> {
  const [m] = await db
    .select()
    .from(projectMembersTable)
    .where(
      and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, userId),
      ),
    );
  return !!m;
}

router.get("/projects", async (req, res): Promise<void> => {
  const user = req.user!;
  const projects =
    user.role === "admin"
      ? await db.select().from(projectsTable).orderBy(projectsTable.createdAt)
      : await db
          .select({
            id: projectsTable.id,
            name: projectsTable.name,
            description: projectsTable.description,
            ownerId: projectsTable.ownerId,
            createdAt: projectsTable.createdAt,
          })
          .from(projectsTable)
          .innerJoin(
            projectMembersTable,
            eq(projectMembersTable.projectId, projectsTable.id),
          )
          .where(eq(projectMembersTable.userId, user.id))
          .orderBy(projectsTable.createdAt);

  const ids = projects.map((p) => p.id);
  const memberCounts = ids.length
    ? await db
        .select({
          projectId: projectMembersTable.projectId,
          count: sql<number>`count(*)::int`,
        })
        .from(projectMembersTable)
        .where(inArray(projectMembersTable.projectId, ids))
        .groupBy(projectMembersTable.projectId)
    : [];
  const taskCounts = ids.length
    ? await db
        .select({
          projectId: tasksTable.projectId,
          count: sql<number>`count(*)::int`,
        })
        .from(tasksTable)
        .where(inArray(tasksTable.projectId, ids))
        .groupBy(tasksTable.projectId)
    : [];
  const owners = ids.length
    ? await db
        .select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(
          inArray(
            usersTable.id,
            projects
              .map((p) => p.ownerId)
              .filter((v): v is number => v !== null),
          ),
        )
    : [];
  const memberMap = new Map(memberCounts.map((m) => [m.projectId, m.count]));
  const taskMap = new Map(taskCounts.map((t) => [t.projectId, t.count]));
  const ownerMap = new Map(owners.map((o) => [o.id, o.name]));

  const result = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    ownerId: p.ownerId ?? null,
    ownerName: p.ownerId ? ownerMap.get(p.ownerId) ?? null : null,
    createdAt: p.createdAt.toISOString(),
    memberCount: memberMap.get(p.id) ?? 0,
    taskCount: taskMap.get(p.id) ?? 0,
  }));

  res.json(ListProjectsResponse.parse(result));
});

router.post(
  "/projects",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const parsed = CreateProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const [created] = await db
      .insert(projectsTable)
      .values({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        ownerId: user.id,
      })
      .returning();

    await db
      .insert(projectMembersTable)
      .values({ projectId: created.id, userId: user.id })
      .onConflictDoNothing();

    res.json(
      CreateProjectResponse.parse({
        id: created.id,
        name: created.name,
        description: created.description ?? null,
        ownerId: created.ownerId ?? null,
        ownerName: user.name,
        createdAt: created.createdAt.toISOString(),
        memberCount: 1,
        taskCount: 0,
      }),
    );
  },
);

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const id = params.data.id;
  const user = req.user!;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (user.role !== "admin" && !(await isProjectMember(id, user.id))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const memberRows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
      passwordHash: usersTable.passwordHash,
    })
    .from(usersTable)
    .innerJoin(projectMembersTable, eq(projectMembersTable.userId, usersTable.id))
    .where(eq(projectMembersTable.projectId, id));

  const members = memberRows.map((m) => serializeUser(m));

  const taskRows = await db
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
      assigneeName: usersTable.name,
    })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(eq(tasksTable.projectId, id))
    .orderBy(tasksTable.createdAt);

  const tasks = taskRows.map((t) =>
    serializeTask({
      ...t,
      projectName: project.name,
      assigneeName: t.assigneeName ?? null,
      createdByName: null,
    } as EnrichedTask),
  );

  const [owner] = project.ownerId
    ? await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, project.ownerId))
    : [];

  res.json(
    GetProjectResponse.parse({
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      ownerId: project.ownerId ?? null,
      ownerName: owner?.name ?? null,
      createdAt: project.createdAt.toISOString(),
      members,
      tasks,
    }),
  );
});

router.put(
  "/projects/:id",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = GetProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const updates: Partial<{ name: string; description: string | null }> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description ?? null;

    const [updated] = await db
      .update(projectsTable)
      .set(updates)
      .where(eq(projectsTable.id, params.data.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const [memberCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projectMembersTable)
      .where(eq(projectMembersTable.projectId, updated.id));
    const [taskCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasksTable)
      .where(eq(tasksTable.projectId, updated.id));
    const [owner] = updated.ownerId
      ? await db
          .select({ name: usersTable.name })
          .from(usersTable)
          .where(eq(usersTable.id, updated.ownerId))
      : [];
    res.json(
      UpdateProjectResponse.parse({
        id: updated.id,
        name: updated.name,
        description: updated.description ?? null,
        ownerId: updated.ownerId ?? null,
        ownerName: owner?.name ?? null,
        createdAt: updated.createdAt.toISOString(),
        memberCount: memberCountRow?.count ?? 0,
        taskCount: taskCountRow?.count ?? 0,
      }),
    );
  },
);

router.delete(
  "/projects/:id",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = GetProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [deleted] = await db
      .delete(projectsTable)
      .where(eq(projectsTable.id, params.data.id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(DeleteProjectResponse.parse({ success: true }));
  },
);

router.post(
  "/projects/:id/members",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = GetProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = AddProjectMemberBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.data.id));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, parsed.data.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await db
      .insert(projectMembersTable)
      .values({ projectId: project.id, userId: user.id })
      .onConflictDoNothing();
    res.json(AddProjectMemberResponse.parse({ success: true }));
  },
);

router.delete(
  "/projects/:id/members/:userId",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = RemoveProjectMemberParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(projectMembersTable)
      .where(
        and(
          eq(projectMembersTable.projectId, params.data.id),
          eq(projectMembersTable.userId, params.data.userId),
        ),
      );
    res.json(RemoveProjectMemberResponse.parse({ success: true }));
  },
);

export default router;
