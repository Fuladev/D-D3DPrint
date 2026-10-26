# D&D · Impresión 3D

App web en React que replica la hoja **Calculadora PRO** del Excel `Calculadora_3D_PRO.xlsx` y agrega catálogo de productos, pedidos con factura PDF para WhatsApp y control de stock. Los datos viven en **Supabase**, así que se ven en todos los dispositivos donde entres con la misma cuenta.

Publicada en GitHub Pages: https://fuladev.github.io/D-D3DPrint/

## Secciones

- **Calculadora** – mismas fórmulas del Excel: material, luz, desgaste, fallas, mano de obra, insumos, multiplicador (lista o personalizado), redondeo, precio por pieza y precio en plataforma. Guarda el resultado como producto o actualiza el que estás recalculando.
- **Productos** – catálogo con imagen de referencia como ícono, tiempo de impresión y gramos (por unidad y por cama), precio, stock y vendidos.
- **Pedidos** – cliente y WhatsApp, selección de productos, cantidades, descuento, envío y notas. Genera la factura PDF con el logo y la comparte por WhatsApp.
- **Stock** – producción, ajustes y **ventas de mostrador** (venta directa sin pedido ni factura, con su precio). También descuentan los pedidos marcados como *Entregado*.
- **Ajustes** – datos del negocio, cuenta, respaldo JSON y migración de datos guardados en el navegador por la versión anterior.

Modo claro y oscuro con el botón 🌙/☀️ (se recuerda en cada dispositivo).

## Supabase

Proyecto `dd-impresion-3d`. Tablas `products`, `orders`, `movements` y `settings`, todas con Row Level Security: cada cuenta solo ve sus propios datos. Los números de factura los asigna la base de datos (1, 2, 3… por cuenta). Los cambios hechos en otro dispositivo llegan en tiempo real.

La URL y la clave publicable están en `src/lib/supabase.js` (se pueden cambiar con `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY`). La clave publicable es pública por diseño; la seguridad la dan las políticas RLS.

En el panel de Supabase → *Authentication → URL Configuration*, pon `https://fuladev.github.io/D-D3DPrint/` como **Site URL** para que el enlace de confirmación del correo vuelva a la app.

## Publicación

Cada push a la rama principal ejecuta `.github/workflows/deploy.yml`: corre las pruebas, compila y publica `dist/` en la rama `gh-pages`. En *Settings → Pages* del repositorio, la fuente debe ser **Deploy from a branch → gh-pages / (root)**.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas de fórmulas y stock
npm run build    # versión para publicar en dist/
```
