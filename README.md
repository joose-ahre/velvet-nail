# Velvet Nails

Sitio de reservas migrado a Next.js con App Router. Incluye catálogo de servicios, registro e inicio de sesión de demostración, reservas y panel de administración.

**Sitio en producción:** [Abrir Velvet Nails](https://joose-ahre-velvet-nail.vercel.app)

## Desarrollo

```bash
npm install
npm run dev
```

Abrí <http://localhost:3000> en el navegador.

## Acceso de demostración

- Email: `owner@velvetnails.com`
- Contraseña: `admin123`

Las cuentas, los servicios y las reservas se guardan en `localStorage` del navegador. La app conserva los datos locales de la versión anterior y adapta las cuentas que tenían el campo `pass`. Los datos no se comparten entre dispositivos ni funcionan como autenticación segura para producción.

## Comandos

```bash
npm run dev
npm run build
npm start
npm run lint
```
