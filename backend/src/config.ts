import { config as loadEnv } from 'dotenv';

loadEnv();

const DEFAULT_ORIGINS = ['http://localhost:5173'];

function parseOrigins(value: string | undefined): string[] {
  if (!value) return DEFAULT_ORIGINS;
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parsePort(value: string | undefined): number {
  const fallback = 4000;
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT),
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),
  storagePath: process.env.STORAGE_PATH ?? 'storage/projects.json'
};
