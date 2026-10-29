# MyCost

Apunta tus gastos e ingresos, mira en qué se va el dinero cada mes y planifica cuánto ahorrar.

**Abrir la app:** https://victoralonsogarciallamas-ctrl.github.io/MyCost/

## Qué hace

- Añade gastos e ingresos a mano, con una foto del ticket o importando el extracto del banco (Excel o CSV).
- Clasifica cada movimiento por categoría, y puedes cambiarla siempre.
- Resumen del mes, evolución de los últimos 12 meses y evolución por categoría.
- Plan de ahorro mensual: eliges el % que quieres ahorrar y te propone cuánto gastar en cada categoría según tu historial.

## Privacidad

No hay cuentas ni servidor. Tus datos se guardan solo en tu móvil, y el ticket se lee en el propio teléfono. Nadie más los ve.

Como los datos viven en el móvil, haz una copia de seguridad de vez en cuando: **Ahorro → Categorías y copia de seguridad → Guardar copia de seguridad**. Con esa copia puedes recuperar tus datos en otro móvil.

## Instalar en el iPhone

1. Abre el enlace en **Safari**.
2. Toca el botón **Compartir** (el cuadrado con la flecha hacia arriba).
3. Elige **Añadir a pantalla de inicio** y toca **Añadir**.

MyCost aparece como una app más y funciona sin conexión.

En Android, abre el enlace en Chrome y elige **Instalar aplicación** en el menú.

## Cómo está hecha

Una sola página (`index.html`) sin dependencias de compilación, publicada con GitHub Pages. Funciona sin conexión gracias a `sw.js`.
La lectura de tickets usa [Tesseract.js](https://github.com/naptha/tesseract.js) y la de Excel usa [SheetJS](https://sheetjs.com), ambos incluidos en `vendor/` con sus licencias (Apache 2.0).
