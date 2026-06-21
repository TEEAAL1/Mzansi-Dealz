import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
