# ZERO Night Build — Progreso

## 13/08/2026 — Núcleo cognitivo v0.1

### Revisado antes de modificar
- `voice-brain.js`: parser por entidades, memoria corta de Mini Hub, duplicados y follow-ups.
- `conversation-bridge.js`: continuidad de conversación.
- `access-registry.js`: accesos por aliases y apertura en pestaña nueva.
- `assistant-status.js`: briefing y estado operativo.
- `startup-briefing.js`: interacción inicial ligada a manos libres.

### Cambio implementado
Se agregó `cognitive-core.js` como una capa nueva y desacoplada. Está cargada al final de `index.html` y no reemplaza la ejecución actual.

Funciones actuales:
- Clasifica intención.
- Asigna confianza numérica.
- Marca interpretaciones ambiguas.
- Mantiene foco conversacional.
- Guarda memoria operativa corta (máximo 24 eventos) en `localStorage`.
- Registra última interpretación y última acción delegada.
- Expone `ZERO_BRAIN.snapshot()` para diagnóstico.
- Responde comandos meta como `qué entendiste` y `por qué elegiste eso`.

### Decisión de seguridad arquitectónica
En v0.1 el cerebro es observador y metacontrolador. Después de interpretar, delega a la pila estable existente. Esto evita que una clasificación nueva rompa Mini Hub, Whisper, wake word, briefing o accesos.

### Reversibilidad
Para volver al comportamiento anterior basta con quitar la carga de `cognitive-core.js` de `index.html`. Ningún motor existente fue reescrito por este incremento.

### Concepto de “conciencia” usado en el proyecto
No se afirma conciencia humana o subjetiva. Se modela una conciencia funcional mediante:
- estado interno,
- foco,
- memoria de trabajo,
- continuidad,
- registro de decisiones,
- capacidad de describir qué interpretó.

### Próximo incremento recomendado
Resolver referencias contextuales sin ejecutar todavía tareas encadenadas. Casos objetivo:
- `abrí Prevención` → `y la planilla también`.
- `mujer de 7 años` → `y de 14`.
- `abrime Drive` → `ahora el mail`.

Después de eso: catálogo unificado de herramientas + planificador.
