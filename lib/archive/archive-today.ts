import { ArchiveProvider, ArchiveSubmitResult } from "./provider";

/**
 * Safe stub for archive.today / archive.is.
 *
 * Direct automated submission of URLs to archive.today is known to require
 * solving CAPTCHAs for many requests. To avoid bypassing access controls,
 * this provider stub declines automated submissions and prompts the user
 * to manually submit. The provider remains pluggable so a compliant
 * implementation can be added later if permitted interfaces are released.
 */
export class ArchiveTodayProvider implements ArchiveProvider {
  name = "Archive.today (manual submission recommended)";
  serviceKey = "archive_today" as const;

  async submit(_url: string): Promise<ArchiveSubmitResult> {
    return {
      success: false,
      error:
        "Archive.today automation disabled to avoid CAPTCHA bypass. Please submit manually at https://archive.ph/ and paste the archive URL.",
    };
  }
}
