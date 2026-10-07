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

// Expande el axioma aplicando las reglas n veces.
export function expand(axiom, rules, iterations, rng = makeRng(1)) {
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const symbol of current) {
      next += rules[symbol] !== undefined
        ? pickProduction(rules[symbol], rng)
        : symbol; // símbolos sin regla (+, -, [, ]) se copian igual
    }
    current = next;
    if (current.length > 2_000_000) {
      throw new Error('La cadena es demasiado larga, reduce las iteraciones');
    }
  }
  return current;
}