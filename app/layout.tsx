import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CollegePath — Senior Year: Apply",
  description:
    "Your senior-year college application command center: essays, activities, interviews, deadlines, and decisions.",
};

// viewport-fit=cover is required for the env(safe-area-inset-*) padding (notch /
// home indicator) used in the header and bottom tab bar to take effect.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme (or the OS preference) before first paint to avoid a
// flash of the wrong mode. Runs synchronously in <head>.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('cp.theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-[100dvh] overflow-hidden bg-slate-50 text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
