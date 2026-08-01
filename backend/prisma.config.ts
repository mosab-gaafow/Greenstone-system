import process from 'node:process';
import { defineConfig } from 'prisma/config';

// Prisma 7 does not load .env automatically. Node's built-in loader is used so
// the project does not need a dotenv dependency. In CI the variables are already
// present in the environment and there is no .env file, so a miss is ignored.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file — rely on the ambient environment.
}

const url = process.env['DATABASE_URL'];

if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.',
  );
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    url,
  },
});
