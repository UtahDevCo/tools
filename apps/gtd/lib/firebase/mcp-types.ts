import { z } from "zod";

export const McpConfigSchema = z.object({
  apiKeyHash: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastUsedAt: z.number().optional(),
});

export type McpConfig = z.infer<typeof McpConfigSchema>;
