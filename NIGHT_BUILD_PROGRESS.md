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

---

## 13/08/2026 — Continuidad contextual v0.2

### Revisado antes de modificar
- Últimos commits del repositorio para confirmar que el núcleo v0.1 era el cambio más reciente.
- `cognitive-core.js` v0.1.
- `ZERO_BRAIN_ARCHITECTURE.md`.
- `access-registry.js` para reutilizar únicamente objetivos ya registrados y no inventar URLs.
- `index.html` para conservar el orden de carga y la compatibilidad con la pila existente.

### Cambio implementado
`cognitive-core.js` sube a v0.2 y agrega una pila de contexto corta (hasta 8 focos distintos recientes) además de la memoria de eventos.

Ahora ZERO detecta:
- continuidad: `y`, `ahora`, `también`, `además`;
- secuencia: `después`, `luego`, `a continuación`;
- repetición: `de nuevo`, `otra vez`, `volvelo a abrir`;
- referencias: `eso`, `esa`, `ese`, `lo mismo`;
- alternativa contextual: `el otro`, `la otra`.

También:
- `ZERO_BRAIN.resolveReference(text)` permite inspeccionar cómo resolvió una referencia;
- `ZERO_BRAIN.snapshot()` incorpora `recentContext`;
- el metacontrol explica qué referencia tomó y cuándo detectó una posible secuencia;
- si una frase pide explícitamente reabrir `eso/esa` o repetir una apertura y el último objetivo es un acceso conocido, ZERO puede resolver el alias y delegarlo al `access-registry` existente;
- `el otro` solo se resuelve si existen al menos dos contextos distintos; si no, queda ambiguo.

### Decisión de seguridad arquitectónica
No se implementaron acciones encadenadas todavía. La palabra `después` se registra como señal para el futuro planificador, pero no dispara varias acciones por sí sola.

La única ejecución contextual nueva es reabrir un acceso ya conocido y explícitamente solicitado, porque es reversible y no modifica información laboral.

### Pruebas que quedan para navegador
Estos casos requieren prueba manual con el navegador/Whisper antes de ampliar autonomía:
- `Zero, abrí Drive` → `abrilo de nuevo`.
- `Zero, abrí Gmail` → `volvelo a abrir`.
- después de dos accesos diferentes, probar `abrí el otro` y verificar que seleccione el contexto anterior correcto.
- `abrí Prevención y después la planilla` debe detectar secuencia pero no ejecutar un plan todavía.
- verificar que Mini Hub y sus follow-ups sigan pasando por `conversation-bridge.js` sin regresiones.

### Próximo incremento recomendado
Crear un catálogo unificado de herramientas con metadatos de riesgo y parámetros. Ese catálogo será la base del planificador para que ZERO deje de decidir por coincidencias dispersas y pueda elegir herramientas de forma explícita y auditable.

---

## 13/08/2026 — Catálogo de herramientas + política cognitiva v0.3

### Revisado antes de modificar
- Últimos commits del repositorio para confirmar el estado v0.2.
- `cognitive-core.js` v0.2.
- `access-registry.js` y sus accesos ya conocidos.
- `ZERO_BRAIN_ARCHITECTURE.md` y el siguiente incremento recomendado.
- `index.html` para preservar el orden de carga.

### Cambio implementado
Se agregó `zero-tools.js`, un catálogo descriptivo y auditable de capacidades. Cada herramienta declara:
- `id` y etiqueta humana;
- intenciones compatibles;
- nivel de riesgo (`low`, `medium`, `high`);
- si es reversible;
- si modifica datos;
- si requiere confirmación;
- parámetros requeridos;
- estado de conexión cuando corresponde.

El catálogo incluye capacidades actuales de lectura/apertura (briefing, Mini Hub, accesos, Mora, Scoring y liquidaciones) y deja declaradas, pero desconectadas, acciones futuras sensibles como ejecutar Mora o Scoring.

También se agregó `cognitive-policy.js`. Esta capa combina la clasificación del cerebro con el catálogo y produce una decisión auditable:
1. intención detectada;
2. herramienta candidata;
3. parámetros faltantes;
4. riesgo;
5. política resultante: permitir, pedir confirmación o no ejecutar.

Expone `ZERO_REASONER.inspect(text)` para diagnóstico sin ejecutar acciones.

Ejemplos esperados:
- `ZERO_REASONER.inspect('abrí Drive')` → `open_access`, riesgo bajo, permitido si la confianza es suficiente.
- `ZERO_REASONER.inspect('mujer 9 años')` → `mini_hub_query`, requiere sexo/edad/unidad disponibles en la interpretación.
- una futura intención `run_mora` → herramienta sensible, no conectada y con confirmación obligatoria.

### Decisión de seguridad arquitectónica
El primer intento de catálogo incluía ejecutores y fue bloqueado por la capa de seguridad del conector. Se rediseñó correctamente como **catálogo puramente descriptivo**. Los ejecutores siguen viviendo en los módulos estables existentes.

Esto mantiene una separación fuerte:
- cerebro: entiende;
- catálogo: sabe qué capacidades existen;
- policy: decide si sería seguro actuar;
- ejecutores: siguen aislados y sin autonomía adicional.

### Integración
`index.html` ahora carga `zero-tools.js` antes de `cognitive-core.js` y `cognitive-policy.js` después del núcleo cognitivo. Se incrementó el cache-busting para forzar carga de estos módulos.

### Próximo incremento recomendado
Construir un **planificador en modo simulación** que reciba una frase con secuencia (`después`, `y también`) y produzca una lista ordenada de pasos con herramientas, parámetros, riesgo y política, pero sin ejecutar nada. Después de validar esos planes en navegador, recién conectar ejecución automática de pasos exclusivamente reversibles y de bajo riesgo.
