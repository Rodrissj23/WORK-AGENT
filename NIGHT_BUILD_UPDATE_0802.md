# ZERO Night Build — Estado cognitivo funcional

## Incremento
Se agregó una máquina de estados funcional separada de la lógica de ejecución.

### Archivos nuevos
- `cognitive-state.js`
- `cognitive-state-observer.js`

### Estados disponibles
- `idle`
- `listening`
- `interpreting`
- `clarifying`
- `planning`
- `confirming`
- `delegating`
- `speaking`
- `error`

## Qué aporta
- ZERO puede registrar en qué fase conversacional/cognitiva está.
- Mantiene una expectativa explícita del próximo turno, por ejemplo una aclaración pendiente.
- Guarda un historial corto de transiciones para auditoría y metacontrol.
- Los estados transitorios no sobreviven a una recarga como si siguieran activos; se recuperan a `idle` salvo contextos persistentes de aclaración/confirmación.
- Si existe una aclaración persistida por `cognitive-clarifier.js`, el observador la reconstruye como estado `clarifying`.
- Agrega metacontrol conversacional para preguntas como `Zero, ¿qué estás haciendo?`, `¿qué estás esperando?` o `¿en qué estado estás?`.

## Seguridad
Este incremento no ejecuta herramientas, no modifica datos laborales, no abre accesos nuevos y no cambia la política de riesgo. Solo observa y describe la pila existente.

## Integración
`index.html` carga ahora, después del router:
1. `cognitive-state.js`
2. `cognitive-state-observer.js`

Se actualizó cache-busting a `20260813-0802`.

## Pruebas recomendadas
1. Recargar con Ctrl+F5 y ejecutar en consola `ZERO_STATE.snapshot()`.
2. Decir `Zero, ¿qué estás haciendo?` y verificar una respuesta de estado.
3. Forzar una aclaración con un plan ambiguo y luego ejecutar `ZERO_STATE.snapshot()`; debería mostrar `clarifying` y una expectativa `clarification`.
4. Resolver o reemplazar la aclaración; debería volver a `idle` y limpiar la expectativa.
5. Recargar durante una aclaración persistida; el observador debería reconstruir `clarifying`.

## Próximo salto recomendado
Crear un modelo de `working memory` semántica con tres niveles: foco activo, contexto reciente y hechos persistentes permitidos. Después integrar un selector de respuesta que use estado + memoria + confianza para decidir entre responder, preguntar, planificar o delegar.
