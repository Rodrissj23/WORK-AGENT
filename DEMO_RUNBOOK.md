# ZERO — Runbook de demo

Objetivo: mostrar una primera versión funcional de un asistente operativo, no una colección de botones.

## Preparación antes de la demo

1. Abrir WORK AGENT en Chrome y hacer recarga forzada (`Ctrl+F5`).
2. En la PC laboral, iniciar **ZERO Local Core** con `start_zero_windows.bat`.
3. Verificar Gmail local si se quiere mostrar telemetría real.
4. Probar primero por texto. Después probar voz.
5. Mantener la demo corta: 4–5 minutos.

> Importante: para la demo usar el **ZERO Local Core unificado** en el puerto `8765`. No levantar al mismo tiempo `zero_local_bridge.py`, porque ambos intentan usar el mismo puerto.

## Secuencia recomendada

### 1. Preparar contexto

**Comando:** `Zero, modo demo.`

Esperado: limpia solamente el contexto de conversación de las pruebas y conserva la memoria persistente.

### 2. Lenguaje natural + workflow

**Comando:** `Zero, tengo que rendir ventas.`

Esperado: ZERO entiende que el objetivo requiere Puente Digital + Planilla de Ventas Prevención y pide confirmación.

**Respuesta:** `Sí.`

Esperado: abre ambos accesos.

### 3. Contexto

**Comando:** `Abrime la planilla.`

Esperado: si el tema activo es ventas, resuelve que se refiere a Ventas Prevención. Si no tiene contexto suficiente, pide aclaración.

### 4. Mini Hub

**Comando:** `Zero, mujer de 9 años.`

Esperado: devuelve altura y peso de referencia.

**Seguimiento:** `¿Y de 14?`

Esperado: mantiene el contexto del sexo y cambia la edad.

### 5. Memoria de trabajo

**Comando:** `Mañana tengo que revisar Mora.`

Esperado: guarda el objetivo activo.

**Seguimiento:** `Y después tengo que mirar los mails de Prevención.`

Esperado: lo suma como segundo paso del plan.

**Comando:** `¿Qué tenés en mente?`

Esperado: resume el contexto activo sin inventar acciones.

### 6. Gmail

**Comando:** `Zero, ¿tengo mails importantes?`

Esperado: si el núcleo local está conectado, informa el estado real de Gmail. Si no está conectado en ese equipo, lo dice explícitamente.

### 7. Capacidades y diagnóstico

**Comando:** `Zero, ¿qué podés hacer?`

Esperado: explica capacidades reales sin prometer funciones todavía no conectadas.

**Comando:** `Zero, diagnóstico.`

Esperado: informa componentes base cargados y estado de Gmail/Mora/Scoring disponible en ese equipo.

### 8. Accesos rápidos

Probar uno o dos, no todos:

- `Abrí Puente Digital.`
- `Abrí Ceibo.`
- `Abrí Ventas Prevención.`
- `Abrí Mi liquidación.`

## Plan B de voz

El botón **Hablar** usa Whisper local cuando ZERO Local Core está disponible. Si el núcleo local no puede instalarse o arrancar, cerrar cualquier proceso que esté ocupando `127.0.0.1:8765` y usar el reconocimiento de voz de respaldo de Chrome para comandos manuales.

Si cualquier motor de voz falla durante la presentación, escribir exactamente los mismos comandos en el campo de texto. La lógica de ZERO no depende de la voz.

## Python en Windows

Para el núcleo de voz se recomienda Python **3.11, 3.12 o 3.13**. `install_windows.bat` intenta seleccionar automáticamente una de esas versiones. Si la PC solo tiene Python 3.14, el instalador se detiene de forma explícita en lugar de dejar una instalación incompleta.

## Qué no mostrar todavía

- Envío o modificación de mails.
- WhatsApp completo.
- Ejecución remota de Scoring si todavía no está conectada.
- Ejecución automática de Mora sin confirmación.
- Funciones que todavía no hayan sido probadas en la PC laboral.

## Mensaje de producto

ZERO es una capa operativa sobre las herramientas de trabajo existentes: interpreta lenguaje natural, mantiene contexto, centraliza accesos, consulta estados y está preparado para supervisar o ejecutar automatizaciones registradas de forma controlada.
