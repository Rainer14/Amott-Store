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

## Deploy en Render

El archivo `render.yaml` define un Static Site para Render:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Rewrite `/*` → `/index.html` para que funcionen las rutas de React Router.

Para desplegar:

1. Sube el repositorio a GitHub y en Render crea un **Blueprint** desde ese repositorio, o crea manualmente un Static Site con los valores anteriores.
2. Despliega el frontend. Mientras no haya una API publicada, la interfaz estará disponible pero las funciones que cargan o modifican datos no funcionarán.
3. `render.yaml` configura `VITE_API_BASE_URL` para el backend publicado. Si creaste el Static Site manualmente, añade esa variable de entorno con la URL base de la API y vuelve a desplegar.

`VITE_API_BASE_URL` es pública porque se incorpora al bundle del navegador. No guardes secretos en variables `VITE_*`.

Si el frontend y la API están en orígenes distintos, el backend debe permitir CORS para el dominio de Render con credenciales, y configurar las cookies de sesión para HTTPS y el uso entre sitios. La autenticación también envía tokens Bearer cuando están disponibles.
