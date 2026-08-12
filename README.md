# Work Hub V1

Panel operativo personal: un solo lugar desde donde acceder a todos los
sistemas de trabajo. No hace el trabajo — organiza, muestra y conecta
las herramientas que ya lo hacen.

## Sistemas incluidos (V1)

| ID    | Sistema                    | Estado        |
|-------|-----------------------------|---------------|
| WH-01 | Scoring automático          | En desarrollo |
| WH-02 | Mora automatizada           | En desarrollo |
| WH-03 | Mini Hub — Prevención       | Planificado   |
| WH-04 | Control de liquidaciones    | Activo        |
| WH-05 | Mi liquidación              | Activo        |

## Cómo probarlo local

Abrí `index.html` directamente en el navegador. No necesita servidor.

## Cómo conectar un proyecto real

En `app.js`, cambiá el `url: "#"` de cada objeto en `projects` por el
link real (GitHub Pages, Apps Script Web App, lo que sea). Mientras
diga `"#"`, el botón "Abrir →" avisa que todavía no está conectado.

## Cómo publicarlo (GitHub Pages)

1. Repo → Settings → Pages.
2. Source: rama `main`, carpeta `/root`.
3. Guardar y esperar a que GitHub publique la URL.

## Próximas etapas

1. Conectar cada sistema real.
2. Sumar accesos rápidos a planillas/portales que usás todos los días.
3. Preparar integración con Gmail, Calendar y WhatsApp.
4. Evolucionar hacia Work Assistant → Work JARVIS.
