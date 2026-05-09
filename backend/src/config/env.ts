import { config } from "dotenv";

config({ quiet: true });

export const DEFAULT_TENANT_ID =
  process.env.TEMPLATE_ENGINE_DEFAULT_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
