# ZERO — Arquitectura del cerebro

Estado: diseño funcional en implementación.

## Objetivo

ZERO debe evolucionar desde un parser de comandos hacia un asistente con una capa cognitiva separada de sus herramientas. La capa cognitiva interpreta, mantiene contexto, estima confianza, decide si debe responder/preguntar/delegar y registra qué entendió.

No se considera “conciencia” en sentido humano. En este proyecto, conciencia funcional significa: estado interno observable, memoria de trabajo, continuidad entre turnos, foco actual, registro de decisiones y capacidad de explicar qué interpretó.

## Capas

### 1. Percepción
Entradas de voz o texto. Whisper, wake word y normalización viven aquí.

### 2. Interpretación
`cognitive-core.js` clasifica intención, extrae señales disponibles, estima confianza y detecta ambigüedad. En v0.1 no reemplaza parsers existentes: los observa.

### 3. Memoria de trabajo
Se conservan hasta 24 eventos recientes en almacenamiento local del navegador. Incluye entradas, intención, confianza, foco y acciones delegadas. No guarda credenciales ni contenido laboral sensible por diseño.

### 4. Foco
ZERO mantiene un foco de conversación simple, por ejemplo `mini_hub`, `mora`, `scoring`, `liquidaciones` o un acceso concreto. Esto servirá para interpretar referencias como “esa”, “ahora el otro” o “abrime la planilla después”.

### 5. Metacontrol
ZERO puede responder preguntas como “¿qué entendiste?” o “¿por qué elegiste eso?”. El metacontrol expone la interpretación y el nivel de confianza sin revelar razonamientos internos privados ni inventar causas.

### 6. Planificador
Pendiente. Recibirá intención + memoria + herramientas disponibles y producirá un plan corto de acciones. Ejemplo: `rendir ventas` -> abrir Prevención -> abrir planilla -> quedar esperando la siguiente instrucción.

### 7. Herramientas
Los módulos actuales son herramientas/fallback y no el cerebro: Mini Hub, Access Registry, Mora, Scoring, Gmail, Drive, control de liquidaciones y motores futuros.

### 8. Ejecutor seguro
Pendiente. Antes de acciones sensibles verificará confianza, ambigüedad y necesidad de confirmación. Abrir una página conocida puede ser automático; enviar, modificar o ejecutar tareas laborales requerirá políticas más estrictas.

## Política de confianza propuesta

- >= 0.90: interpretación alta; acciones reversibles pueden ejecutarse sin preguntar.
- 0.65–0.89: confianza media; ejecutar solo acciones de bajo riesgo o pedir confirmación según contexto.
- < 0.65: no asumir; pedir aclaración.
- Si dos intenciones quedan a menos de 0.08 de diferencia, marcar como ambiguo.

## Estado v0.1

Implementado:
- Clasificación inicial de intención.
- Estimación de confianza.
- Detección básica de ambigüedad.
- Foco conversacional.
- Memoria local de hasta 24 eventos.
- Registro de última interpretación y última acción.
- `ZERO_BRAIN.snapshot()` para inspección técnica.
- Comandos meta como `qué entendiste` y `por qué elegiste eso`.
- Delegación completa a la pila estable existente para no romper comportamiento actual.

## Próximos incrementos

1. Resolver referencias usando foco y memoria (`esa`, `el otro`, `después`).
2. Crear catálogo unificado de herramientas con esquema `id / aliases / riesgo / parámetros / execute`.
3. Implementar planificador para tareas encadenadas.
4. Añadir gestor explícito de ambigüedad y preguntas de aclaración.
5. Conectar resultado real de cada herramienta al registro de acciones.
6. Añadir memoria semántica persistente controlada, separada de la memoria de trabajo.
7. Crear panel de diagnóstico opcional para inspeccionar estado cognitivo durante desarrollo.
