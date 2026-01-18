import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "ROOL Admin Dashboard",
  description: "Admin dashboard for ROOL",
  icons: {
    icon: "/admin_rool_white_logo.png",
    shortcut: "/admin_rool_white_logo.png",
    apple: "/admin_rool_white_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/admin_rool_white_logo.png" type="image/png" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        </head>
        <body className="antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              {children}
              <Toaster 
                position="top-center" 
                toastOptions={{
                  duration: 4000,
                  style: {
                    zIndex: 99999,
                  },
                }}
                containerStyle={{
                  zIndex: 99999,
                }}
              />
            </AuthProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
