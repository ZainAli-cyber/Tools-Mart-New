import 'dotenv/config';
import { createApiApp } from '../src/lib/createApiApp';

/** Vercel serverless entry — all /api/* requests rewrite here (see vercel.json). */
export default createApiApp();
