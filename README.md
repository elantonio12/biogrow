# BioGrow 3D

Generador y simulador interactivo de crecimiento de plantas mediante sistemas-L.
Graficación por Computadora · 5CV3 · Ago–Dic 2026

## Ejecutar

```bash
npm install
npm run dev
```

## Estructura

| Archivo | Qué hace |
|---|---|
| `src/lsystem.js` | Gramática de reescritura: expansión del axioma, reglas deterministas y estocásticas, probabilidad de ramificación |
| `src/species.js` | 5 especies (axioma + reglas + parámetros por defecto) |
| `src/turtle.js` | Interpretación tipo tortuga 3D con matrices 4×4 jerárquicas, tropismo |
| `src/plant.js` | Mallas (cilindros + hojas con InstancedMesh) y animación de crecimiento |
| `src/lighting.js` | Shader GLSL propio: ambiente + Lambert + Blinn-Phong |
| `src/main.js` | Escena, cámara orbital, luz, panel de parámetros (lil-gui), ciclo de animación |

## Relación con el protocolo

| Objetivo / tema | Implementación |
|---|---|
| Geometría fractal (U. III, 3.2) | `expand()` aplica las reglas *n* veces. El panel muestra el axioma, las reglas, la cadena y el número de símbolos |
| Transformaciones jerárquicas (U. I) | El estado de la tortuga es una matriz `M`. `F`: `M ← M·T(0,l,0)`, giros: `M ← M·R`, y `[ ]` funciona como pila de matrices (padre → hijos). Cada rama se dibuja con `M·S(r,l,r)` |
| Modelado 3D (U. II) | Cilindros para las ramas y planos con forma de hoja, dibujados con `InstancedMesh` |
| Iluminación (U. II) | `I = ka·Ia·C + kd·IL·C·max(N·L,0) + ks·IL·max(N·H,0)^n`, calculada por fragmento. Las normales se transforman con la inversa transpuesta. El brillo de cada hoja depende de su orientación respecto al sol (se puede mover con azimut/elevación) |
| Animación (U. III, 3.3) | Cada segmento tiene un tiempo de nacimiento `birth` (su distancia en segmentos desde la raíz). Su escala se interpola con `smoothstep(t − birth)`, así la planta crece de la semilla hacia las puntas |
| Cámaras (U. I) | Proyección en perspectiva + `OrbitControls` + botón para encuadrar la planta |
| Panel de parámetros | Especie, iteraciones, ángulo, probabilidad de ramificación, variación angular, tropismo, semilla, longitud, escala de ramas hijas, grosor, adelgazamiento, hojas, duración, progreso y parámetros de la luz |
| ≥ 2 especies | Árbol 3D, Planta 3D (regla inicial), Helecho, Arbusto 3D, Hierba estocástica |

### Extras
- **Probabilidad de ramificación**: cada rama `[...]` de una producción se conserva con probabilidad *p*.
- **Modelo de tubería (pipe model)**: el grosor depende de cuántas puntas sostiene cada segmento, `r = r0·(puntas/puntasRaíz)^k`.
- **Tropismo**: después de cada `F`, la dirección se dobla hacia +Y un ángulo `e·|H×U|` (Prusinkiewicz & Lindenmayer, cap. 2).
- **Semilla**: con la misma semilla se genera la misma planta.

## Controles
- Arrastrar: orbitar · rueda: zoom · clic derecho: desplazar
- `Espacio`: pausar / reanudar · `R`: reiniciar el crecimiento
