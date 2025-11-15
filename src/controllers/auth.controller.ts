import { Request, Response, RequestHandler } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { AuthedRequest } from "../middleware/auth"; 

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export const updateUser = async (req: AuthedRequest, res: Response): Promise<void> => {

  const userId = req.user?.id;

  const { name, email } = req.body;

  if (!userId) {
     res.status(401).json({ error: "Unauthorized" });
     return;
  }

  try {
    // 1. Validate the incoming data
    if (!name || name.trim() === '') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    if (!email || !emailRegex.test(email)) {
      res.status(400).json({ error: 'A valid email is required' });
      return;
    }
    
    // 2. Update the user in the database
    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        name,
        email,
      },
      // Select only the fields you want to send back
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true, // Also send back the isAdmin flag
      }
    });

    // 3. Send back the updated user
    res.status(200).json(updatedUser);

  } catch (error: any) {
    // Check for Prisma's unique constraint error (if email is taken)
    if (error.code === 'P2002' && error.meta?.target.includes('email')) {
      res.status(409).json({ error: 'This email address is already in use.' });
      return;
    }
    console.error('❌ Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const registerUser: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, name, passwordHash } });
    

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } });
  } catch {
    res.status(500).json({ error: "Failed to register user" });
  }
};

export const loginUser: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
};


export const me: RequestHandler = async (req: AuthedRequest, res: Response): Promise<void> => {

  const user = req.user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }


  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  });
};