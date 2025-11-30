import cors, { CorsOptions } from 'cors';

const allowedOrigins: string[] = process.env.ALLOWED_ORIGINS?.split(',') || [];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // If Origin header is missing → block the request
    if (!origin) {
      return callback(new Error('CORS Error: Origin header is required'), false);
    }

    // Allow only if origin matches our list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Block all other origins
    return callback(new Error('CORS Error: Domain not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Custom-Header'],
  maxAge: 86400, // 24h preflight cache
};
