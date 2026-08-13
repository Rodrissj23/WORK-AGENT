# ZERO Brain v0.3 — Persistent Mind

## Objetivo

Convertir la memoria temporal del navegador en una memoria persistente, estructurada y auditable que pueda ser usada por un futuro motor de razonamiento sin acoplarlo a la interfaz ni a los motores operativos.

## Principio central

**Razonar puede ser flexible. Ejecutar debe ser controlado. Recordar debe ser selectivo.**

ZERO no debe guardar cada frase para siempre. Debe separar memoria de trabajo, memoria semantica, memoria episodica y estado operativo.

## Flujo objetivo

```text
Voz / texto
   ↓
Percepcion (Whisper)
   ↓
Cerebro / interpretacion
   ↓
Recuperacion de memoria relevante
   ↓
Intencion + contexto + confianza
   ↓
Planner
   ↓
Autonomy Gate
   ├── EXECUTE
   ├── CLARIFY
   ├── CONFIRM
   └── BLOCK
   ↓
Tool Registry
   ↓
Herramientas / motores
   ↓
Resultado
   ↓
Memory Writer + Audit Log
   ↓
Respuesta natural
```

## Tipos de memoria

### 1. Working memory
Estado de la conversacion actual: foco, objetivo activo, pregunta pendiente, plan pendiente, entidades recientes y ultimos turnos. Debe ser pequena y descartable.

### 2. Semantic memory
Conocimiento reutilizable: alias, relaciones entre sistemas, preferencias operativas y patrones aprendidos. Ejemplo: `rendir ventas` se relaciona con el portal de Prevencion.

### 3. Episodic memory
Eventos relevantes de sesiones anteriores. No es un log completo de audio; son hitos resumidos que pueden ayudar a mantener continuidad.

### 4. Operational memory
Estado de herramientas y sistemas: ultima ejecucion, disponibilidad, errores, pendientes y telemetria.

### 5. Decision / audit memory
Registra interpretacion, nivel de confianza, politica aplicada, herramienta elegida, resultado y errores. Sirve para explicar decisiones y auditar calidad.

## Regla de escritura

Una interaccion solo se promueve a memoria persistente cuando cumple al menos una condicion:

- el usuario expresa una preferencia estable;
- se confirma un alias o relacion reutilizable;
- se toma una decision de proyecto u operacion;
- se crea o modifica una tarea pendiente;
- ocurre un error relevante que conviene evitar en el futuro;
- un resultado operativo cambia el estado conocido de un sistema.

Las frases casuales y transcripciones crudas no deben convertirse automaticamente en memoria de largo plazo.

## Recuperacion

Antes de interpretar una orden compleja, el cerebro debe pedir solo la memoria potencialmente relevante al foco actual. No debe cargar toda la memoria en cada turno.

Prioridad:
1. working memory;
2. contexto semantico relacionado con la intencion;
3. estado operativo de las herramientas candidatas;
4. episodios recientes solo si aportan continuidad.

## Identidad y personalidad

La identidad de ZERO debe ser configuracion, no una coleccion de respuestas hardcodeadas. La personalidad controla tono y estilo; nunca reemplaza politica, seguridad ni hechos.

Reglas iniciales:
- natural y directo;
- evita respuestas roboticas o ceremoniales;
- no inventa;
- pregunta si falta un dato importante;
- no repite una pregunta si el contexto ya contiene la respuesta;
- ejecuta acciones seguras cuando la intencion es clara;
- confirma antes de acciones sensibles o irreversibles;
- explica su decision si se le pregunta.

## Backend local objetivo

El servidor local que hoy hospeda Whisper debe evolucionar hacia ZERO Local Core. Endpoints previstos:

```text
GET  /health
POST /transcribe
GET  /memory/snapshot
POST /memory/query
POST /memory/events
POST /memory/learn
GET  /state
POST /state
GET  /audit/recent
```

La primera implementacion puede usar JSON atomico en disco. Cuando la estructura se estabilice, migrar a SQLite manteniendo la misma API.

## Persistencia segura

- escritura atomica: archivo temporal + replace;
- schema_version obligatorio;
- backup antes de migraciones;
- limites de tamano por coleccion;
- timestamps ISO 8601;
- IDs de eventos;
- no guardar secretos, tokens o passwords en memoria cognitiva;
- sanitizar datos sensibles antes de logs de auditoria.

## Integracion con lo existente

Los modulos actuales no se descartan:
- `cognitive-core.js`: interpretacion/contexto;
- `cognitive-planner.js`: planes;
- `cognitive-clarifier.js`: aclaraciones;
- `zero-tools.js`: herramientas;
- `cognitive-policy.js`: politica;
- `cognitive-autonomy.js`: puerta de autonomia;
- `cognitive-state*.js`: estado y observacion.

v0.3 agrega una interfaz de memoria por encima de `localStorage`. Mientras el backend no este disponible, el navegador puede usar un adapter local como fallback.

## Criterios de aceptacion v0.3

1. Reiniciar navegador no elimina preferencias/relaciones aprendidas persistidas en Local Core.
2. ZERO distingue memoria temporal de conocimiento persistente.
3. Puede recuperar una relacion por significado/alias sin recorrer manualmente toda la UI.
4. Toda accion planificada registra decision y resultado.
5. Puede responder `que entendiste` o `por que hiciste eso` usando auditoria reciente.
6. Ninguna herramienta sensible se ejecuta saltando Autonomy Gate.
7. El sistema funciona sin un LLM; un LLM futuro entra como Reasoning Provider, no como ejecutor directo.

## Siguiente etapa

Implementar `Memory Adapter` con dos providers:
- `LocalStorageMemoryProvider` como fallback inmediato;
- `LocalCoreMemoryProvider` via HTTP cuando el servidor local este activo.

Despues conectar recuperacion semantica al planner y recien entonces incorporar un Reasoning Provider local/remoto.
