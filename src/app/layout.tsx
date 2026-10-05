import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://bravometro.es"),
  title: { default: "Bravómetro · Medidor de la calidad de las bravas", template: "%s · Bravómetro" },
  description: "Convertimos las opiniones sobre las patatas bravas en información que realmente puedes utilizar.",
  applicationName: "Bravómetro",
  icons: { icon: "/assets/app-icon.png", apple: "/assets/app-icon.png" },
  openGraph: { type: "website", siteName: "Bravómetro", images: [{ url: "/assets/banner.png", width: 2172, height: 724 }] },
  twitter: { card: "summary_large_image", images: ["/assets/banner.png"] },
};

export const viewport: Viewport = { themeColor: "#d83b19", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content=process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?<ClerkProvider appearance={{variables:{colorPrimary:"#d83b19",borderRadius:"0.875rem"}}}>{children}</ClerkProvider>:children;
  return <html lang="es"><body>{content}</body></html>;
}
