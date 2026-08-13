# ZERO — Runbook de demo

Objetivo: mostrar una primera versión funcional de un asistente operativo, no una colección de botones.

## Preparación antes de la demo

1. Abrir WORK AGENT en Chrome y hacer recarga forzada (`Ctrl+F5`).
2. En la PC laboral, iniciar **ZERO Local Core** con `start_zero_windows.bat`.
3. Iniciar `zero_gmail.py --watch` en la carpeta `ZERO_GMAIL` si se quiere mostrar Gmail actualizado en vivo.
4. Verificar que no esté corriendo `zero_local_bridge.py` al mismo tiempo que ZERO Local Core: ambos usan el puerto `8765`.
5. Escribir `Zero, modo demo.` para limpiar contexto de pruebas sin borrar memoria persistente.
6. Escribir `Zero, diagnóstico.` y revisar el resultado.
7. Probar primero por texto. Después probar voz.
8. Mantener la demo corta: 4–5 minutos.

## Secuencia recomendada

### 1. Preparar contexto

**Comando:** `Zero, modo demo.`

Esperado: limpia solamente el contexto conversacional de las pruebas y conserva la memoria persistente.

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

### 6. Gmail operativo

**Comando:** `Zero, ¿tengo mails importantes?`

Esperado: si el núcleo local está conectado y la lectura es reciente, informa estado real de Gmail. Si la lectura tiene más de 20 minutos, ZERO avisa que está desactualizada en vez de presentar datos viejos como actuales.

Si el cache local nuevo está disponible, se puede probar además:

- `¿De quién?`
- `¿Tengo mails de Javier?`
- `Leeme el último de Prevención.`
- `¿Qué dice?`
- `¿Cuál es el asunto?`

Los detalles se leen desde `zero_gmail_cache.json` en la PC local. No se publican en `/status`.

### 7. Capacidades y diagnóstico

**Comando:** `Zero, ¿qué podés hacer?`

Esperado: explica capacidades reales sin prometer funciones todavía no conectadas.

**Comando:** `Zero, diagnóstico.`

Esperado: informa componentes base cargados y estado de Gmail/Mora/Scoring disponible en ese equipo.

### 8. Seguridad de acciones

**Comando opcional:** `Zero, ejecutá Mora.`

Esperado: ZERO explica que Mora modifica la planilla y que la ejecución automática no se dispara sin integración controlada y confirmación. Puede ofrecer abrir Mora.

**Comando opcional:** `Zero, mandá un mail.`

Esperado: ZERO explica que Gmail está conectado en modo solo lectura y no envía, borra ni modifica correos en esta versión.

Esto demuestra que ZERO diferencia una consulta, una navegación y una acción con impacto.

### 9. Accesos rápidos

Probar uno o dos, no todos:

- `Abrí Puente Digital.`
- `Abrí Ceibo.`
- `Abrí Ventas Prevención.`
- `Abrí Mi liquidación.`

## Plan B de voz

El botón **Hablar** usa Whisper local cuando ZERO Local Core está disponible. Si el núcleo local no puede instalarse o arrancar, cerrar cualquier proceso que esté ocupando `127.0.0.1:8765` y usar el reconocimiento de voz de respaldo de Chrome para comandos manuales.

Si cualquier motor de voz falla durante la presentación, escribir exactamente los mismos comandos en el campo de texto. La lógica de ZERO no depende de la voz.

## Plan B de backend

Si ZERO Local Core no puede arrancar, `zero_local_bridge.py` puede exponer `/status` y la API local de Gmail para mantener funcionando la parte operativa sin Whisper. Se usa **uno u otro**, nunca ambos a la vez, porque comparten el puerto `8765`.

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

La demo debe enfocarse en reducción de pasos manuales y centralización. ZERO no reemplaza los sistemas actuales: los coordina.
