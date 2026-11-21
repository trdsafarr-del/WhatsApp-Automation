import express, { type NextFunction, type Request, type Response } from 'express';
import { registerDashboardAuth } from '../server/auth.js';

/**
 * Ultra-lightweight Vercel serverless function dedicated exclusively to `/api/auth/*`.
 * Decoupled from persistent disk store, Shopify/Delhivery sync, and WhatsApp modules so
 * admin passcode verification never suffers from heavy cold-start failures.
 */
const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

registerDashboardAuth(app);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Unable to verify password right now.';
  res.status(500).json({ ok: false, error: message });
});

export default app;
