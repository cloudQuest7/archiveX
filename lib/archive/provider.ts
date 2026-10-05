export type ArchiveSubmitResult = {
  success: boolean;
  archiveUrl?: string;
  archiveIdentifier?: string;
  error?: string;
  isMock?: boolean;
};

export interface ArchiveProvider {
  name: string;
  serviceKey: "wayback" | "archive_today" | "mock";
  isDevelopment?: boolean;
  submit(url: string): Promise<ArchiveSubmitResult>;
}
