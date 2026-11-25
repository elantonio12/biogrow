// =============================================================
//  Panel de información (abajo a la izquierda) y mensajes de error.
//  Muestra el axioma, las reglas, la cadena generada y estadísticas.
// =============================================================
import { rulesToText } from './lsystem.js';

const infoEl = document.getElementById('info-body');
const errorEl = document.getElementById('error');

export function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = msg ? 'block' : 'none';
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// species: { axiom, rules }   info: { str, iterations, segments, leaves, segLen, ms }
export function updateInfo(species, info) {
  const preview = info.str.length > 180 ? info.str.slice(0, 180) + '…' : info.str;
  infoEl.innerHTML = `
    <div class="row"><span>Axioma</span><code>${escapeHtml(species.axiom)}</code></div>
    <div class="rules">${rulesToText(species.rules).map((r) => `<code>${escapeHtml(r)}</code>`).join('')}</div>
    <div class="stats">
      <div><b>${info.iterations}</b><span>iteraciones</span></div>
      <div><b>${info.str.length.toLocaleString('es-MX')}</b><span>símbolos</span></div>
      <div><b>${info.segments.toLocaleString('es-MX')}</b><span>segmentos</span></div>
      <div><b>${info.leaves.toLocaleString('es-MX')}</b><span>hojas</span></div>
    </div>
    <details><summary>Cadena generada</summary><code class="str">${escapeHtml(preview)}</code></details>
    <div class="muted">Segmento base: ${info.segLen.toFixed(3)} · generada en ${info.ms.toFixed(0)} ms</div>
  `;
}

// ---------------------------------------------------------------
// Rendimiento: FPS, tiempo por cuadro, llamadas de dibujo y triángulos.
// Sirve como evidencia en las pruebas (p. ej. FPS contra iteraciones)
// y muestra que InstancedMesh dibuja miles de ramas en pocas llamadas.
// ---------------------------------------------------------------
const perfEl = document.createElement('div');
perfEl.className = 'muted perf';
infoEl.after(perfEl);

let frames = 0;
let elapsed = 0;

// Llamar una vez por cuadro con el tiempo transcurrido (s) y renderer.info
export function updatePerf(dt, renderInfo) {
  frames++;
  elapsed += dt;
  if (elapsed < 0.5) return; // actualizar el texto dos veces por segundo
  const fps = frames / elapsed;
  perfEl.textContent =
    `${fps.toFixed(0)} FPS · ${(1000 / fps).toFixed(1)} ms/cuadro · ` +
    `${renderInfo.calls} draw calls · ${renderInfo.triangles.toLocaleString('es-MX')} triángulos`;
  frames = 0;
  elapsed = 0;
}
