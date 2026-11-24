import * as THREE from 'three';
import type { QualityProfile } from './capsuleConstants';

export interface AetherTextures {
  brushedRoughness: THREE.CanvasTexture | null;
  brushedBump: THREE.CanvasTexture | null;
}

export interface AetherMaterials {
  textures: AetherTextures;
  anodizedTitanium: THREE.MeshPhysicalMaterial;
  satinTitanium: THREE.MeshPhysicalMaterial;
  strutTitanium: THREE.MeshPhysicalMaterial;
  fastenerSteel: THREE.MeshStandardMaterial;
  gasketElastomer: THREE.MeshStandardMaterial;
  crownSapphire: THREE.MeshPhysicalMaterial;
  opticalGlass: THREE.MeshPhysicalMaterial;
  glassSpecularCoat: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

function createBrushedGrainTexture(
  baseLevel: number,
  contrast: number,
  seedInit: number
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const width = 256;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = `rgb(${baseLevel},${baseLevel},${baseLevel})`;
  ctx.fillRect(0, 0, width, height);

  let seed = seedInit;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Fine lathe-turned circumferential grain
  for (let y = 0; y < height; y++) {
    const band = Math.max(
      0,
      Math.min(255, Math.floor(baseLevel + (rand() - 0.5) * contrast))
    );
    ctx.fillStyle = `rgb(${band},${band},${band})`;
    ctx.fillRect(0, y, width, 1);

    if (rand() > 0.55) {
      const sx = rand() * width;
      const sw = 30 + rand() * 150;
      const hi = Math.max(
        0,
        Math.min(255, Math.floor(baseLevel + contrast * (0.25 + rand() * 0.45)))
      );
      ctx.fillStyle = `rgba(${hi},${hi},${hi},0.42)`;
      const firstWidth = Math.min(sw, width - sx);
      ctx.fillRect(sx, y, firstWidth, 1);
      if (sx + sw > width) {
        ctx.fillRect(0, y, sx + sw - width, 1);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Attaches an optical Fresnel edge-thickness shader onto MeshPhysicalMaterial when
 * running on low/software fallback without multi-pass WebGL transmission, so the
 * hollow thick borosilicate walls and chamfered rims stay distinctly visible.
 */
function applyOpticalEdgeFresnel(material: THREE.MeshPhysicalMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      float edgeFresnel = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.3);
      vec3 opticalEdgeTint = vec3(0.55, 0.85, 0.94);
      diffuseColor.rgb = mix(diffuseColor.rgb, opticalEdgeTint, edgeFresnel * 0.48);
      diffuseColor.a = clamp(mix(0.16, 0.64, edgeFresnel), 0.14, 0.70);
      totalEmissiveRadiance += opticalEdgeTint * (edgeFresnel * 0.22);
      `
    );
  };
  material.customProgramCacheKey = () => 'aether-optical-glass-fresnel-v2';
}

export function createAetherMaterials(
  profile: QualityProfile,
  isSoftwareGl: boolean
): AetherMaterials {
  const brushedRoughness = createBrushedGrainTexture(175, 72, 1337);
  const brushedBump = createBrushedGrainTexture(128, 60, 4242);

  const anodizedTitanium = new THREE.MeshPhysicalMaterial({
    color: '#364357',
    metalness: 0.86,
    roughness: 0.28,
    anisotropy: isSoftwareGl ? 0 : 0.78,
    anisotropyRotation: 0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.3,
    ...(brushedRoughness ? { roughnessMap: brushedRoughness } : {}),
    ...(brushedBump ? { bumpMap: brushedBump, bumpScale: 0.0024 } : {}),
    envMapIntensity: 1.44,
  });

  const satinTitanium = new THREE.MeshPhysicalMaterial({
    color: '#a6b6cc',
    metalness: 0.94,
    roughness: 0.15,
    anisotropy: isSoftwareGl ? 0 : 0.85,
    anisotropyRotation: 0,
    clearcoat: 0.24,
    clearcoatRoughness: 0.16,
    ...(brushedRoughness ? { roughnessMap: brushedRoughness } : {}),
    envMapIntensity: 1.54,
  });

  const strutTitanium = new THREE.MeshPhysicalMaterial({
    color: '#2c3748',
    metalness: 0.85,
    roughness: 0.32,
    anisotropy: isSoftwareGl ? 0 : 0.6,
    ...(brushedRoughness ? { roughnessMap: brushedRoughness } : {}),
    envMapIntensity: 1.32,
  });

  const fastenerSteel = new THREE.MeshStandardMaterial({
    color: '#8291a6',
    metalness: 0.92,
    roughness: 0.18,
    envMapIntensity: 1.4,
  });

  const gasketElastomer = new THREE.MeshStandardMaterial({
    color: '#11161f',
    metalness: 0.06,
    roughness: 0.82,
    envMapIntensity: 0.5,
  });

  const crownSapphire = new THREE.MeshPhysicalMaterial({
    color: '#0d1b28',
    metalness: 0.05,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    ior: 1.76,
    reflectivity: 0.95,
    transparent: true,
    opacity: 0.86,
    envMapIntensity: 1.5,
  });

  const useTransmission = profile.useTransmission && !isSoftwareGl;

  const opticalGlass = new THREE.MeshPhysicalMaterial({
    color: '#dff2f8',
    metalness: 0.01,
    roughness: 0.09,
    ior: 1.52,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    reflectivity: 0.94,
    envMapIntensity: 1.62,
    side: THREE.DoubleSide,
    depthWrite: false,
    transparent: true,
    ...(useTransmission
      ? {
          transmission: 0.92,
          thickness: 0.95,
          attenuationColor: new THREE.Color('#b6e8ef'),
          attenuationDistance: 2.9,
          opacity: 1,
        }
      : {
          opacity: 0.24,
        }),
  });

  if (!useTransmission) {
    applyOpticalEdgeFresnel(opticalGlass);
  }

  const glassSpecularCoat = new THREE.MeshPhysicalMaterial({
    color: '#f2faff',
    metalness: 0.03,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    ior: 1.52,
    reflectivity: 0.96,
    envMapIntensity: 1.78,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  return {
    textures: {
      brushedRoughness,
      brushedBump,
    },
    anodizedTitanium,
    satinTitanium,
    strutTitanium,
    fastenerSteel,
    gasketElastomer,
    crownSapphire,
    opticalGlass,
    glassSpecularCoat,
    dispose: () => {
      brushedRoughness?.dispose();
      brushedBump?.dispose();
      anodizedTitanium.dispose();
      satinTitanium.dispose();
      strutTitanium.dispose();
      fastenerSteel.dispose();
      gasketElastomer.dispose();
      crownSapphire.dispose();
      opticalGlass.dispose();
      glassSpecularCoat.dispose();
    },
  };
}
