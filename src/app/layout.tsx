import type { Metadata } from "next";
import ThemeRegistry from "@/theme/ThemeRegistry";
import CssBaseline from "@mui/material/CssBaseline";
import { SWRProvider } from "@/lib/swr-config";
import SnackbarProvider from "@/components/ui/SnackbarProvider";

export const metadata: Metadata = {
  title: { template: "%s — Merraki Admin", default: "Merraki Admin" },
  description: "Merraki platform administration panel",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
          <ThemeRegistry>
            <CssBaseline />
            <SWRProvider>
              <SnackbarProvider>{children}</SnackbarProvider>
            </SWRProvider>
          </ThemeRegistry>
      </body>
    </html>
  );
}
