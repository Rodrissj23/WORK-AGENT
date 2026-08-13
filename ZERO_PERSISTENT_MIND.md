# ZERO Brain v0.3 - Persistent Mind

Estado: arquitectura para implementacion incremental.

## Objetivo
ZERO debe conservar aprendizaje util entre sesiones sin mezclar memoria con ejecucion.

## Principios
- Razonamiento flexible; ejecucion controlada.
- Recordar hechos utiles, no todo el historial.
- Separar memoria de trabajo, semantica, episodica, procedural e identidad.
- No guardar credenciales ni secretos en memoria cognitiva.
- Cada recuerdo tiene origen, fecha, confianza y estado.
- Las inferencias empiezan como candidatas; una correccion puede reemplazar una memoria anterior sin borrar trazabilidad.
- La memoria nunca evita las politicas de seguridad de herramientas.

## Tipos
1. Working: turnos recientes, foco y contexto. Vida corta.
2. Semantic: alias, relaciones entre conceptos, preferencias confirmadas y conocimiento estable del proyecto.
3. Episodic: correcciones, aclaraciones utiles, resultados y errores relevantes con fecha.
4. Procedural: secuencias de trabajo reutilizables y precondiciones.
5. Identity: identidad de ZERO, estilo y reglas de conducta, versionadas aparte.

## Recuerdo minimo
Un recuerdo contiene: id, type, subject, content, source, confidence, created_at, updated_at, last_used_at, use_count, status, tags y evidence.

Sources: explicit_user, tool_result, inference, system.
Status: candidate, confirmed, superseded, forgotten.

## Escritura
ZERO propone memoria ante una preferencia o correccion explicita, una aclaracion reutilizable, un resultado confirmado de herramienta o un patron repetido. Las inferencias nunca nacen confirmadas.

## Recuperacion
Antes de decidir: working memory, semantic confirmada, procedural aplicable, episodios relevantes y por ultimo candidatos como pistas de baja confianza. Se recuperan pocas memorias relevantes, no el historial completo.

## Consolidacion
Puede fusionar duplicados, aumentar confianza por evidencia repetida, detectar contradicciones, convertir patrones en procedimientos y resumir episodios antiguos. No ejecuta herramientas laborales.

## Auditoria
Registrar intencion, memorias recuperadas, herramienta elegida, politica aplicada, decision de preguntar/confirmar/ejecutar/bloquear y resultado real. ZERO puede explicar ese resumen sin exponer razonamiento interno paso a paso.

## Backend objetivo
Persistencia fuera del navegador, inicialmente SQLite detras del servicio local de ZERO. El navegador conserva cache pequeno y tolera backend offline.

API conceptual: memory search/create/update/consolidate, brain state, events y health.

## Migracion
Fase 0: localStorage para working memory.
Fase 1: contrato JS ZERO_MEMORY con adaptador localStorage.
Fase 2: backend local SQLite y adaptador HTTP.
Fase 3: semantic/episodic/procedural al backend.
Fase 4: consolidacion y auditoria.
Fase 5: modelo de razonamiento recibe solo contexto relevante y propone planes; ZERO_AUTONOMY mantiene control de ejecucion.

## Exito v0.3
ZERO puede cerrar y reabrir la interfaz y recuperar conocimiento confirmado, distinguir recuerdos de inferencias, corregir memoria con trazabilidad y evitar que una memoria autorice por si sola una accion sensible.
