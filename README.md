# WORK AGENT

Centro operativo personal para reunir automatizaciones, consultas rápidas y alertas de trabajo en una sola interfaz.

## Estado actual

| ID | Sistema | Estado |
|---|---|---|
| WH-01 | Scoring automático | Operativo · reporte L-V 18:00 |
| WH-02 | Mora automatizada | Operativo · motor Python local |
| WH-03 | Mini Hub — Prevención | Operativo · integrado también dentro de WORK AGENT |
| WH-04 | Control de liquidaciones | Operativo |
| WH-05 | Mi liquidación | Operativo |
| WH-06 | Gmail laboral filtrado | En integración |
| WH-07 | Voz / Assistant | En desarrollo activo · Whisper local |

## Voz

Se probó inicialmente Chrome SpeechRecognition y luego OpenAI Transcription API. La API funcionó técnicamente, pero se descartó como motor principal por requerir créditos separados.

La arquitectura actual es:

`micrófono -> faster-whisper local -> parser por entidades -> skill -> respuesta`

El frontend usa `transcription-local.js` y espera el motor local en `http://127.0.0.1:8765`.

## Capacidades actuales

- Abrir Mora, Scoring, Control de liquidaciones y Mi liquidación por comando.
- Resolver Mini Hub directamente sin abrir otra pestaña.
- Interpretar frases naturales de sexo + edad + unidad.
- Memoria contextual corta para Mini Hub.
- Respuesta hablada con TTS del navegador.
- Selector de micrófono.
- Centro de Atención preparado para recibir estados reales de los motores.

## Próximo objetivo

Convertir WORK AGENT de panel de accesos a **asistente operativo real**: cada motor reporta estado, el centro de atención prioriza pendientes y la voz permite consultar/ejecutar tareas sin navegar manualmente.

Ver `ROADMAP.md` para el plan actualizado.
