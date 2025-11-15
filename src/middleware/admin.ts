import { Request, Response, NextFunction } from 'express';


export const isAdmin = (req: Request, res: Response, next: NextFunction) => {

  const user = (req as any).user;

  if (user && user.isAdmin) {

    next();
    return;
  }


  res.status(403).json({ error: 'Forbidden: Access denied' });
  

  return;
};