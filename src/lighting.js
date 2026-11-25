// =============================================================
//  Modelo de iluminación propio (Unidad II) escrito en GLSL.
//
//  I = ka·Ia·C  +  kd·IL·C·max(N·L, 0)  +  ks·IL·max(N·H, 0)^n
//       ambiente      difusa (Lambert)        especular (Blinn-Phong)
//
//  Se calcula por fragmento (sombreado de Phong). La intensidad de cada
//  hoja depende de su orientación (normal N) respecto a la luz (L).
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
  };
}

const vertexShader = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vColor;

  void main() {
    mat4 inst = mat4(1.0);
    #ifdef USE_INSTANCING
      inst = instanceMatrix;          // matriz de cada rama/hoja
    #endif
    mat4 world = modelMatrix * inst;
    vec4 wp = world * vec4(position, 1.0);
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

  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vColor;

  void main() {
    vec3 N = normalize(vNormalW);
    if (!gl_FrontFacing) N = -N;           // hojas de dos caras
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 C = vColor;

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

export function createPhongMaterial(uniforms, { side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side });
}
