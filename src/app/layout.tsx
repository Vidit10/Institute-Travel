import type { Metadata, Viewport } from "next";
import Link from "next/link";
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
            <PostHogProvider>
              {children}
              <footer className="mt-8 border-t border-gray-200 py-4 text-center text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
                  <span>Made with ❤️ — for the IIT Dharwad Fraternity</span>
                  <div className="flex items-center gap-4">
                    <a
                      href="https://github.com/Vidit10/Institute-Travel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      GitHub
                    </a>
                    <Link href="/feedback" className="hover:text-gray-600 dark:hover:text-gray-300">
                      Feedback
                    </Link>
                  </div>
                </div>
              </footer>
            </PostHogProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
