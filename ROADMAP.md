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

## Fase 8 — CEREBRO ZERO 🧠 🚧
Objetivo: que Zero deje de depender de reglas rígidas y entienda intención, contexto y lenguaje natural por razonamiento.

### Brain v0.2 — comprensión antes que automatización
- Estado cognitivo persistente ✅
- Memoria de turnos y foco conversacional ✅
- Resolución de referencias (`eso`, `la otra`, `de nuevo`) ✅
- Registro auditable de decisiones ✅
- Explicación de la última interpretación ✅
- Registro de herramientas separado del cerebro ✅
- Planner multiacción ✅ base inicial
- Clarificación de planes incompletos ✅ base inicial
- Router conversacional para arbitrar briefing/aclaraciones/comandos ✅
- Observador / metacontrol funcional ✅ base inicial
- Puerta de autonomía `EXECUTE / CLARIFY / CONFIRM / BLOCK` ✅
- Política por confianza + riesgo ✅
- Memoria semántica de tareas, personas y recursos frecuentes ⏳
- Selector de herramientas basado en intención + contexto ⏳ estabilizar
- Confirmaciones persistentes para acciones sensibles ⏳
- Ejecutar planes multiacción seguros en secuencia ⏳
- Modelo de lenguaje como capa opcional de razonamiento ⏳

Arquitectura objetivo:
1. Voz / texto entra a Zero.
2. El cerebro interpreta intención, contexto y entidades.
3. Evalúa confianza y ambigüedad.
4. Construye un plan si hay más de una acción.
5. La capa de autonomía decide: ejecutar, aclarar, confirmar o bloquear.
6. Usa herramientas separadas: Mini Hub, accesos, Mora, Scoring, Gmail, Drive, búsquedas, etc.
7. Observa el resultado y actualiza memoria/estado.
8. Responde de forma natural.

Principio de diseño: **razonar puede ser flexible; ejecutar tiene que ser controlado**. Las reglas actuales NO son el cerebro final; son herramientas y fallback. El futuro cerebro debe poder reemplazar la lógica rígida sin reescribir los motores.

## Fase 9 — ZERO avanzado ⏳
- Preguntas naturales sobre todos los motores.
- Acciones por voz.
- Resumen operativo al iniciar jornada.
- Alertas proactivas.
- Historial central de eventos y decisiones.
- Memoria de trabajo y memoria semántica.
- Personalidad y voz configurable.
- Razonamiento sobre tareas encadenadas.
- Cerebro híbrido: razonamiento local/remoto + herramientas deterministas.
