# Mora -> ZERO

## Objetivo

Mantener `actualizar_cuotas.py` como motor de negocio y agregar una salida de telemetria local que ZERO pueda leer sin acceder a credenciales ni a la consola.

El script productivo ya filtra filas, consulta Prevencion, calcula estados y actualiza Sheets. No se debe publicar `.env` ni `credenciales_google.json` en este repositorio.

## Archivos locales

Copiar junto a `actualizar_cuotas.py`:

- `zero_telemetry.py`
- `zero_local_bridge.py`

Instalar Flask/CORS en el entorno local:

```bash
pip install flask flask-cors
```

## Contrato de estado

`zero_status.json`:

```json
{
  "systems": {
    "mora": {
      "connected": true,
      "ok": true,
      "ultima_ejecucion": "2026-08-13T15:30:00-03:00",
      "procesados": 120,
      "activos": 90,
      "en_mora": 18,
      "bajas": 4,
      "pendientes_alta": 8,
      "cambios": 22,
      "errores": 0,
      "duracion_segundos": 430
    }
  }
}
```

## Hook minimo para actualizar_cuotas.py

Al comienzo de `main()` crear contadores y registrar inicio. Cada vez que se obtiene `estado`, incrementar el contador correspondiente; cuando `cambio` sea verdadero incrementar `cambios`; en el `except` por DNI incrementar `errores`.

Al finalizar, publicar:

```python
from zero_telemetry import publish

publish(
    "mora",
    ok=(errores == 0),
    ultima_ejecucion=datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
    procesados=procesados,
    activos=activos,
    en_mora=en_mora,
    bajas=bajas,
    pendientes_alta=pendientes_alta,
    cambios=cambios,
    errores=errores,
    duracion_segundos=round(time.time() - inicio_proceso, 1),
)
```

El `return` temprano de "No hay nada para actualizar" tambien debe publicar una ejecucion correcta con `procesados=0`.

## Bridge

Ejecutar en otra terminal:

```bash
python zero_local_bridge.py
```

Probar en Chrome:

```text
http://127.0.0.1:8765/status
```

WORK AGENT ya consulta ese endpoint desde `assistant-status.js` y refresca cada 60 segundos.

## Seguridad

- `.env`, credenciales de Google, cookies y contrasenas permanecen solo en la PC laboral.
- GitHub Pages recibe unicamente estadisticas operativas no secretas desde localhost.
- Las futuras acciones que ejecuten Mora desde ZERO deben requerir confirmacion antes de iniciar el motor.
