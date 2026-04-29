import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetUserParams,
  GetUserResponse,
  ListUsersResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { serializeUser } from "../lib/serializers";

const router: IRouter = Router();

router.use("/users", requireAuth);

router.get("/users", requireRole("admin"), async (_req, res): Promise<void> => {
  const rows = await db.select().from(usersTable).orderBy(usersTable.id);
  res.json(ListUsersResponse.parse(rows.map((r) => serializeUser(r))));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const requester = req.user!;
  if (requester.role !== "admin" && requester.id !== params.data.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [row] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetUserResponse.parse(serializeUser(row)));
});

export default router;
