// =============================================================
//  Sistema-L: gramática de reescritura (Unidad III, tema 3.2)
// =============================================================

// Generador pseudoaleatorio con semilla (mulberry32).
// Con una semilla fija, la misma planta se puede reproducir exactamente.
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Elige una producción para un símbolo.
// La regla puede ser:
//   - un string:  'F[+F]F'                      (determinista)
//   - un arreglo: [{ p: 0.5, to: 'F[+F]' },     (estocástica)
//                  { p: 0.5, to: 'F[-F]' }]
function pickProduction(rule, rng) {
  if (typeof rule === 'string') return rule;
  const r = rng();
  let acc = 0;
  for (const option of rule) {
    acc += option.p;
    if (r < acc) return option.to;
  }
  return rule[rule.length - 1].to; // por errores de redondeo
}

// Probabilidad de ramificación:
// cada rama [ ... ] de primer nivel dentro de la producción se conserva
// con probabilidad p; si no, se elimina completa (hasta su ']' pareja).
export function pruneBranches(production, p, rng) {
  if (p >= 1) return production;
  let out = '';
  let i = 0;
  while (i < production.length) {
    const c = production[i];
    if (c === '[') {
      // buscar el ']' que cierra esta rama
      let level = 0, j = i;
      for (; j < production.length; j++) {
        if (production[j] === '[') level++;
        else if (production[j] === ']' && --level === 0) break;
      }
      if (rng() < p) out += production.slice(i, j + 1);
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

// Expande el axioma aplicando las reglas n veces.
export function expand(axiom, rules, iterations, { rng = makeRng(1), branchProb = 1, maxLength = 1_500_000 } = {}) {
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const symbol of current) {
      next += rules[symbol] !== undefined
        ? pruneBranches(pickProduction(rules[symbol], rng), branchProb, rng)
        : symbol; // símbolos sin regla (+, -, [, ]) se copian igual
    }
    current = next;
    if (current.length > maxLength) {
      throw new Error('La cadena es demasiado larga, reduce las iteraciones');
    }
  }
  return current;
}

// Texto legible de las reglas (para el panel de información)
export function rulesToText(rules) {
  const lines = [];
  for (const [sym, rule] of Object.entries(rules)) {
    if (typeof rule === 'string') lines.push(`${sym} → ${rule}`);
    else for (const o of rule) lines.push(`${sym} →(${o.p.toFixed(2)}) ${o.to}`);
  }
  return lines;
}
