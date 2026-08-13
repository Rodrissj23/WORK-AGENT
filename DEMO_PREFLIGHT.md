# ZERO — Preflight de demo

Usar esta lista justo antes de presentar. El objetivo es validar el camino feliz sin convertir la demo en una prueba de infraestructura.

## 60 segundos antes

1. Abrir WORK AGENT en Chrome y hacer `Ctrl+F5`.
2. Confirmar que el encabezado y el cuadro de comando cargan sin errores visibles.
3. Ejecutar por texto: `Zero, modo demo.`
4. Ejecutar por texto: `Zero, diagnóstico.`
5. Probar: `Zero, mujer de 9 años.` y luego `¿Y de 14?`.
6. Probar: `Zero, tengo que rendir ventas.` y confirmar que pide permiso antes de abrir accesos.
7. Probar: `Zero, ¿qué podés hacer?` y confirmar que describe capacidades reales, sin prometer ejecuciones no conectadas.

## Voz

- Con ZERO Local Core disponible, el botón Hablar debe usar Whisper local.
- Si el servicio local no corresponde al core real de Whisper, la capa `voice-core-guard.js` debe evitar tratarlo como motor válido.
- Si Whisper no está disponible, usar reconocimiento de Chrome o continuar por texto.
- Manos libres no debe presentarse como disponible si el núcleo local correcto no está activo.

## Conversación

- `Zero, tengo que rendir ventas.` → debe pedir confirmación.
- `Sí.` → puede abrir los accesos registrados.
- `Abrime la planilla.` → debe aprovechar el contexto de ventas.
- `Mañana tengo que revisar Mora.` + `Y después los mails de Prevención.` → debe conservar el objetivo compuesto.
- `¿Qué tenés en mente?` → debe resumir contexto sin inventar acciones.

## Seguridad

- Gmail se muestra en modo consulta; no enviar, borrar, archivar ni modificar mensajes.
- No disparar Mora ni Scoring desde el navegador si la ejecución sensible no está explícitamente integrada y confirmada.
- No mostrar archivos locales de configuración durante la presentación.

## Plan B

Si falla voz o backend, seguir la misma secuencia por texto. La historia de producto sigue siendo válida: lenguaje natural, contexto, accesos centralizados, estado operativo y guardas antes de acciones con impacto.

## Criterio de listo

La demo está lista para mostrarse si el flujo por texto funciona, la UI carga completa, las respuestas no prometen capacidades inexistentes y cualquier degradación de voz cae de forma clara a un modo alternativo.