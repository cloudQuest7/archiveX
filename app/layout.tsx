import type { Metadata } from "next";
import "./globals.css";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toaster } from "sonner";
import { bootstrapQueueSystem } from "@/lib/queue/bootstrap";

void bootstrapQueueSystem();

export const metadata: Metadata = {
  title: "ARCHIVE — Preserve the web. Automatically.",
  description:
    "Discover public URLs, archive them automatically, and maintain a permanent searchable history.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex flex-row">
          <AppSidebar />
          <main className="flex-1 min-h-screen">
            <AppHeader />
            <div className="p-8 mx-auto max-w-[1400px]">{children}</div>
            <Toaster position="top-right" richColors closeButton />
          </main>
        </div>
      </body>
    </html>
  );
}
