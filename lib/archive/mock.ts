import crypto from "crypto";
import { ArchiveProvider, ArchiveSubmitResult } from "./provider";

function sha1(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex");
}

export class MockArchiveProvider implements ArchiveProvider {
  name = "Development Provider";
  serviceKey = "mock" as const;
  isDevelopment = true;

  async submit(url: string): Promise<ArchiveSubmitResult> {
    // Simulated delay (300ms - 1200ms) to mimic network
    const delay = 300 + Math.floor(Math.random() * 900);
    await new Promise((r) => setTimeout(r, delay));

    // Simulate ~8% failure for demo purposes
    const roll = Math.random();
    if (roll < 0.05) {
      return {
        success: false,
        error: "Timeout connecting to Development Provider",
        isMock: true,
      };
    }
    if (roll < 0.08) {
      return {
        success: false,
        error: "Provider rate limited (demo)",
        isMock: true,
      };
    }

    const digest = sha1(url);
    return {
      success: true,
      archiveUrl: `http://localhost:3000/archive/demo/${digest}?url=${encodeURIComponent(url)}`,
      archiveIdentifier: `mock-${digest}`,
      isMock: true,
    };
  }
}
