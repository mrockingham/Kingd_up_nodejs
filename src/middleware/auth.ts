import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); 
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export type AuthedRequest = Request & { user?: any };

export const authenticate: RequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) => {
  const hdr = req.headers.authorization;
  if (!hdr || !hdr.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return; // 👈 ensure void
  }

  const token = hdr.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number | string };

    // 4. Fetch the full user from the database
    const userIdAsNumber =
      typeof payload.userId === "string"
        ? parseInt(payload.userId, 10)
        : payload.userId;

 
    if (isNaN(userIdAsNumber)) {

      res.status(401).json({ error: "Invalid user ID in token" });

      return;

    }

    const user = await prisma.user.findUnique({
      where: { id: userIdAsNumber },
    });

   if (!user) {
 
      res.status(401).json({ error: "User not found" });
      return;

    }

    // 5. Attach the *entire user object* to req.user
    (req as AuthedRequest).user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
};
