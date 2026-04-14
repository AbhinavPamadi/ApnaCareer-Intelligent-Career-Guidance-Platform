import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebaseAdmin';

export const verifyAuth = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    try {
        const decodedToken = await auth.verifyIdToken(token);
        (req as any).user = decodedToken;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
