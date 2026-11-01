# Amott

Casa de historia natural ficticia: réplicas de fósiles, herramientas de campo, papel y pequeños hallazgos para quien todavía mira el suelo con curiosidad.

Sitio de una sola página construido con React, TypeScript y Vite. La interfaz está en español y usa una estética de catálogo de campo, con un dinosaurio animado como marca.

## Puesta en marcha

Requiere Node `^20.19.0` o `>=22.12.0`.

```bash
npm install
npm run dev
```

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con Vite. |
| `npm run build` | Comprueba TypeScript y genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve la compilación de producción. |
| `npm run lint` | Ejecuta ESLint. |

## Funcionalidad

- Catálogo de 8 piezas con filtros por categoría y contador accesible.
- Bolsa persistente en `localStorage` (`amott-bag-v1`), cantidades y subtotal.
- Checkout de demostración con validación nativa y confirmación de pedido. No procesa pagos.
- Cajón de bolsa con trampa de foco, cierre con Escape y restauración del foco.
- Navegación móvil, formulario de newsletter y acordeones de notas de campo.
- Animaciones del dinosaurio con respeto a `prefers-reduced-motion`.
- Tipografías autoalojadas con Fontsource: Bricolage Grotesque y Newsreader.

## Estructura

```text
src/
  cart/          Estado y contexto de la bolsa
  components/    Secciones, marca, arte de especímenes y cajón de compra
  data/          Catálogo y categorías
  lib/           Utilidades de formato
  App.tsx        Composición de la página
  index.css      Tokens, base tipográfica y accesibilidad
  App.css        Estilos de componentes y responsive
```

El checkout es una demostración local: los pedidos no se envían a ningún servidor.
