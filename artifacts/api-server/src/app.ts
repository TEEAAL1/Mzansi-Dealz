import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pinoHttp from "pino-http";
import timeout from "connect-timeout";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
const allowedOrigins = new Set(
  [
    process.env.CORS_ORIGINS,
    process.env.FRONTEND_ORIGIN,
    process.env.REPLIT_DOMAINS,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.has(origin) ||
        (process.env.NODE_ENV !== "production" && allowedOrigins.size === 0)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed"));
    },
  }),
);
app.use(helmet());
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET must be set in production.");
}
app.use(cookieParser(sessionSecret ?? "development-session-secret"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(timeout("30s"));
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (!req.timedout) next();
});

app.use("/api", router);

app.use("/uploads", express.static("uploads"));

// Catch-all 404 — return JSON, never HTML
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    method: req.method,
  });
});

// Global error handler — return JSON, never HTML
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = (err as any).statusCode ?? (err as any).status ?? 500;
  req.log?.error?.({ err }, "Unhandled error");
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  res.status(statusCode).json({
    error: "Server error",
    message: process.env.NODE_ENV === "production" ? "An unexpected error occurred." : err.message,
  });
});

export default app;
