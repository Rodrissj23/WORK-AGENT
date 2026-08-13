# ROADMAP — WORK AGENT

Actualizado: 12/08/2026

## Fase 1 — Hub operativo ✅
- Unificar accesos a sistemas.
- Integrar Mini Hub.
- Integrar Mora, Scoring, Control de liquidaciones y Mi liquidación.
- Crear Centro de Atención.

## Fase 2 — Assistant layer 🚧
- Parser de comandos por entidades ✅
- Memoria contextual corta ✅
- Respuesta hablada ✅
- Pip de inicio de escucha ✅
- Selector de micrófono ✅
- Whisper local con `faster-whisper` ✅
- Parser de frases naturales (`una mujer de 9 años`) ✅
- Corte automático por silencio ✅
- Wake word local configurable (`Jarvis` por defecto) ✅
- Modo manos libres sin botón ✅
- Activación en una frase (`Jarvis, mujer de 9 años`) ✅
- Activación en dos pasos (`Jarvis` -> pip -> comando) ✅
- Conversación corta estable ⏳

## Fase 3 — Briefing operativo hablado 🚧
- Saludo dinámico según horario ✅
- Comando hablado `¿cómo estamos?` / `briefing` ✅
- Botón manual de briefing ✅
- Gmail -> cantidad de mails laborales importantes pendientes ⏳ fuente real
- Mora -> última ejecución, hora, procesados y errores ⏳ conectar motor
- Scoring -> última ejecución, hora y archivo generado ⏳ conectar trigger
- Centro de Atención -> reemplazar datos estáticos por estados reales 🚧

## Fase 4 — Bus de estado / motores vivos 🚧
- Endpoint local común `GET /status` ✅
- Endpoint `POST /status/mora` ✅
- Endpoint `POST /status/scoring` ✅
- Endpoint `POST /status/gmail` ✅
- Persistencia local `work_agent_status.json` ✅
- WORK AGENT consume estados y actualiza tarjetas ✅
- Mora publica su estado después de cada corrida ⏳
- Scoring publica su estado después de cada trigger ⏳
- Gmail publica pendientes filtrados ⏳
- Historial central de eventos ⏳

## Fase 5 — Canales ⏳
- WhatsApp laboral.
- Extensión de Chrome o launcher local.
- Activación desde segundo plano aunque WORK AGENT no esté visible.

## Fase 6 — WORK JARVIS ⏳
- Preguntas naturales sobre todos los motores.
- Acciones por voz.
- Resumen operativo al iniciar jornada.
- Alertas proactivas.
- Historial central de eventos y decisiones.
- Personalidad/voz configurable.
