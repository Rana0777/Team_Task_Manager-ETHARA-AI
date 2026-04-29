import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { SignupBody, LoginBody, SignupResponse, LoginResponse, GetCurrentUserResponse } from "@workspace/api-zod";
import {
  signToken,
  hashPassword,
  comparePassword,
  requireAuth,
  isValidEmail,
} from "../lib/auth";
import { serializeUser } from "../lib/serializers";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password, role } = parsed.data;
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  const normalizedEmail = email.toLowerCase().trim();
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await hashPassword(password);
  const finalRole = role === "admin" ? "admin" : "member";
  const [created] = await db
    .insert(usersTable)
    .values({ name, email: normalizedEmail, passwordHash, role: finalRole })
    .returning();
  const user = serializeUser(created);
  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  res.json(SignupResponse.parse({ token, user }));
});


router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [row] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!row) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await comparePassword(password, row.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const user = serializeUser(row);
  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  res.json(LoginResponse.parse({ token, user }));
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [row] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetCurrentUserResponse.parse(serializeUser(row)));
});

export default router;
