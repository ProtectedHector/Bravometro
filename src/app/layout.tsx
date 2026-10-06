import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: "Bravómetro · Medidor de la calidad de las bravas", template: "%s · Bravómetro" },
  description: "Convertimos las opiniones sobre las patatas bravas en información que realmente puedes utilizar.",
  applicationName: "Bravómetro",
  icons: { apple: "/assets/app-icon.png" },
  openGraph: { type: "website", siteName: "Bravómetro", images: [{ url: "/assets/app-icon.png", width: 1254, height: 1254, type: "image/png", alt: "Logo de Bravómetro" }] },
  twitter: { card: "summary", images: [{ url: "/assets/app-icon.png", alt: "Logo de Bravómetro" }] },
};

export const viewport: Viewport = { themeColor: "#d83b19", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content=process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?<ClerkProvider appearance={{variables:{colorPrimary:"#d83b19",borderRadius:"0.875rem"}}}>{children}</ClerkProvider>:children;
  return <html lang="es"><body>{content}</body></html>;
}
