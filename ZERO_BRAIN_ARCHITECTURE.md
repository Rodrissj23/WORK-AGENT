# ZERO — Arquitectura del cerebro

Estado: diseño funcional en implementación.

## Objetivo

ZERO debe evolucionar desde un parser de comandos hacia un asistente con una capa cognitiva separada de sus herramientas. La capa cognitiva interpreta, mantiene contexto, estima confianza, propone planes, decide cuándo falta información y registra qué entendió.

No se considera “conciencia” en sentido humano. En este proyecto, conciencia funcional significa: estado interno observable, memoria de trabajo, continuidad entre turnos, foco actual, registro de decisiones y capacidad de explicar qué interpretó.

## Capas

### 1. Percepción
Entradas de voz o texto. Whisper, wake word y normalización viven aquí.

### 2. Interpretación
`cognitive-core.js` clasifica intención, extrae señales disponibles, estima confianza, detecta ambigüedad y reconoce relaciones con turnos anteriores.

### 3. Memoria de trabajo
Se conservan hasta 24 eventos recientes en almacenamiento local del navegador. Incluye entradas, intención, confianza, foco y acciones delegadas. No guarda credenciales ni contenido laboral sensible por diseño.

Además existe una pila de contexto corta con hasta 8 focos/objetivos recientes para resolver referencias sin releer toda la conversación.

### 4. Foco y resolución de referencias
ZERO detecta continuidad (`y`, `ahora`, `también`), secuencia (`después`, `luego`), repetición (`de nuevo`, `otra vez`) y referencias (`eso`, `esa`, `lo mismo`, `el otro`). Si no existe contexto suficiente, la referencia queda ambigua.

### 5. Catálogo de herramientas
`zero-tools.js` describe capacidades sin ejecutarlas. Cada herramienta declara intención compatible, parámetros, nivel de riesgo, reversibilidad, si modifica datos, si requiere confirmación y si está conectada.

Las acciones laborales sensibles futuras pueden estar declaradas como capacidades conocidas pero permanecer desconectadas.

### 6. Política cognitiva
`cognitive-policy.js` combina interpretación + herramienta + confianza + riesgo. Produce una decisión auditable: permitir conceptualmente, pedir confirmación o bloquear.

Esta capa tampoco ejecuta herramientas.

### 7. Planificador
`cognitive-planner.js` ya existe en modo simulación. Divide instrucciones secuenciales en hasta seis pasos, inspecciona cada paso con `ZERO_REASONER` y devuelve herramienta, parámetros, riesgo y política.

El planificador mantiene `executable:false`: todavía no ejecuta secuencias automáticamente.

### 8. Gestor de aclaración
`cognitive-clarifier.js` inspecciona planes simulados y transforma fallos cognitivos en preguntas humanas concretas.

Puede detectar:
- referencias sin resolver (`eso`, `esa`, `lo mismo`);
- interpretación ambigua;
- parámetros faltantes como sexo, edad, unidad o acceso objetivo;
- pasos para los que todavía no existe herramienta.

Ejemplos conceptuales:
- referencia sin contexto -> `¿a qué te referís con “eso”?`
- Mini Hub incompleto -> `me falta la edad` o `si es mujer o varón`.

No ejecuta nada ni modifica el plan original.

### 9. Metacontrol
ZERO puede responder preguntas como “¿qué entendiste?” o “¿por qué elegiste eso?”. Expone interpretación, confianza y referencias usadas sin inventar causas ni revelar razonamiento interno privado.

### 10. Ejecutor seguro
Pendiente. Solo se conectará después de validar planes y aclaraciones en navegador. Las primeras acciones elegibles serán exclusivamente reversibles y de bajo riesgo, como abrir accesos conocidos.

Modificar datos, enviar información o ejecutar motores laborales tendrá políticas más estrictas y confirmación explícita.

## Política de confianza actual

- >= 0.90: confianza alta; una acción reversible y de bajo riesgo puede considerarse apta.
- 0.65–0.89: confianza media; solo bajo riesgo o confirmación según contexto.
- < 0.65: no asumir; aclarar.
- dos intenciones a menos de 0.08: ambiguo.
- referencias alternativas como `el otro` requieren contexto suficiente.

## Estado actual

Implementado:
- clasificación de intención;
- estimación de confianza;
- detección de ambigüedad;
- foco conversacional;
- memoria local de trabajo;
- pila de contexto reciente;
- resolución conservadora de referencias entre turnos;
- catálogo descriptivo de herramientas y riesgo;
- política cognitiva separada;
- planificador secuencial en modo simulación;
- gestor de aclaraciones para planes incompletos;
- metacontrol y explicación de la última interpretación;
- reapertura contextual de accesos conocidos como caso limitado y reversible;
- delegación del resto de la ejecución a la pila estable existente.

## Próximos incrementos

1. Añadir resolución de referencias **entre pasos del mismo plan** sin depender de la memoria global.
2. Hacer que el clarificador participe en una conversación de aclaración de varios turnos y complete el plan original.
3. Conectar resultado real de herramientas al registro cognitivo para distinguir `intenté` de `sucedió`.
4. Añadir memoria semántica persistente controlada, separada de la memoria de trabajo.
5. Crear panel de diagnóstico opcional para inspeccionar snapshot, plan y política durante desarrollo.
6. Validar en navegador con Whisper/manos libres antes de habilitar cualquier ejecución automática de planes.
