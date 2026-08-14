import { IStudy } from "../models/study.model";
import { renderMarkdown } from "./markdown";
import { studyFinalContent } from "../services/study.service";
import { PHB_LOGO_DATA_URI } from "./logo.asset";

/**
 * Página pública del estudio: es el link que GHL manda por WhatsApp.
 * Autocontenida (logo embebido, sin assets externos) para que abra rápido
 * dentro del navegador de WhatsApp.
 */

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

const STYLES = `
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;background:#283645;color:#fff;line-height:1.68;
    font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    background-image:radial-gradient(at 18% 12%,rgba(23,24,70,.85) 0%,transparent 72%),radial-gradient(at 88% 8%,rgba(33,188,251,.15) 0%,transparent 58%),radial-gradient(at 92% 92%,rgba(18,120,243,.15) 0%,transparent 62%);
    background-attachment:fixed}
  .wrap{max-width:820px;margin:0 auto;padding:26px 20px 70px}
  .brand{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px}
  .brand__logo{height:36px;width:auto;display:block}
  .brand__date{font-size:12px;color:rgba(255,255,255,.5);letter-spacing:.06em;text-transform:uppercase}
  .card{background:rgba(30,34,96,.62);border:1px solid rgba(33,188,251,.16);border-radius:18px;padding:26px 28px;margin-bottom:18px;backdrop-filter:blur(6px)}
  .hero h1{font-family:'Outfit',sans-serif;font-size:clamp(23px,4.4vw,31px);line-height:1.2;margin:0 0 8px;font-weight:800}
  .hero p{margin:0;color:rgba(255,255,255,.66);font-size:14px}
  .meta{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:15px;font-size:14px;color:rgba(255,255,255,.74)}
  .meta i{color:#21bcfb;font-style:normal}
  .doc h2{font-family:'Outfit',sans-serif;font-size:19px;font-weight:700;margin:30px 0 10px;padding-top:18px;border-top:1px solid rgba(255,255,255,.09);color:#fff}
  .doc h2:first-child{margin-top:0;padding-top:0;border-top:0}
  .doc h3{font-family:'Outfit',sans-serif;font-size:16px;margin:20px 0 8px;color:#21bcfb;font-weight:600}
  .doc p{margin:0 0 13px;color:rgba(255,255,255,.82);font-size:15px}
  .doc strong{color:#fff}
  .doc em{color:rgba(255,255,255,.6)}
  .doc ul,.doc ol{margin:0 0 14px;padding-left:20px;color:rgba(255,255,255,.82);font-size:15px}
  .doc li{margin-bottom:6px}
  .doc hr{border:0;border-top:1px solid rgba(255,255,255,.1);margin:24px 0}
  .doc table{width:100%;border-collapse:collapse;margin:6px 0 18px;font-size:14px;min-width:520px}
  .doc thead th{text-align:left;padding:10px 12px;background:rgba(23,24,70,.7);color:#21bcfb;font-weight:600;
    font-size:11px;letter-spacing:.09em;text-transform:uppercase;border-bottom:1px solid rgba(33,188,251,.22)}
  .doc tbody td{padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.82);vertical-align:top}
  .doc tbody tr:last-child td{border-bottom:0}
  .table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .cta{text-align:center;background:linear-gradient(140deg,rgba(18,120,243,.24),rgba(33,188,251,.14));border-color:rgba(33,188,251,.3)}
  .cta h2{font-family:'Outfit',sans-serif;font-size:19px;margin:0 0 8px}
  .cta p{margin:0;color:rgba(255,255,255,.72);font-size:14px}
  .cta__btn{display:inline-block;margin-top:16px;padding:15px 30px;border-radius:99px;text-decoration:none;font-size:14px;
    background:linear-gradient(90deg,#1278f3,#21bcfb);color:#06121f;font-family:'Space Grotesk',sans-serif;font-weight:700;letter-spacing:.06em}
  .save{display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:11px 20px;border-radius:99px;cursor:pointer;
    background:transparent;border:1px solid rgba(255,255,255,.25);color:rgba(255,255,255,.8);font-size:13px;font-family:inherit}
  .save:hover{border-color:#21bcfb;color:#fff}
  .foot{text-align:center;font-size:12px;color:rgba(255,255,255,.42);margin-top:24px;line-height:1.7}
  .foot a{color:rgba(255,255,255,.62)}
  .pending{text-align:center;padding:44px 20px}
  .pending__dot{width:11px;height:11px;border-radius:50%;background:#21bcfb;display:inline-block;margin-right:7px;animation:pulse 1.3s ease-in-out infinite}
  @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
  @media print{body{background:#fff;color:#111}.card{background:#fff;border-color:#ddd}
    .doc p,.doc li,.doc tbody td{color:#222}.doc h2,.doc strong{color:#000}.brand__logo{filter:invert(1)}
    .doc thead th{background:#eee;color:#111}.cta,.save{display:none}}
  @media (max-width:640px){.wrap{padding:18px 14px 56px}.card{padding:20px 18px}}
`;

function shell(title: string, body: string, refresh = false): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
${refresh ? '<meta http-equiv="refresh" content="12" />' : ""}
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
<style>${STYLES}</style>
</head>
<body><div class="wrap">${body}</div></body>
</html>`;
}

export function renderStudyNotFound(): string {
  return shell(
    "Estudio no disponible | PowerHouse Biotech",
    `<div class="brand"><img class="brand__logo" src="${PHB_LOGO_DATA_URI}" alt="PowerHouse Biotech" /></div>
     <div class="card hero">
       <h1>Este estudio no está disponible</h1>
       <p>El enlace es incorrecto o el estudio fue retirado. Escríbenos y lo regeneramos.</p>
     </div>`
  );
}

export function renderStudy(study: IStudy): string {
  const bookingUrl =
    process.env.PUBLIC_BOOKING_URL ||
    "https://api.leadconnectorhq.com/widget/booking/Pt4IJuFRDFG2EsbVaZsR";
  const name = study.fullName || study.nombre || "Paciente";

  const header = `
  <div class="brand">
    <img class="brand__logo" src="${PHB_LOGO_DATA_URI}" alt="PowerHouse Biotech" />
    <div class="brand__date">${esc(formatDate(study.finishedAt || study.createdAt))}</div>
  </div>`;

  if (study.status !== "ready") {
    const failed = study.status === "failed";
    return shell(
      `Estudio en preparación · ${name}`,
      `${header}
       <div class="card pending">
         <h1 style="font-family:'Outfit',sans-serif;font-size:24px;margin:0 0 10px">
           ${failed ? "No pudimos generar tu estudio" : "Tu estudio se está preparando"}
         </h1>
         <p style="color:rgba(255,255,255,.68);margin:0">
           ${
             failed
               ? "Nuestro equipo ya fue notificado y lo va a regenerar. No necesitas hacer nada."
               : `<span class="pending__dot"></span>${esc(study.stage)} — esta página se actualiza sola.`
           }
         </p>
       </div>`,
      !failed
    );
  }

  const html = renderMarkdown(studyFinalContent(study)).replace(
    /<table>/g,
    '<div class="table-scroll"><table>'
  ).replace(/<\/table>/g, "</table></div>");

  const body = `${header}
  <div class="card hero">
    <h1>Tu Estudio de Inteligencia Biológica</h1>
    <p>Elaborado a partir de tu Cuestionario PHB™ · periodo de referencia: últimos 90 días</p>
    <div class="meta">
      <span><i>◆</i> ${esc(name)}</span>
      <span><i>◆</i> Versión ${study.version}</span>
      <span><i>◆</i> Revisado por el equipo PHB</span>
    </div>
  </div>

  <div class="card doc">${html}</div>

  <div class="card cta">
    <h2>El siguiente paso es medir</h2>
    <p>Este estudio orienta qué biomarcadores revisar primero. En tu cita orientativa lo leemos contigo y definimos el panel.</p>
    <a class="cta__btn" href="${esc(bookingUrl)}" target="_blank" rel="noopener">AGENDAR MI CITA ORIENTATIVA</a>
    <div>
      <!-- Sin generacion de PDF en servidor: el dialogo de impresion del propio
           navegador guarda como PDF y respeta el @media print de esta pagina. -->
      <button class="save" onclick="window.print()">Guardar como PDF</button>
    </div>
  </div>

  <p class="foot">
    Documento confidencial generado para ${esc(name)}.<br />
    PowerHouse Biotech™ · <a href="https://powerhousebiotech.com/" target="_blank" rel="noopener">powerhousebiotech.com</a>
  </p>`;

  return shell(`Estudio de Inteligencia Biológica · ${name}`, body);
}
