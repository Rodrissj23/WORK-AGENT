# ZERO — Arquitectura del cerebro

Estado: diseño funcional en implementación.

## Objetivo

ZERO debe evolucionar desde un parser de comandos hacia un asistente con una capa cognitiva separada de sus herramientas. La capa cognitiva interpreta, mantiene contexto, estima confianza, decide si debe responder/preguntar/delegar y registra qué entendió.

No se considera “conciencia” en sentido humano. En este proyecto, conciencia funcional significa: estado interno observable, memoria de trabajo, continuidad entre turnos, foco actual, registro de decisiones y capacidad de explicar qué interpretó.

## Capas

### 1. Percepción
Entradas de voz o texto. Whisper, wake word y normalización viven aquí.

### 2. Interpretación
`cognitive-core.js` clasifica intención, extrae señales disponibles, estima confianza, detecta ambigüedad y desde v0.2 reconoce relaciones con turnos anteriores.

### 3. Memoria de trabajo
Se conservan hasta 24 eventos recientes en almacenamiento local del navegador. Incluye entradas, intención, confianza, foco y acciones delegadas. No guarda credenciales ni contenido laboral sensible por diseño.

Además existe una pila de contexto corta, separada de los eventos, con hasta 8 focos/objetivos recientes. Su función es resolver referencias sin tener que releer toda la conversación.

### 4. Foco y resolución de referencias
ZERO mantiene un foco de conversación simple, por ejemplo `mini_hub`, `mora`, `scoring`, `liquidaciones` o un acceso concreto.

Desde v0.2 detecta:
- continuidad: `y`, `ahora`, `también`, `además`;
- secuencia futura: `después`, `luego`, `a continuación`;
- repetición: `de nuevo`, `otra vez`, `volvelo a abrir`;
- pronombres contextuales: `eso`, `esa`, `ese`, `lo mismo`;
- referencia alternativa: `el otro`, `la otra`.

Las referencias se resuelven contra los focos recientes. Si no existe contexto suficiente, quedan marcadas como ambiguas.

### 5. Metacontrol
ZERO puede responder preguntas como “¿qué entendiste?” o “¿por qué elegiste eso?”. El metacontrol expone la interpretación, el nivel de confianza y, cuando corresponde, qué referencia contextual usó. No revela razonamientos internos privados ni inventa causas.

### 6. Planificador
Pendiente. Recibirá intención + memoria + herramientas disponibles y producirá un plan corto de acciones. La detección de palabras como `después` ya genera una señal de secuencia que este planificador podrá consumir.

Ejemplo futuro: `rendir ventas` -> abrir Prevención -> abrir planilla -> quedar esperando la siguiente instrucción.

### 7. Herramientas
Los módulos actuales son herramientas/fallback y no el cerebro: Mini Hub, Access Registry, Mora, Scoring, Gmail, Drive, control de liquidaciones y motores futuros.

### 8. Ejecutor seguro
Pendiente. Antes de acciones sensibles verificará confianza, ambigüedad y necesidad de confirmación. Abrir una página conocida puede ser automático; enviar, modificar o ejecutar tareas laborales requerirá políticas más estrictas.

Como primer caso controlado, v0.2 permite reutilizar una referencia contextual para volver a abrir un acceso conocido solo si existe una orden explícita de apertura/repetición y el objetivo anterior puede resolverse con seguridad. El resto de la ejecución continúa delegado a la pila estable.

## Política de confianza propuesta

- >= 0.90: interpretación alta; acciones reversibles pueden ejecutarse sin preguntar.
- 0.65–0.89: confianza media; ejecutar solo acciones de bajo riesgo o pedir confirmación según contexto.
- < 0.65: no asumir; pedir aclaración.
- Si dos intenciones quedan a menos de 0.08 de diferencia, marcar como ambiguo.
- Referencias como `el otro` requieren al menos dos contextos distintos recientes; si no, se consideran ambiguas.

## Estado v0.2

Implementado:
- Clasificación inicial de intención.
- Estimación de confianza.
- Detección básica de ambigüedad.
- Foco conversacional.
- Memoria local de hasta 24 eventos.
- Pila de hasta 8 contextos/focos recientes.
- Resolución conservadora de referencias y repeticiones.
- Detección de continuidad y señales de secuencia.
- Registro de última interpretación y última acción.
- `ZERO_BRAIN.snapshot()` con `recentContext` para inspección técnica.
- `ZERO_BRAIN.resolveReference(text)` para diagnóstico y futuras capas.
- Comandos meta como `qué entendiste` y `por qué elegiste eso`, ahora incluyendo contexto referencial.
- Reapertura contextual de accesos conocidos como primer caso de ejecución cognitiva de bajo riesgo.
- Delegación del resto de acciones a la pila estable existente.

## Próximos incrementos

1. Crear catálogo unificado de herramientas con esquema `id / aliases / riesgo / parámetros / execute`.
2. Implementar planificador para tareas encadenadas usando la señal `sequence`.
3. Añadir gestor explícito de ambigüedad y preguntas de aclaración.
4. Conectar resultado real de cada herramienta al registro de acciones.
5. Añadir memoria semántica persistente controlada, separada de la memoria de trabajo.
6. Crear panel de diagnóstico opcional para inspeccionar estado cognitivo durante desarrollo.
7. Validar en navegador los casos de referencia por voz con Whisper y manos libres antes de ampliar acciones automáticas.
