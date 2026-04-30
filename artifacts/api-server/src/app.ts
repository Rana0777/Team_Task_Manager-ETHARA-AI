import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function findClientDist(): string | null {
  const candidates = [
    path.resolve(moduleDir, "../../task-manager/dist/public"),
    path.resolve(moduleDir, "../../../artifacts/task-manager/dist/public"),
    path.resolve(process.cwd(), "artifacts/task-manager/dist/public"),
    path.resolve(process.cwd(), "../task-manager/dist/public"),
  ];

  return candidates.find((candidate) => existsSync(path.join(candidate, "index.html"))) ?? null;
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const clientDist = findClientDist();
if (clientDist) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else if (process.env["NODE_ENV"] === "production") {
  logger.warn("Client build not found; API routes will be served without the React app");
}

export default app;
