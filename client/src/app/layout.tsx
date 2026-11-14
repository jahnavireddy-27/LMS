import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LMS | Learn at your pace",
  description: "Discover courses, build skills, and keep track of your learning progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
