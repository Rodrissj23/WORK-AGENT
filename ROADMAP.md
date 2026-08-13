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
- Corte automático por silencio ⏳
- Conversación corta estable ⏳
- Wake word local sin botón ⏳
- Modo manos libres con ventana de escucha ⏳

## Fase 3 — Briefing operativo hablado 🚧
- Saludo dinámico según horario.
- Resumen hablado al iniciar jornada o al invocar el asistente.
- Gmail -> cantidad de mails laborales importantes pendientes.
- Mora -> última ejecución, hora, registros procesados, errores y cambios detectados.
- Scoring -> confirmar ejecución diaria, hora y archivo generado.
- Centro de Atención -> reemplazar datos estáticos por estados reales.
- Frases objetivo: "Buenas noches, Rodrigo. Tenés 4 mails importantes. Mora se actualizó hoy a las 22:00 sin errores. Scoring generó el reporte de las 18:00."

## Fase 4 — Bus de estado / motores vivos 🚧
- Definir un formato común `status.json` / endpoint local para todos los motores.
- Mora publica su estado después de cada corrida.
- Scoring publica su estado después de cada trigger.
- Gmail publica pendientes filtrados.
- WORK AGENT consume esos estados y arma el briefing.
- Historial central de eventos y últimas ejecuciones.

## Fase 5 — Canales ⏳
- WhatsApp laboral.
- Voz persistente / modo manos libres.
- Extensión de Chrome o launcher local.
- Activación desde segundo plano.

## Fase 6 — WORK JARVIS ⏳
- Preguntas naturales sobre todos los motores.
- Acciones por voz.
- Resumen operativo al iniciar jornada.
- Alertas proactivas.
- Historial central de eventos y decisiones.
- Personalidad/voz configurable.
