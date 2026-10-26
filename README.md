# Calculadora 3D PRO

App web en React que replica la hoja **Calculadora PRO** del Excel `Calculadora_3D_PRO.xlsx` y agrega catálogo de productos, pedidos con factura PDF para WhatsApp y control de stock.

## Secciones

- **Calculadora** – mismas fórmulas del Excel: material, luz, desgaste, fallas, mano de obra, insumos, multiplicador (lista o personalizado), redondeo, precio por pieza y precio en plataforma. Botón para guardar el resultado como producto (o actualizar el producto que estás recalculando).
- **Productos** – catálogo con imagen de referencia como ícono, tiempo de impresión y gramos de filamento (por unidad y por cama), precio, stock y vendidos. Botón para cargar los productos de la hoja “PRECIO PRODUCTOS”.
- **Pedidos** – nombre y WhatsApp del cliente, selección de productos tocando su ícono, cantidades, precio editable, descuento, envío y notas. Genera la factura en PDF y la comparte por WhatsApp (en el celular abre el menú de compartir con el PDF adjunto; en computador descarga el PDF y abre el chat del cliente con el resumen).
- **Stock** – registra producción (por unidades o camas) y ajustes; las ventas se descuentan solas al marcar un pedido como *Entregado* (y se devuelven si cambia de estado o se elimina). Muestra producido, vendido, disponible, valor del inventario e historial.
- **Ajustes** – datos del negocio para la factura y respaldo/restauración de toda la información en un archivo JSON.

Los datos se guardan en el navegador (`localStorage`); las imágenes se reducen a 256 px para que quepan. Usa el respaldo para pasar los datos a otro dispositivo.

## Uso

```bash
npm install
npm run dev      # desarrollo en http://localhost:5173
npm test         # pruebas de las fórmulas contra los valores del Excel
npm run build    # versión para publicar en dist/
```

La carpeta `dist/` se puede publicar en cualquier hosting estático (Netlify, Vercel, GitHub Pages).
