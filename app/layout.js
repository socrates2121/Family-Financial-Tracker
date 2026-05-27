import "./globals.css";

export const metadata = {
  title: "Family Wallet",
  description: "Οικογενειακά οικονομικά — Θανάσης & Έμμυ",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Family Wallet",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="el">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
