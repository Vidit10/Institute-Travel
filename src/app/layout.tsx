import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import PostHogProvider from "@/components/PostHogProvider";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Campus Travel — IIT Dharwad",
  description: "Campus travel, simplified — for IIT Dharwad.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: next-themes mutates <html> class before hydration.
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 min-h-screen">
        <ThemeProvider>
          <SessionProvider>
            <PostHogProvider>{children}</PostHogProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
