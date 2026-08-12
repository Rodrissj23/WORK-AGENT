// ── Datos de los sistemas ────────────────────────────────────────────
// Reemplazá "url" por el link real de cada proyecto cuando lo tengas
// alojado (GitHub Pages, Apps Script, etc.). Mientras sea "#", el botón
// avisa que todavía no está conectado.

const projects = [
  {
    id: "WH-01",
    name: "Scoring automático",
    description: "Genera y envía el reporte diario de ventas por WhatsApp, filtrado por gerente-broker.",
    status: "desarrollo", // activo | desarrollo | planificado
    url: "#"
  },
  {
    id: "WH-02",
    name: "Mora automatizada",
    description: "Detección y seguimiento automático de casos de mora. Código listo, falta el frontend.",
    status: "desarrollo",
    url: "#"
  },
  {
    id: "WH-03",
    name: "Mini Hub — Prevención",
    description: "Consulta rápida de cuotas y pesos de menores en Prevención Salud.",
    status: "planificado",
    url: "#"
  },
  {
    id: "WH-04",
    name: "Control de liquidaciones",
    description: "Cruza Altas vs. Ventas por cápitas y detecta diferencias en la liquidación mensual. En camino a ser un agente con dependencia propia.",
    status: "activo",
    url: "https://rodrissj23.github.io/control-liquidaciones/"
  },
  {
    id: "WH-05",
    name: "Mi liquidación",
    description: "Dashboard de comisiones: ventas, comisión esperada vs. liquidada y diferencias.",
    status: "activo",
    url: "https://rodrissj23.github.io/DASHBOARD-COMISIONES/"
  }
];

const futureItems = [
  { icon: "✉", name: "Gmail", desc: "Mails y pendientes." },
  { icon: "◷", name: "Calendar", desc: "Eventos y reuniones." },
  { icon: "◌", name: "WhatsApp", desc: "Canal de trabajo." },
  { icon: "✦", name: "Work Assistant", desc: "Unificar todo." }
];

const statusLabel = {
  activo: "ACTIVO",
  desarrollo: "EN DESARROLLO",
  planificado: "PLANIFICADO"
};

// ── Render de proyectos ──────────────────────────────────────────────
const grid = document.querySelector("#projects");
const countEl = document.querySelector("#project-count");

const activos = projects.filter(p => p.status === "activo").length;
const desarrollo = projects.filter(p => p.status === "desarrollo").length;

countEl.textContent = `${projects.length} sistemas`;

projects.forEach(p => {
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `
    <div class="card-top">
      <span class="card-id">${p.id}</span>
      <span class="status-tag ${p.status}">${statusLabel[p.status]}</span>
    </div>
    <h3>${p.name}</h3>
    <p>${p.description}</p>
    <button class="card-open" type="button">Abrir →</button>
  `;
  card.querySelector(".card-open").addEventListener("click", () => {
    if (p.url === "#") {
      alert(`${p.name}\n\nTodavía no está conectado a este Hub.`);
      return;
    }
    window.open(p.url, "_blank", "noopener,noreferrer");
  });
  grid.appendChild(card);
});

// ── Render de "en construcción" ──────────────────────────────────────
const futureRow = document.querySelector("#future");
futureItems.forEach(f => {
  const item = document.createElement("div");
  item.className = "future-item";
  item.innerHTML = `<strong>${f.icon} ${f.name}</strong><span>${f.desc}</span>`;
  futureRow.appendChild(item);
});

// ── Status bar ────────────────────────────────────────────────────────
document.querySelector("#statusbar").innerHTML = `
  <span>proyectos activos: <b>${activos}</b></span>
  <span>en desarrollo: <b>${desarrollo}</b></span>
  <span>última actualización: <b>${new Date().toLocaleDateString("es-AR")}</b></span>
`;

// ── Fecha y reloj ─────────────────────────────────────────────────────
const dayFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long", year: "numeric" });
document.querySelector("#today").textContent = dayFmt.format(new Date());

function tickClock() {
  const clock = document.querySelector("#clock");
  if (clock) clock.textContent = new Date().toLocaleTimeString("es-AR", { hour12: false });
}
tickClock();
setInterval(tickClock, 1000);
