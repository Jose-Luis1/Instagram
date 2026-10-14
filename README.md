# Seguimiento de vuelta

Extensión Manifest V3 para Chrome y Edge que compara los seguidores y seguidos de tu cuenta de Instagram. No realiza acciones de seguimiento ni solicita contraseñas. Las listas solo permanecen en la memoria de la pestaña del informe; no se envían a servidores propios ni se guardan en disco.

## Instalar y usar

1. Abre la página de extensiones del navegador (`chrome://extensions` o `edge://extensions`).
2. Activa el modo de desarrollador y elige **Cargar descomprimida**.
3. Selecciona la carpeta de este repositorio (si trabajas en la nube, descarga primero los archivos a tu equipo).
4. Abre `https://www.instagram.com/` e inicia sesión.
5. Pulsa el icono de la extensión, selecciona tu pestaña de Instagram y pulsa **Comparar mis listas**.

La consulta se ejecuta únicamente al pulsar el botón. Las cuentas grandes tardan más. No repitas consultas si Instagram limita el acceso. Cierra la pestaña de Instagram para detener una consulta en curso.

## Desarrollo

Node.js 24 permite ejecutar `npm test`. No se requieren paquetes externos ni compilación. Después de editar, recarga la extensión en la página de extensiones y abre un informe nuevo.

## Limitaciones

Esta versión consulta endpoints internos de Instagram con la sesión existente del navegador. Instagram puede cambiarlos, denegar el acceso o imponer límites. La comparación usa IDs de cuenta y recorre páginas; cancela el informe ante errores, páginas repetidas o respuestas incompletas detectables. Una respuesta truncada sin indicadores de paginación no puede detectarse de forma fiable. Las listas también pueden cambiar durante la lectura.

La integración real requiere comprobarla en un navegador con tu sesión de Instagram; las pruebas automatizadas no validan acceso real ni compatibilidad futura con sus endpoints. Firefox y publicación en tiendas no están incluidos en esta versión.
