# ZERO — Runbook de demo

Objetivo: mostrar una primera versión funcional de un asistente operativo, no una colección de botones.

## Preparación antes de la demo

1. Abrir WORK AGENT en Chrome y hacer recarga forzada (`Ctrl+F5`).
2. En la PC laboral, iniciar ZERO Local Core.
3. Verificar Gmail local si se quiere mostrar telemetría real.
4. Probar primero por texto. Después probar voz.
5. Mantener la demo corta: 4–5 minutos.

## Secuencia recomendada

### 1. Lenguaje natural + workflow

**Comando:** `Zero, tengo que rendir ventas.`

Esperado: ZERO entiende que el objetivo requiere Puente Digital + Planilla de Ventas Prevención y pide confirmación.

**Respuesta:** `Sí.`

Esperado: abre ambos accesos.

### 2. Contexto

**Comando:** `Abrime la planilla.`

Esperado: si el tema activo es ventas, resuelve que se refiere a Ventas Prevención. Si no tiene contexto suficiente, pide aclaración.

### 3. Mini Hub

**Comando:** `Zero, mujer de 9 años.`

Esperado: devuelve altura y peso de referencia.

**Seguimiento:** `¿Y de 14?`

Esperado: mantiene el contexto del sexo y cambia la edad.

### 4. Memoria de trabajo

**Comando:** `Mañana tengo que revisar Mora.`

Esperado: guarda el objetivo activo.

**Seguimiento:** `Y después tengo que mirar los mails de Prevención.`

Esperado: lo suma como segundo paso del plan.

**Comando:** `¿Qué tenés en mente?`

Esperado: resume el contexto activo sin inventar acciones.

### 5. Gmail

**Comando:** `Zero, ¿tengo mails importantes?`

Esperado: si el núcleo local está conectado, informa el estado real de Gmail. Si no está conectado en ese equipo, lo dice explícitamente.

### 6. Accesos rápidos

Probar uno o dos, no todos:

- `Abrí Puente Digital.`
- `Abrí Ceibo.`
- `Abrí Ventas Prevención.`
- `Abrí Mi liquidación.`

## Plan B de voz

El botón **Hablar** usa Whisper local cuando ZERO Local Core está disponible. Si no responde, la capa `voice-fallback.js` intenta usar el reconocimiento de voz de Chrome para comandos manuales.

Si cualquier motor de voz falla durante la presentación, escribir exactamente los mismos comandos en el campo de texto. La lógica de ZERO no depende de la voz.

## Qué no mostrar todavía

- Envío o modificación de mails.
- WhatsApp completo.
- Ejecución remota de Scoring si todavía no está conectada.
- Ejecución automática de Mora sin confirmación.
- Funciones que todavía no hayan sido probadas en la PC laboral.

## Mensaje de producto

ZERO es una capa operativa sobre las herramientas de trabajo existentes: interpreta lenguaje natural, mantiene contexto, centraliza accesos, consulta estados y está preparado para supervisar o ejecutar automatizaciones registradas de forma controlada.
