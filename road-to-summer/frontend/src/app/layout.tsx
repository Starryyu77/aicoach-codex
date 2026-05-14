import "./globals.css";
import type { ReactNode } from "react";
import { AppNavigation } from "../components/AppNavigation";

export const metadata = {
  title: "Road to Summer",
  description: "Training cockpit for Road to Summer Hermes fitness Agent."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppNavigation />
        {children}
      </body>
    </html>
  );
}
