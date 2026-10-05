import { z } from "zod";

export const AddDomainSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .url("Must be a valid URL")
    .refine(
      (val) => val.startsWith("http://") || val.startsWith("https://"),
      "Only HTTP or HTTPS URLs are allowed"
    ),
  projectName: z.string().trim().optional(),
});

export type AddDomainInput = z.infer<typeof AddDomainSchema>;

export const StartScanSchema = z.object({
  domainId: z.string().min(1, "domainId is required"),
});

export const QueueActionSchema = z.object({
  action: z.enum([
    "start",
    "pause",
    "resume",
    "retry-failed",
    "cancel-pending",
  ]),
  domainId: z.string().optional(),
});

export type QueueActionInput = z.infer<typeof QueueActionSchema>;

export const RepositoryQuerySchema = z.object({
  q: z.string().optional(),
  domainId: z.string().optional(),
  archiveStatus: z.string().optional(),
  service: z.string().optional(),
  discoverySource: z.string().optional(),
  httpStatus: z.coerce.number().optional(),
  sortBy: z
    .enum([
      "lastSubmitted_desc",
      "lastSubmitted_asc",
      "url_asc",
      "url_desc",
      "domain_asc",
      "created_desc",
    ])
    .default("lastSubmitted_desc"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export const AppSettingsSchema = z.object({
  maxUrls: z.coerce.number().int().min(1).max(50000),
  requestTimeoutMs: z.coerce.number().int().min(1000).max(300000),
  crawlConcurrency: z.coerce.number().int().min(1).max(20),
  defaultProvider: z.enum(["wayback", "archive_today", "mock"]),
  maxAttempts: z.coerce.number().int().min(1).max(20),
});
