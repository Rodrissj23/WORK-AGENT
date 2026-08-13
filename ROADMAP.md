# ROADMAP — WORK AGENT / ZERO

Actualizado: 13/08/2026

## Fase 1 — Hub operativo ✅
- Unificar accesos a sistemas.
- Integrar Mini Hub.
- Integrar Mora, Scoring, Control de liquidaciones y Mi liquidación.
- Crear Centro de Atención.

## Fase 2 — ZERO Assistant layer 🚧
- Parser de comandos por entidades ✅
- Memoria contextual corta ✅
- Respuesta hablada ✅
- Pip de inicio de escucha ✅
- Selector de micrófono ✅
- Whisper local con `faster-whisper` ✅
- Parser de frases naturales ✅
- Corte automático por silencio ✅
- Wake word `Zero` ✅
- Modo manos libres ✅
- Conversación contextual de 6 segundos 🚧
- Hasta 4 follow-ups por contexto 🚧
- Cierre natural: `Quedo atento` 🚧
- Error visible: decir `No entendí` y mostrar qué oyó Whisper ⏳
- Mejorar TTS: menos robótico, mejor pronunciación y pausas ⏳

## Fase 3 — Launcher / accesos por voz 🚧
- Abrir siempre en pestaña nueva.
- Puente Digital.
- Ceibo.
- Planilla de Ventas Prevención.
- Drive.
- WhatsApp Web.
- Gmail.
- Portal Prevención / rendición de ventas.
- Soportar sinónimos naturales: `abrí Prevención`, `tengo que rendir ventas`, `vamos a rendir`.
- Si una orden es ambigua, preguntar antes de abrir.

## Fase 4 — Acciones operativas ⏳
- `actualizá mora`.
- `ejecutá scoring`.
- `buscá el DNI ...`.
- `abrí la última venta`.
- `buscame a ...`.
- Separar intención de ejecución para poder reemplazar parser por razonamiento en el futuro.

## Fase 5 — Briefing operativo hablado 🚧
- Al abrir WORK AGENT, Zero pregunta si querés saber cómo estamos.
- El briefing también queda disponible por voz en cualquier momento.
- Saludo dinámico según horario ✅
- Gmail -> mails laborales importantes pendientes ⏳
- Mora -> última ejecución, hora, procesados y errores ⏳
- Scoring -> última ejecución, hora y archivo generado ⏳
- Centro de Atención -> estados reales 🚧

## Fase 6 — Bus de estado / motores vivos 🚧
- Endpoint local común `GET /status` ✅
- Endpoint `POST /status/mora` ✅
- Endpoint `POST /status/scoring` ✅
- Endpoint `POST /status/gmail` ✅
- Persistencia local `work_agent_status.json` ✅
- WORK AGENT consume estados y actualiza tarjetas ✅
- Conectar motores reales cuando esté disponible la PC del trabajo ⏳

## Fase 7 — Canales ⏳
- WhatsApp laboral.
- Extensión de Chrome o launcher local.
- Activación desde segundo plano aunque WORK AGENT no esté visible.

## Fase 8 — CEREBRO ZERO 🧠 ⏳
Objetivo: que Zero deje de depender de reglas rígidas y entienda intención, contexto y lenguaje natural por razonamiento.

Arquitectura objetivo:
1. Voz / texto entra a Zero.
2. El cerebro interpreta intención, contexto y entidades.
3. Decide si responder, preguntar, abrir algo o ejecutar una herramienta.
4. Usa herramientas separadas: Mini Hub, accesos, Mora, Scoring, Gmail, Drive, búsquedas, etc.
5. Mantiene memoria de la conversación y de la operación.
6. Responde de forma natural y humana.

Principio de diseño: las reglas actuales NO son el cerebro final; son herramientas y fallback. El futuro cerebro debe poder reemplazar la lógica rígida sin reescribir los motores.

## Fase 9 — ZERO avanzado ⏳
- Preguntas naturales sobre todos los motores.
- Acciones por voz.
- Resumen operativo al iniciar jornada.
- Alertas proactivas.
- Historial central de eventos y decisiones.
- Memoria de trabajo.
- Personalidad y voz configurable.
- Razonamiento sobre tareas encadenadas.
