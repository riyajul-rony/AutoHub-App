import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Reach AI — Modern B2B Marketing & Cold Outreach Engine",
  description:
    "High-precision lead generation, multi-account cold email outreach, automated follow-ups, and scheduled social distribution.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie =
    cookieStore.get("leadreach_theme")?.value ||
    cookieStore.get("autohub_theme")?.value;
  const initialTheme = themeCookie === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      suppressHydrationWarning
      className="h-full antialiased font-sans"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('leadreach_theme')||localStorage.getItem('autohub_theme');var theme=(t==='light')?'light':'dark';document.documentElement.setAttribute('data-theme',theme);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">{children}</body>
    </html>
  );
}
