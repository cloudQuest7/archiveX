import { ArchiveProvider } from "./provider";
import { WaybackMachineProvider } from "./wayback";
import { ArchiveTodayProvider } from "./archive-today";
import { MockArchiveProvider } from "./mock";

const wayback = new WaybackMachineProvider();
const archiveToday = new ArchiveTodayProvider();
const mock = new MockArchiveProvider();

export const ARCHIVE_PROVIDERS: Record<
  "wayback" | "archive_today" | "mock",
  ArchiveProvider
> = {
  wayback,
  archive_today: archiveToday,
  mock,
};

export function getProvider(
  key: "wayback" | "archive_today" | "mock"
): ArchiveProvider {
  return ARCHIVE_PROVIDERS[key] ?? ARCHIVE_PROVIDERS.mock;
}

export function getAllProviders(): ArchiveProvider[] {
  return [wayback, archiveToday, mock];
}
