// middleware/auth.ts
import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export type AuthedRequest = Request & { userId?: number | string };

export const authenticate: RequestHandler = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const hdr = req.headers.authorization;
  if (!hdr || !hdr.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return; // 👈 ensure void
  }

  const token = hdr.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number | string };
    (req as AuthedRequest).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
};
