# Manga Integral

Tienda de muestra hecha con React y Vite. Corre en el navegador, sin backend, cuentas remotas ni pasarela de pago.

## Ejecutar

```sh
npm install
npm run dev
```

## Catálogo e imágenes

No encontré una API pública documentada de catálogo de manga de Panini. La tienda consulta AniList como fuente principal: su API pública permite buscar mangas y consultar portadas en variantes `extraLarge`, `large` y `medium`. La selección principal muestra Gachiakuta, Shingeki no Kyojin, Tower Dungeon, Dungeon Meshi y 20th Century Boys. Tower Dungeon se identifica con su ficha de AniList (obra de Tsutomu Nihei, publicada por Kodansha). Si AniList no responde, el catálogo usa Jikan, una API comunitaria no oficial que recopila datos de MyAnimeList. Para una portada ausente se consulta AniList y luego Jikan, verificando el título antes de mostrarla.

Las fichas, autorías y portadas son datos de descubrimiento; no representan el inventario de Panini. Los importes en MXN son estimaciones de muestra y no precios oficiales.

## Interacciones locales

- El carrito permite añadir y quitar títulos, ajustar cantidades y consultar el subtotal; persiste en `localStorage`.
- El registro valida nombre, formato del correo, contraseña y confirmación. La contraseña se deriva con PBKDF2/SHA-256 y una sal aleatoria; solo se guarda el hash local, nunca la contraseña en texto. Iniciar sesión comprueba ese hash en este navegador.
- El perfil guarda los mangas favoritos con una copia local de sus datos y muestra pedidos de prueba asociados al correo. Todo queda en `localStorage` y sobrevive a recargas.
- Las portadas abren detalles con autoría, sinopsis, géneros y datos editoriales cuando están disponibles. El control de compra lleva al formulario de demostración.
- El pago es una confirmación ficticia. No valida autenticidad, transmite ni almacena datos de tarjeta.
- Los carruseles aceptan flechas, puntos de posición, arrastre de ratón y deslizamiento táctil. Avanzan automáticamente mientras están visibles y se pausan al interactuar; respetan `prefers-reduced-motion`.

## Seguridad, servicios y límites

- **Servicios web y APIs:** sí. El navegador consulta AniList GraphQL y Jikan REST como alternativa para catálogo y portadas. No existe una API propia ni un servidor de Manga Integral.
- **Seguridad:** hay validación del formulario y hash local de contraseñas, pero esto no equivale a autenticación segura de producción. Las cuentas, sesión, favoritos y pedidos viven en el almacenamiento del navegador y quien controla ese navegador puede modificarlos o borrarlos. No guardes datos sensibles ni reutilices una contraseña.
- El servidor local de Vite y su vista previa envían encabezados básicos para evitar MIME sniffing, impedir que otro sitio inserte la página en un frame, limitar el referrer y bloquear permisos de cámara, micrófono y geolocalización. Al publicar una compilación estática, el hosting debe aplicar encabezados equivalentes; `dist/` no configura el servidor de producción.
- No hay backend, base de datos remota, sesiones firmadas, gestión de cuentas entre dispositivos ni procesamiento de pagos. El formulario de tarjeta es demostrativo y sus campos no se guardan.
- Para una tienda real harían falta un servidor con autenticación y almacenamiento protegidos, HTTPS y una pasarela de pago; el alcance actual se mantiene completamente local y sin pagos reales.

Se necesita Internet para consultar catálogos y portadas remotos. Si esas fuentes no están disponibles, queda un catálogo local de 24 títulos para probar las interacciones.
