# Velvet Nails

Sitio de reservas migrado a Next.js con App Router. Incluye catálogo de servicios, registro e inicio de sesión de demostración, reservas y panel de administración.

**Sitio en producción:** [Abrir Velvet Nails](https://joose-ahre-velvet-nail.vercel.app)

## Desarrollo

```bash
npm install
npm run dev
```

Abrí <http://localhost:3000> en el navegador.

Las cuentas y las reservas usan Google Authentication y Firestore. Activá el proveedor Google en Firebase Authentication, agregá el dominio de Vercel en Authentication → Settings → Authorized domains, creá la base de Firestore y publicá [firestore.rules](./firestore.rules). Para habilitar a la dueña, creá manualmente un documento `admins/{uid}` con `{ "role": "admin" }`, usando el UID de su cuenta Google/Firebase. El rol se valida en Firestore y nunca desde `localStorage`.

La configuración del proyecto ya incluye los datos públicos del proyecto `turnero-c651b`. Para otro proyecto, copiá `.env.example` a `.env.local` y completá las variables `NEXT_PUBLIC_FIREBASE_*`. Los servicios siguen pudiendo personalizarse localmente desde el panel; las reservas nuevas son compartidas y sincronizadas en tiempo real entre navegadores. La disponibilidad se coordina mediante documentos `slots/{fecha_hora}` sin datos personales, creados dentro de la misma transacción que la reserva.

## Comandos

```bash
npm run dev
npm run build
npm start
npm run lint
```
