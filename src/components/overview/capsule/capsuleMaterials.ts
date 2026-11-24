import * as THREE from 'three';
import type { QualityProfile } from './capsuleConstants';

export interface AetherTextures {
  brushedRoughness: THREE.CanvasTexture | null;
  brushedBump: THREE.CanvasTexture | null;
  anodizedRoughness: THREE.CanvasTexture | null;
  glassMicroRoughness: THREE.CanvasTexture | null;
}

export interface AetherMaterials {
  textures: AetherTextures;
  anodizedTitanium: THREE.MeshPhysicalMaterial;
  satinTitanium: THREE.MeshPhysicalMaterial;
  polishedChamferTitanium: THREE.MeshPhysicalMaterial;
  strutTitanium: THREE.MeshPhysicalMaterial;
  darkRecessMetal: THREE.MeshStandardMaterial;
  fastenerSteel: THREE.MeshStandardMaterial;
  gasketElastomer: THREE.MeshStandardMaterial;
  crownSapphire: THREE.MeshPhysicalMaterial;
  opticalGlassOuter: THREE.MeshPhysicalMaterial;
  opticalGlassInner: THREE.MeshPhysicalMaterial;
  glassEndRim: THREE.MeshPhysicalMaterial;
  setThemeMode: (themeMode: 'light' | 'dark') => void;
  dispose: () => void;
}

function createBrushedGrainTexture(
  baseLevel: number,
  contrast: number,
  seedInit: number,
  maxAnisotropy: number
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const width = 512;
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

  // Fine lathe-turned circumferential grain + subtle micro-streaks
  for (let y = 0; y < height; y++) {
    const band = Math.max(
      0,
      Math.min(255, Math.floor(baseLevel + (rand() - 0.5) * contrast))
    );
    ctx.fillStyle = `rgb(${band},${band},${band})`;
    ctx.fillRect(0, y, width, 1);

    if (rand() > 0.45) {
      const sx = rand() * width;
      const sw = 40 + rand() * 210;
      const hi = Math.max(
        0,
        Math.min(255, Math.floor(baseLevel + (rand() - 0.38) * contrast * 0.85))
      );
      ctx.fillStyle = `rgba(${hi},${hi},${hi},0.36)`;
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
  texture.repeat.set(4, 3);
  texture.anisotropy = Math.min(4, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

function createBeadBlastTexture(
  baseLevel: number,
  spread: number,
  seedInit: number
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const size = 192;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const img = ctx.createImageData(size, size);
  let seed = seedInit;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < img.data.length; i += 4) {
    const val = Math.max(
      0,
      Math.min(255, Math.round(baseLevel + (rand() - 0.5) * spread))
    );
    img.data[i] = val;
    img.data[i + 1] = val;
    img.data[i + 2] = val;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 4);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Attaches an optical borosilicate Fresnel + vertical softbox highlight shader onto
 * MeshPhysicalMaterial when multi-pass WebGL transmission is disabled (software/low tier).
 * Keeps the central viewing window crystal clear while resolving crisp edge thickness,
 * refractive edge shading on Light backdrops, and bright studio softbox streaks.
 */
function applyOuterGlassShader(
  material: THREE.MeshPhysicalMaterial,
  themeUniform: THREE.IUniform<number>
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uThemeDark = themeUniform;

    shader.vertexShader = `varying vec3 vGlassObjPos;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nvGlassObjPos = position;`
    );

    shader.fragmentShader =
      `
      uniform float uThemeDark;
      varying vec3 vGlassObjPos;
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      vec3 vDir = normalize(vViewPosition);
      vec3 nDir = normalize(normal);
      float ndv = clamp(abs(dot(nDir, vDir)), 0.0, 1.0);
      float fresnelEdge = pow(1.0 - ndv, 2.85);
      float sharpRim = pow(1.0 - ndv, 6.2);

      // Broad studio softbox reflection bands wrapping smoothly across the contoured belly & neck
      vec3 rVec = reflect(-vDir, nDir);
      float az = atan(vGlassObjPos.z, vGlassObjPos.x);
      float keyRibbon = exp(-pow((rVec.x + 0.42) * 3.8, 2.0)) * (0.64 + 0.22 * smoothstep(-0.55, 0.78, rVec.y));
      float fillRibbon = exp(-pow((rVec.x - 0.55) * 6.0, 2.0)) * 0.44;
      float shoulderGlint = exp(-pow((rVec.x + 0.08) * 9.5, 2.0)) * smoothstep(0.12, 0.80, rVec.y) * 0.28;
      float studioStreak = (keyRibbon + fillRibbon + shoulderGlint) * (0.62 + 0.38 * sin(az * 2.0 + 1.0));

      vec3 lightRefractEdge = mix(vec3(0.17, 0.26, 0.38), vec3(0.96, 0.99, 1.0), sharpRim * 0.72);
      vec3 darkRefractEdge = mix(vec3(0.56, 0.82, 0.94), vec3(0.95, 0.99, 1.0), sharpRim * 0.86);
      vec3 edgeColor = mix(lightRefractEdge, darkRefractEdge, uThemeDark);

      diffuseColor.rgb = mix(vec3(0.89, 0.96, 1.0), edgeColor, fresnelEdge * 0.88);
      float centerAlpha = mix(0.022, 0.036, uThemeDark);
      diffuseColor.a = clamp(centerAlpha + fresnelEdge * 0.38 + sharpRim * 0.32 + studioStreak * 0.30, 0.022, 0.78);
      totalEmissiveRadiance += vec3(0.94, 0.98, 1.0) * (studioStreak * 0.28 + sharpRim * mix(0.14, 0.32, uThemeDark));
      `
    );
  };
  material.customProgramCacheKey = () => 'aether-borosilicate-outer-v5';
}

function applyInnerWallGlassShader(
  material: THREE.MeshPhysicalMaterial,
  themeUniform: THREE.IUniform<number>
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uThemeDark = themeUniform;
    shader.fragmentShader = `uniform float uThemeDark;\n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      float ndv = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
      float innerWallBand = pow(1.0 - ndv, 4.9);
      vec3 innerTint = mix(vec3(0.15, 0.25, 0.37), vec3(0.60, 0.86, 0.97), uThemeDark);
      diffuseColor.rgb = innerTint;
      diffuseColor.a = clamp(0.010 + innerWallBand * 0.48, 0.010, 0.52);
      totalEmissiveRadiance += innerTint * (innerWallBand * mix(0.06, 0.25, uThemeDark));
      `
    );
  };
  material.customProgramCacheKey = () => 'aether-borosilicate-inner-v5';
}

export function createAetherMaterials(
  profile: QualityProfile,
  isSoftwareGl: boolean,
  maxAnisotropy = 4,
  initialTheme: 'light' | 'dark' = 'dark'
): AetherMaterials {
  const themeUniform: THREE.IUniform<number> = {
    value: initialTheme === 'dark' ? 1 : 0,
  };

  const brushedRoughness = createBrushedGrainTexture(208, 48, 1337, maxAnisotropy);
  const brushedBump = createBrushedGrainTexture(128, 44, 4242, maxAnisotropy);
  const anodizedRoughness = createBeadBlastTexture(224, 34, 7919);
  const glassMicroRoughness = createBeadBlastTexture(244, 14, 9103);

  // 1. Bead-blasted Grade-5 Slate Titanium chassis (architectural plinth & upper bayonet turret)
  const anodizedTitanium = new THREE.MeshPhysicalMaterial({
    color: '#506078',
    metalness: 0.84,
    roughness: 0.41,
    clearcoat: 0.14,
    clearcoatRoughness: 0.34,
    ...(anodizedRoughness ? { roughnessMap: anodizedRoughness } : {}),
    ...(brushedBump ? { bumpMap: brushedBump, bumpScale: 0.0022 } : {}),
    envMapIntensity: 1.64,
  });

  // 2. Lathe-turned Brushed Satin Titanium collars, spider clevis arms & plinth buttresses
  const satinTitanium = new THREE.MeshPhysicalMaterial({
    color: '#cad6e6',
    metalness: 0.95,
    roughness: 0.165,
    anisotropy: isSoftwareGl ? 0 : 0.85,
    anisotropyRotation: 0,
    clearcoat: 0.28,
    clearcoatRoughness: 0.11,
    ...(brushedRoughness ? { roughnessMap: brushedRoughness } : {}),
    ...(brushedBump ? { bumpMap: brushedBump, bumpScale: 0.0016 } : {}),
    envMapIntensity: 1.7,
  });

  // 3. Specular Mirror-Chamfer Titanium trim bevels & optical crown bezel
  const polishedChamferTitanium = new THREE.MeshPhysicalMaterial({
    color: '#eaf0f9',
    metalness: 0.98,
    roughness: 0.058,
    clearcoat: 0.38,
    clearcoatRoughness: 0.045,
    envMapIntensity: 1.8,
  });

  // 4. Swept Aerospace Buttress Rails (precision brushed gunmetal titanium)
  const strutTitanium = new THREE.MeshPhysicalMaterial({
    color: '#63738a',
    metalness: 0.92,
    roughness: 0.22,
    anisotropy: isSoftwareGl ? 0 : 0.72,
    ...(brushedRoughness ? { roughnessMap: brushedRoughness } : {}),
    ...(brushedBump ? { bumpMap: brushedBump, bumpScale: 0.0015 } : {}),
    envMapIntensity: 1.62,
  });

  // 5. Recessed PVD dark channels & fastener hex socket pockets
  const darkRecessMetal = new THREE.MeshStandardMaterial({
    color: '#19202b',
    metalness: 0.68,
    roughness: 0.54,
    envMapIntensity: 0.92,
  });

  // 6. Machined Stainless Fasteners
  const fastenerSteel = new THREE.MeshStandardMaterial({
    color: '#dce5f2',
    metalness: 0.96,
    roughness: 0.13,
    envMapIntensity: 1.68,
  });

  // 7. Matte Viton Elastomer Compression O-Rings (zero metallic glare vs titanium)
  const gasketElastomer = new THREE.MeshStandardMaterial({
    color: '#12161d',
    metalness: 0.0,
    roughness: 0.9,
    envMapIntensity: 0.38,
  });

  // 8. Smoked Sapphire Crown Optical Window (translucent crystal letting aperture ring read cleanly)
  const crownSapphire = new THREE.MeshPhysicalMaterial({
    color: '#1d3b58',
    metalness: 0.03,
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    ior: 1.76,
    reflectivity: 0.96,
    transparent: true,
    opacity: 0.72,
    envMapIntensity: 1.92,
  });

  // 9. Outer Thick-Wall Borosilicate Chamber
  // Uses optical clearcoat + Schlick Fresnel + studio softbox shader across both GPU
  // and software paths so alpha-transparent backgrounds and transparent inner fluid/particles
  // remain properly depth-sorted without Three.js transmissionRenderTarget 0xffffff washout.
  const opticalGlassOuter = new THREE.MeshPhysicalMaterial({
    color: '#eaf6fb',
    metalness: 0,
    roughness: isSoftwareGl ? 0.06 : 0.042,
    ior: 1.52,
    clearcoat: 1,
    clearcoatRoughness: 0.032,
    reflectivity: 0.96,
    envMapIntensity: isSoftwareGl ? 1.75 : 1.9,
    side: THREE.FrontSide,
    depthWrite: false,
    transparent: true,
    opacity: 0.14,
    ...(glassMicroRoughness ? { roughnessMap: glassMicroRoughness } : {}),
  });
  applyOuterGlassShader(opticalGlassOuter, themeUniform);

  // 10. Inner Glass Bore Wall (concentric inner diameter edge showing 9mm physical wall thickness)
  const opticalGlassInner = new THREE.MeshPhysicalMaterial({
    color: '#d9eff7',
    metalness: 0,
    roughness: 0.05,
    ior: 1.52,
    reflectivity: 0.92,
    envMapIntensity: 1.48,
    side: THREE.BackSide,
    depthWrite: false,
    transparent: true,
    opacity: 0.2,
  });
  applyInnerWallGlassShader(opticalGlassInner, themeUniform);

  // 11. Polished Chamfered Glass Rim Rings (top & bottom glass wall termination highlights)
  const glassEndRim = new THREE.MeshPhysicalMaterial({
    color: '#e2f4fa',
    metalness: 0.05,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    ior: 1.52,
    envMapIntensity: 1.9,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });

  return {
    textures: {
      brushedRoughness,
      brushedBump,
      anodizedRoughness,
      glassMicroRoughness,
    },
    anodizedTitanium,
    satinTitanium,
    polishedChamferTitanium,
    strutTitanium,
    darkRecessMetal,
    fastenerSteel,
    gasketElastomer,
    crownSapphire,
    opticalGlassOuter,
    opticalGlassInner,
    glassEndRim,
    setThemeMode: (themeMode: 'light' | 'dark') => {
      themeUniform.value = themeMode === 'dark' ? 1 : 0;
    },
    dispose: () => {
      brushedRoughness?.dispose();
      brushedBump?.dispose();
      anodizedRoughness?.dispose();
      glassMicroRoughness?.dispose();
      anodizedTitanium.dispose();
      satinTitanium.dispose();
      polishedChamferTitanium.dispose();
      strutTitanium.dispose();
      darkRecessMetal.dispose();
      fastenerSteel.dispose();
      gasketElastomer.dispose();
      crownSapphire.dispose();
      opticalGlassOuter.dispose();
      opticalGlassInner.dispose();
      glassEndRim.dispose();
    },
  };
}
