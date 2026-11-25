# BioGrow 3D

Generador y simulador interactivo de crecimiento de plantas mediante sistemas-L.
Graficación por Computadora · ESCOM-IPN · 5CV3 · Ago–Dic 2026

**Integrante:** Luis Antonio Sandoval Vargas

## Descripción

BioGrow 3D genera plantas en 3D a partir de gramáticas de reescritura (sistemas-L) y
anima su crecimiento en tiempo real. La cadena generada se interpreta con una tortuga 3D
basada en matrices de transformación jerárquicas; cada segmento se dibuja como un
cilindro con `InstancedMesh` y se ilumina con un shader propio (Lambert / Blinn-Phong).
La escena incluye sombras, texturas procedurales, viento animado en el vertex shader y
un sistema de partículas.

## Tecnologías

- [Three.js](https://threejs.org/) r186 (WebGL)
- GLSL (shaders propios de iluminación y viento)
- JavaScript (módulos ES)
- [Vite](https://vite.dev/) 8 como servidor de desarrollo y empaquetador
- lil-gui (incluido en `three/addons`) para el panel de parámetros

## Instalación y ejecución

Requisitos: Node.js 20.19 o superior (o 22.12+).

```bash
git clone https://github.com/elantonio12/biogrow.git
cd biogrow
npm install
npm run dev        # abre http://localhost:5173
```

Para generar la versión de producción:

```bash
npm run build      # genera la carpeta dist/
npm run preview    # sirve dist/ localmente
```

No se necesitan recursos externos: todas las texturas se generan con código.

## Controles

- Arrastrar: orbitar · rueda: zoom · clic derecho: desplazar
- `Espacio`: pausar / reanudar · `R`: reiniciar el crecimiento
- Panel derecho: especie, parámetros del sistema-L, geometría, animación, viento,
  partículas e iluminación

## Estructura

| Archivo | Qué hace |
|---|---|
| `src/lsystem.js` | Gramática de reescritura: expansión del axioma, reglas deterministas y estocásticas, probabilidad de ramificación |
| `src/species.js` | 5 especies (axioma + reglas + parámetros por defecto) |
| `src/turtle.js` | Interpretación tipo tortuga 3D con matrices 4×4 jerárquicas, tropismo |
| `src/plant.js` | Mallas (cilindros + hojas con InstancedMesh) y animación de crecimiento |
| `src/lighting.js` | Shader GLSL propio: ambiente + Lambert + Blinn-Phong, textura y viento |
| `src/textures.js` | Texturas procedurales de corteza y pasto (Canvas 2D) |
| `src/particles.js` | Sistema de partículas (polen) |
| `src/scene.js` | Escena, cámara, luces, piso, encuadre y cámara de sombras |
| `src/gui.js` | Panel de parámetros (lil-gui) |
| `src/info.js` | Panel de información, errores y medidor de rendimiento |
| `src/main.js` | Punto de entrada: generación, acciones y ciclo de animación |

## Relación con el protocolo

| Objetivo / tema | Implementación |
|---|---|
| Geometría fractal (U. III, 3.2) | `expand()` aplica las reglas *n* veces. El panel muestra el axioma, las reglas, la cadena y el número de símbolos |
| Transformaciones jerárquicas (U. I) | El estado de la tortuga es una matriz `M`. `F`: `M ← M·T(0,l,0)`, giros: `M ← M·R`, y `[ ]` funciona como pila de matrices (padre → hijos). Cada rama se dibuja con `M·S(r,l,r)` |
| Modelado 3D (U. II) | Cilindros para las ramas y planos con forma de hoja, dibujados con `InstancedMesh` |
| Iluminación (U. II) | `I = ka·Ia·C + kd·IL·C·max(N·L,0) + ks·IL·max(N·H,0)^n`, calculada por fragmento. Las normales se transforman con la inversa transpuesta. El brillo de cada hoja depende de su orientación respecto al sol (se puede mover con azimut/elevación) |
| Sombras | Shadow mapping desde la luz direccional, con la cámara de sombras ajustada a la caja de la planta |
| Texturizado (U. II) | Texturas procedurales de corteza y pasto generadas con Canvas 2D; el shader multiplica la textura por el color de cada instancia |
| Animación (U. III, 3.3) | Cada segmento tiene un tiempo de nacimiento `birth` (su distancia en segmentos desde la raíz). Su escala se interpola con `smoothstep(t − birth)`, así la planta crece de la semilla hacia las puntas |
| Animación por vértice | Viento en el vertex shader: desplazamiento proporcional al cuadrado de la altura relativa; las hojas además tiemblan. El mismo cálculo se usa en el material de profundidad para que la sombra se mueva igual |
| Sistemas de partículas | Polen con posición y velocidad por partícula, integración de Euler y reciclaje de partículas |
| Cámaras (U. I) | Proyección en perspectiva + `OrbitControls` + botón para encuadrar la planta |
| Panel de parámetros | Especie, iteraciones, ángulo, probabilidad de ramificación, variación angular, tropismo, semilla, longitud, escala de ramas hijas, grosor, adelgazamiento, hojas, duración, progreso, viento, partículas y parámetros de la luz |
| ≥ 2 especies | Árbol 3D, Planta 3D (regla inicial), Helecho, Arbusto 3D, Hierba estocástica |

### Extras
- **Probabilidad de ramificación**: cada rama `[...]` de una producción se conserva con probabilidad *p*.
- **Modelo de tubería (pipe model)**: el grosor depende de cuántas puntas sostiene cada segmento, `r = r0·(puntas/puntasRaíz)^k`.
- **Tropismo**: después de cada `F`, la dirección se dobla hacia +Y un ángulo `e·|H×U|` (Prusinkiewicz & Lindenmayer, cap. 2).
- **Semilla**: con la misma semilla se genera la misma planta.
- **Rendimiento**: el panel de información muestra FPS, ms por cuadro, llamadas de dibujo y triángulos.

## Evidencias

<!-- Agregar capturas en docs/ y enlazarlas aquí, por ejemplo:
![Árbol 3D](docs/arbol.png)
![Crecimiento](docs/crecimiento.gif) -->

_Pendiente: capturas de cada especie, del crecimiento y del panel de parámetros._

## Uso de herramientas de IA

<!-- Completar: qué herramientas se usaron, para qué partes y cuáles fueron
las contribuciones propias, igual que en la sección del documento técnico. -->

_Pendiente de completar._

## Referencias principales

- P. Prusinkiewicz y A. Lindenmayer, *The Algorithmic Beauty of Plants*. Springer-Verlag, 1990.
- Documentación de Three.js: https://threejs.org/docs/
