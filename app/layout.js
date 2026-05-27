import "./globals.css";

export const metadata = {
  title: "Family Wallet",
  description: "Οικογενειακά οικονομικά — Θανάσης & Έμμυ",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
