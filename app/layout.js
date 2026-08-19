import "./globals.css";

export const metadata = {
  title: "Velvet Nails | Turnos online",
  description: "Reservá tu próximo servicio de uñas en Velvet Nails."
};

export default function RootLayout({ children }) {
  return <html lang="es"><body>{children}</body></html>;
}
