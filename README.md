# Amott

Tienda en línea con catálogo público, búsqueda y filtros, páginas de detalle de producto, autenticación de clientes y carrito con checkout.

Aplicación SPA construida con React, TypeScript y Vite. La API debe estar disponible por separado; este proyecto contiene únicamente el frontend.

## Requisitos

- Node `^20.19.0` o `>=22.12.0`
- API de Amott ejecutándose en `http://localhost:3001` durante el desarrollo

## Desarrollo local

```bash
npm ci
npm run dev
```

Vite proxifica las peticiones `/api` a `http://localhost:3001`. Para apuntar a otra API, define `VITE_API_BASE_URL` en el entorno de compilación con el origen público o la ruta base de la API (por ejemplo, `https://api.ejemplo.com/api/`).

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo de Vite. |
| `npm run build` | Comprueba TypeScript y genera `dist/`. |
| `npm run preview` | Sirve localmente la compilación. |
| `npm run lint` | Ejecuta ESLint. |

## Verificación de correo

El registro no inicia sesión: la cuenta queda pendiente hasta que el cliente abra el enlace que recibe por correo. La API ya expone estos endpoints, que el frontend consume:

| Método | Ruta | Respuesta esperada |
| --- | --- | --- |
| `POST` | `/api/customer-auth/verify-email` | `200` al validar `{ token }` |
| `POST` | `/api/customer-auth/resend-verification` | `202` genérico para `{ email }` |
| `POST` | `/api/customer-auth/register` | `201` sin abrir sesión |
| `POST` | `/api/customer-auth/login` | `403` con `code: "EMAIL_NOT_VERIFIED"` si falta verificar |
| `GET` | `/api/customer-auth/me` | Incluir `email_verified` |

El enlace del correo debe apuntar a:

```text
https://<dominio-del-frontend>/verificar-correo/verificar?token=<token>
```

El frontend envía el token a `POST /api/customer-auth/verify-email` y limpia la URL para no dejarlo en el historial. En las respuestas de cliente se acepta `email_verified` o `emailVerified`; si el campo no viene (API anterior), el frontend asume que la cuenta ya está verificada para no bloquear usuarios existentes.

Códigos de error que la interfaz sabe interpretar: `EMAIL_NOT_VERIFIED`, `EMAIL_TAKEN`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `INVALID_TOKEN` y `RATE_LIMITED`. Para el reenvío se aplica un enfriamiento de 60 segundos en el navegador.

Rutas nuevas: `/verificar-correo` (aviso y reenvío) y `/verificar-correo/verificar?token=...` (confirmación). El checkout queda bloqueado hasta que `email_verified` sea verdadero.

## Deploy en Render

El archivo `render.yaml` define un Static Site para Render:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Rewrite `/api/*` → `https://ecommerce-api-7tcq.onrender.com/api/*` para que la SPA llame a la API en su propio origen.
- Rewrite `/*` → `/index.html` para que funcionen las rutas de React Router.

La SPA usa rutas relativas `/api/...` y el hosting las reescribe al backend. Así la cookie de sesión (`HttpOnly`) es first-party y funciona aunque la API y el frontend sean servicios o dominios distintos; los navegadores que bloquean cookies de terceros no la descartan.

Para desplegar:

1. Sube el repositorio a GitHub y en Render crea un **Blueprint** desde ese repositorio, o crea manualmente un Static Site con los valores anteriores.
2. Ajusta el rewrite `/api/*` a la URL real del backend si cambia de nombre o de proveedor.
3. Añade el origen del frontend (`https://amott-store-1.onrender.com`) a `ALLOWED_ORIGINS` en el backend.
4. Si usas otro hosting (Vercel, Netlify, Cloudflare), configura el proxy equivalente de `/api/*` hacia el backend.

No necesitas `VITE_API_BASE_URL`: solo se usa en desarrollo para apuntar a una API en otra URL (por ejemplo `http://localhost:3001`). Es una variable pública, nunca guardes secretos en variables `VITE_*`.
