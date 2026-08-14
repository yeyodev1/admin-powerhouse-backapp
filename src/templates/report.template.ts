import { IAssessment } from "../models/assessment.model";
import { LEVEL_LABELS } from "../services/assessment.service";
import { PHB_LOGO_DATA_URI } from "./logo.asset";

const SCALE_LABELS: Record<number, string> = {
  0: "Nunca / No",
  1: "Ocasional o leve",
  2: "Frecuente o moderado",
  3: "Persistente / En tratamiento",
};

const LEVEL_COLORS: Record<string, string> = {
  optimo: "#18e7f0",
  vigilancia: "#f0c419",
  alerta: "#ff8a3d",
  prioritario: "#ff5a6e",
  sin_datos: "rgba(255,255,255,0.35)",
};

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date?: Date): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

const BASE_STYLES = `
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;background:#283645;color:#fff;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;
    background-image:radial-gradient(at 20% 15%,rgba(23,24,70,.85) 0%,transparent 75%),radial-gradient(at 85% 10%,rgba(33,188,251,.16) 0%,transparent 60%),radial-gradient(at 90% 90%,rgba(18,120,243,.16) 0%,transparent 65%);
    background-attachment:fixed}
  .wrap{max-width:820px;margin:0 auto;padding:28px 20px 72px}
  .brand{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:28px}
  .brand__logo{height:38px;width:auto;display:block}
  .brand__date{font-size:12px;color:rgba(255,255,255,.5);letter-spacing:.06em;text-transform:uppercase}
  .card{background:rgba(30,34,96,.62);border:1px solid rgba(33,188,251,.16);border-radius:18px;padding:26px;margin-bottom:18px;backdrop-filter:blur(6px)}
  h1{font-family:'Outfit',sans-serif;font-size:clamp(24px,4.6vw,34px);line-height:1.18;margin:0 0 8px;font-weight:800}
  h2{font-family:'Outfit',sans-serif;font-size:19px;margin:0;font-weight:700}
  .muted{color:rgba(255,255,255,.66);font-size:14px;margin:0}
  .hero__meta{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:16px;font-size:14px;color:rgba(255,255,255,.72)}
  .hero__meta i{color:#21bcfb;font-style:normal}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:22px}
  .stat{background:rgba(23,24,70,.6);border:1px solid rgba(33,188,251,.14);border-radius:14px;padding:14px 16px}
  .stat__v{font-family:'Outfit',sans-serif;font-size:26px;font-weight:800;line-height:1.1}
  .stat__l{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-top:4px}
  .bar{height:9px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden}
  .bar__fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#1278f3,#21bcfb,#18e7f0)}
  .chip{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;padding:4px 11px;border-radius:99px;border:1px solid currentColor}
  .sec{border-top:1px solid rgba(255,255,255,.08);padding-top:20px;margin-top:20px}
  .sec:first-of-type{border-top:0;padding-top:0;margin-top:0}
  .sec__head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:10px}
  .sec__score{font-family:'Outfit',sans-serif;font-weight:800;font-size:15px;white-space:nowrap}
  .q{padding:13px 0;border-top:1px dashed rgba(255,255,255,.09)}
  .q:first-of-type{border-top:0}
  .q__top{display:flex;gap:12px;align-items:flex-start}
  .q__val{flex:none;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:800;font-size:15px;border:1px solid currentColor}
  .q__text{font-size:14.5px;margin:0}
  .q__scale{font-size:12px;color:rgba(255,255,255,.5);margin:3px 0 0}
  .q__meta{margin:9px 0 0 46px;font-size:13px;color:rgba(255,255,255,.62)}
  .q__meta b{color:rgba(255,255,255,.86);font-weight:600}
  .cta{text-align:center;background:linear-gradient(140deg,rgba(18,120,243,.24),rgba(33,188,251,.14));border-color:rgba(33,188,251,.3)}
  .cta__btn{display:inline-block;margin-top:16px;padding:15px 30px;border-radius:99px;background:linear-gradient(90deg,#1278f3,#21bcfb);color:#06121f;font-family:'Space Grotesk',sans-serif;font-weight:700;letter-spacing:.06em;text-decoration:none;font-size:14px}
  .perk{display:flex;gap:11px;text-align:left;align-items:flex-start;margin-top:12px;font-size:14px;color:rgba(255,255,255,.8)}
  .perk span{color:#18e7f0;font-weight:800}
  .foot{text-align:center;font-size:12px;color:rgba(255,255,255,.42);margin-top:26px;line-height:1.7}
  .foot a{color:rgba(255,255,255,.62)}
  /* El logo es blanco sobre transparente: al imprimir sobre papel hay que invertirlo */
  .save{display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:11px 20px;border-radius:99px;cursor:pointer;
    background:transparent;border:1px solid rgba(255,255,255,.25);color:rgba(255,255,255,.8);font-size:13px;font-family:inherit}
  .save:hover{border-color:#21bcfb;color:#fff}
  @media print{body{background:#fff;color:#111}.card{background:#fff;border-color:#ddd;color:#111}.brand__logo{filter:invert(1)}.cta,.save{display:none}}
`;

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
<style>${BASE_STYLES}</style>
</head>
<body><div class="wrap">${body}</div></body>
</html>`;
}

export function renderNotFound(): string {
  return shell(
    "Reporte no disponible | PowerHouse Biotech",
    `<div class="brand"><img class="brand__logo" src="${PHB_LOGO_DATA_URI}" alt="PowerHouse Biotech" /></div>
     <div class="card">
       <h1>Este reporte no está disponible</h1>
       <p class="muted">El enlace es incorrecto o el cuestionario aún no fue registrado. Si completaste el cuestionario y no ves tu reporte, escríbenos y lo regeneramos.</p>
       <a class="cta__btn" href="https://powerhousebiotech.com/">IR A POWERHOUSE BIOTECH</a>
     </div>`
  );
}

export function renderReport(assessment: IAssessment): string {
  const bookingUrl =
    process.env.PUBLIC_BOOKING_URL ||
    "https://api.leadconnectorhq.com/widget/booking/Pt4IJuFRDFG2EsbVaZsR";
  const fullName =
    assessment.fullName || `${assessment.nombre} ${assessment.apellido}`.trim() || "Paciente";
  const isComplete = assessment.status === "completed";
  const levelColor = LEVEL_COLORS[assessment.riskLevel] || LEVEL_COLORS.sin_datos;
  const scoreById = new Map(assessment.sectionScores?.map((s) => [s.id, s]) || []);

  const sections = (assessment.catalog || [])
    .map((section) => {
      const score = scoreById.get(section.id);
      const color = LEVEL_COLORS[score?.level || "sin_datos"] || LEVEL_COLORS.sin_datos;

      const questions = section.questions
        .map((question) => {
          const value = assessment.answers?.get(String(question.id));
          if (value === undefined) return "";
          const qColor =
            value >= 3 ? LEVEL_COLORS.prioritario : value === 2 ? LEVEL_COLORS.alerta : value === 1 ? LEVEL_COLORS.vigilancia : LEVEL_COLORS.optimo;
          return `<div class="q">
            <div class="q__top">
              <div class="q__val" style="color:${qColor}">${value}</div>
              <div>
                <p class="q__text">${esc(question.text)}</p>
                <p class="q__scale">${esc(SCALE_LABELS[value] ?? "")}</p>
              </div>
            </div>
            ${
              value > 0 && (question.interpretation || question.biomarkers)
                ? `<div class="q__meta">
                     ${question.interpretation ? `<div><b>Qué sugiere:</b> ${esc(question.interpretation)}</div>` : ""}
                     ${question.biomarkers ? `<div><b>Biomarcadores a revisar:</b> ${esc(question.biomarkers)}</div>` : ""}
                   </div>`
                : ""
            }
          </div>`;
        })
        .join("");

      return `<div class="sec">
        <div class="sec__head">
          <div>
            <h2>${esc(section.title)}</h2>
            <span class="chip" style="color:${color}">${esc(LEVEL_LABELS[score?.level || "sin_datos"] || "")}</span>
          </div>
          <div class="sec__score">${score?.score ?? 0}/${score?.maxScore ?? 0} · ${score?.percent ?? 0}%</div>
        </div>
        <div class="bar"><div class="bar__fill" style="width:${score?.percent ?? 0}%;background:${color}"></div></div>
        ${questions || `<p class="muted" style="margin-top:14px">Sin respuestas registradas en esta sección.</p>`}
      </div>`;
    })
    .join("");

  const priority = (assessment.sectionScores || [])
    .filter((s) => s.level === "prioritario" || s.level === "alerta")
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3);

  const body = `
  <div class="brand">
    <img class="brand__logo" src="${PHB_LOGO_DATA_URI}" alt="PowerHouse Biotech" />
    <div class="brand__date">${esc(formatDate(assessment.completedAt || assessment.updatedAt))}</div>
  </div>

  <div class="card">
    <h1>Mapa de Inteligencia Biológica</h1>
    <p class="muted">Resumen del Cuestionario PHB™ · periodo de referencia: últimos 90 días</p>
    <div class="hero__meta">
      <span><i>◆</i> ${esc(fullName)}</span>
      ${assessment.email ? `<span><i>◆</i> ${esc(assessment.email)}</span>` : ""}
      ${assessment.telefono ? `<span><i>◆</i> ${esc(assessment.telefono)}</span>` : ""}
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat__v">${assessment.answeredCount}/${assessment.totalQuestions}</div>
        <div class="stat__l">Preguntas respondidas</div>
      </div>
      <div class="stat">
        <div class="stat__v" style="color:${levelColor}">${assessment.scorePercent}%</div>
        <div class="stat__l">Carga sintomática</div>
      </div>
      <div class="stat">
        <div class="stat__v" style="color:${levelColor};font-size:19px;padding-top:5px">${esc(LEVEL_LABELS[assessment.riskLevel] || "")}</div>
        <div class="stat__l">Nivel global</div>
      </div>
    </div>

    <div style="margin-top:18px">
      <div class="bar"><div class="bar__fill" style="width:${assessment.percent}%"></div></div>
      <p class="muted" style="margin-top:8px;font-size:13px">${
        isComplete
          ? "Cuestionario completado al 100%."
          : `Cuestionario al ${assessment.percent}%. Complétalo para desbloquear tu cita orientativa y el estudio rápido inicial.`
      }</p>
    </div>

    ${
      priority.length
        ? `<p class="muted" style="margin-top:16px"><b style="color:#fff">Sistemas a revisar primero:</b> ${priority
            .map((s) => esc(s.title))
            .join(" · ")}</p>`
        : ""
    }
  </div>

  <div class="card">${sections || `<p class="muted">Aún no hay respuestas registradas.</p>`}</div>

  <div class="card cta">
    <h2>${isComplete ? "Tu siguiente paso" : "Termina tu cuestionario"}</h2>
    <p class="muted" style="margin-top:8px">${
      isComplete
        ? "Completaste las " + assessment.totalQuestions + " preguntas. Con esto ya puedes agendar tu cita orientativa."
        : "Al llegar al 100% se habilita tu cita orientativa y el primer estudio rápido."
    }</p>
    <div style="max-width:460px;margin:0 auto">
      <div class="perk"><span>✓</span><div><b>Cita orientativa</b> con el equipo PHB para leer tu mapa contigo.</div></div>
      <div class="perk"><span>✓</span><div><b>Primer estudio rápido</b> enfocado en los sistemas que salieron en alerta.</div></div>
      <div class="perk"><span>✓</span><div><b>Ruta personalizada</b> según tu capacidad regenerativa real, no según el promedio.</div></div>
    </div>
    <a class="cta__btn" href="${esc(bookingUrl)}" target="_blank" rel="noopener">AGENDAR MI CITA ORIENTATIVA</a>
    <div>
      <!-- El dialogo de impresion del navegador guarda como PDF en el dispositivo -->
      <button class="save" onclick="window.print()">Guardar como PDF</button>
    </div>
  </div>

  <p class="foot">
    Este documento es un resumen informativo del cuestionario auto-reportado. <b>No constituye un diagnóstico médico</b> ni sustituye la valoración de un profesional de la salud.<br />
    PowerHouse Biotech™ · <a href="https://powerhousebiotech.com/" target="_blank" rel="noopener">powerhousebiotech.com</a>
  </p>`;

  return shell(`Mapa de Inteligencia Biológica · ${fullName}`, body);
}
