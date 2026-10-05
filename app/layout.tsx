import type { Metadata, Viewport } from "next";
import "./globals.css";
import {
  AppSidebar,
  SidebarProvider,
} from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toaster } from "sonner";
import { bootstrapQueueSystem } from "@/lib/queue/bootstrap";

void bootstrapQueueSystem();

export const metadata: Metadata = {
  title: "ARCHIVE — Preserve the web. Automatically.",
  description:
    "Discover public URLs, archive them automatically, and maintain a permanent searchable history.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SidebarProvider>
          <div className="flex flex-row min-h-screen">
            <AppSidebar />
            <main className="flex-1 min-w-0 min-h-screen flex flex-col">
              <AppHeader />
              <div className="p-4 sm:p-6 md:p-8 mx-auto w-full max-w-[1400px] flex-1">
                {children}
              </div>
              <Toaster
                position="bottom-center"
                richColors
                closeButton
                className="sm:!top-4 sm:!right-4 sm:!bottom-auto sm:!left-auto sm:!translate-x-0"
                toastOptions={{
                  className: "!w-[calc(100vw-1.5rem)] sm:!w-auto sm:!max-w-sm",
                }}
              />
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
