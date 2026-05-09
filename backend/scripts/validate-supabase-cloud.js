const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const [schemas, tables, indexes, foreignKeys, migrationTables] = await Promise.all([
    prisma.$queryRawUnsafe(
      "select schema_name from information_schema.schemata where schema_name = 'template_engine'",
    ),
    prisma.$queryRawUnsafe(
      "select table_name from information_schema.tables where table_schema = 'template_engine' order by table_name",
    ),
    prisma.$queryRawUnsafe(
      "select indexname from pg_indexes where schemaname = 'template_engine' order by indexname",
    ),
    prisma.$queryRawUnsafe(
      "select conname from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'template_engine' and c.contype = 'f' order by conname",
    ),
    prisma.$queryRawUnsafe(
      "select table_schema, table_name from information_schema.tables where table_name = '_prisma_migrations' order by table_schema",
    ),
  ]);

  if (migrationTables.length === 0) {
    throw new Error("Prisma migration history table _prisma_migrations was not found.");
  }

  const migrationHistorySchema = migrationTables[0].table_schema;
  const migrations = await prisma.$queryRawUnsafe(
    `select migration_name, finished_at is not null as applied from "${migrationHistorySchema}"."_prisma_migrations" order by started_at`,
  );

  console.log(
    JSON.stringify(
      {
        schemas,
        tables,
        indexCount: indexes.length,
        foreignKeys,
        migrationHistorySchema,
        migrations,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
