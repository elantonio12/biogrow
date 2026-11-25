// =============================================================
//  Modelo de iluminación propio (Unidad II) escrito en GLSL.
//
//  I = ka·Ia·C  +  kd·IL·C·max(N·L, 0)  +  ks·IL·max(N·H, 0)^n
//       ambiente      difusa (Lambert)        especular (Blinn-Phong)
//
//  Se calcula por fragmento (sombreado de Phong). La intensidad de cada
//  hoja depende de su orientación (normal N) respecto a la luz (L).
//  C = color de la instancia × textura (si el material tiene una).
// =============================================================
import * as THREE from 'three';

export const LIGHT_MODELS = { 'Sin iluminación': 0, 'Lambert (difusa)': 1, 'Phong (Blinn-Phong)': 2 };

export function createLightUniforms() {
  return {
    uLightDir:   { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    uLightColor: { value: new THREE.Color(0xffffff) },
    uAmbient:    { value: new THREE.Color(0xcfe0ff) },
    uKa:         { value: 0.35 },
    uKd:         { value: 1.0 },
    uKs:         { value: 0.25 },
    uShininess:  { value: 24 },
    uModel:      { value: 2 },
    // Viento (animación en el vertex shader)
    uTime:       { value: 0 },
    uWind:       { value: 0.5 },
  };
}

// -------------------------------------------------------------
//  Viento: desplazamiento en coordenadas del mundo, proporcional al
//  cuadrado de la altura (la base no se mueve y la copa se mueve más).
//  Las hojas (uFlutter = 1) además tiemblan con una frecuencia mayor.
//  Se usa en el shader de color y en el de profundidad (sombras),
//  para que la sombra se mueva igual que la planta.
// -------------------------------------------------------------
const windGLSL = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  uniform float uFlutter;

  vec3 applyWind(vec3 p) {
    float h = max(p.y, 0.0);
    float sway = uWind * h * h * 0.015;
    p.x += sway * sin(uTime * 1.7 + p.y * 0.6 + p.z * 0.3);
    p.z += sway * 0.6 * cos(uTime * 1.3 + p.y * 0.5 + p.x * 0.3);
    p += uFlutter * uWind * 0.03 * sin(uTime * 7.0 + dot(p, vec3(3.1, 2.3, 1.7)));
    return p;
  }
`;

const vertexShader = /* glsl */ `
  ${windGLSL}
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vColor;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    mat4 inst = mat4(1.0);
    #ifdef USE_INSTANCING
      inst = instanceMatrix;          // matriz de cada rama/hoja
    #endif
    mat4 world = modelMatrix * inst;
    vec4 wp = world * vec4(position, 1.0);
    wp.xyz = applyWind(wp.xyz);
    vPosW = wp.xyz;

    // Las normales se transforman con la inversa transpuesta
    // (necesario porque el escalamiento no es uniforme).
    mat3 nm = transpose(inverse(mat3(world)));
    vNormalW = normalize(nm * normal);

    vColor = vec3(1.0);
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #endif

    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uLightDir;
  uniform vec3 uLightColor;
  uniform vec3 uAmbient;
  uniform float uKa, uKd, uKs, uShininess;
  uniform int uModel;
  uniform sampler2D uMap;
  uniform float uUseMap;
  uniform vec2 uMapRepeat;

  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vColor;
  varying vec2 vUv;

  void main() {
    vec3 N = normalize(vNormalW);
    if (!gl_FrontFacing) N = -N;           // hojas de dos caras
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 C = vColor;
    if (uUseMap > 0.5) C *= texture2D(uMap, vUv * uMapRepeat).rgb;

    vec3 color;
    if (uModel == 0) {
      color = C;
    } else {
      float NdotL = max(dot(N, L), 0.0);
      color = uKa * uAmbient * C + uKd * NdotL * uLightColor * C;
      if (uModel == 2 && NdotL > 0.0) {
        vec3 H = normalize(L + V);
        color += uKs * pow(max(dot(N, H), 0.0), uShininess) * uLightColor;
      }
    }
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Las uniformes de la luz se comparten entre materiales (mismo objeto),
// así que mover el sol actualiza todo. La textura es propia de cada material.
export function createPhongMaterial(uniforms, {
  side = THREE.FrontSide, map = null, mapRepeat = [1, 1], flutter = 0,
} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uFlutter: { value: flutter },
      uMap: { value: map },
      uUseMap: { value: map ? 1 : 0 },
      uMapRepeat: { value: new THREE.Vector2(...mapRepeat) },
    },
    vertexShader,
    fragmentShader,
    side,
  });
}

// Material de profundidad para el mapa de sombras con el mismo viento.
// Se parte del MeshDepthMaterial de Three.js y se reemplaza el paso que
// proyecta el vértice para insertar applyWind() en coordenadas del mundo.
export function createWindDepthMaterial(uniforms, flutter = 0) {
  const material = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWind = uniforms.uWind;
    shader.uniforms.uFlutter = { value: flutter };
    shader.vertexShader = windGLSL + shader.vertexShader.replace(
      '#include <project_vertex>',
      `vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      mvPosition = modelMatrix * mvPosition;
      mvPosition.xyz = applyWind(mvPosition.xyz);
      mvPosition = viewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`
    );
  };
  return material;
}
