import { defineConfig } from 'prisma/config';

// Prisma 7 reads the connection URL from here instead of the schema. Generating the client
// needs no database, so a missing DATABASE_URL only matters for migrate commands.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
