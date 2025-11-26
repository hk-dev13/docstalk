"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

interface LiquidTextProps {
  text: string;
  className?: string;
  id?: string;
}

export function LiquidText({
  text,
  className = "",
  id = "liquid-text",
}: LiquidTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Get actual dimensions
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, [text, className]);

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(dimensions.width, dimensions.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create texture from text
    const textCanvas = document.createElement("canvas");
    const ctx = textCanvas.getContext("2d")!;

    // Set canvas size based on actual dimensions
    textCanvas.width = dimensions.width * 2; // Higher resolution
    textCanvas.height = dimensions.height * 2;

    // Extract font size from className - look for viewport units too
    const vwMatch = className.match(/text-\[(\d+)vw\]/);
    const xlMatch = className.match(/text-(\d+)xl/);

    let baseFontSize;
    if (vwMatch) {
      // Convert vw to pixels
      const vwValue = parseInt(vwMatch[1]);
      baseFontSize = (vwValue / 100) * window.innerWidth;
    } else if (xlMatch) {
      baseFontSize = parseInt(xlMatch[1]) * 24;
    } else {
      baseFontSize = 120; // Larger default
    }

    ctx.font = `bold ${baseFontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);

    const texture = new THREE.CanvasTexture(textCanvas);
    texture.needsUpdate = true;

    // Vertex Shader
    const vertexShader = `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // Fragment Shader - Fog/Mist Effect
    const fragmentShader = `
      uniform sampler2D uTexture;
      uniform vec2 uMouse;
      uniform float uTime;
      uniform vec2 uResolution;
      
      varying vec2 vUv;
      
      // Multi-octave noise for organic fog
      float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }
      
      // Improved fractal noise for turbulence
      float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for(int i = 0; i < 4; i++) {
          value += amplitude * noise(st * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      // Smooth voronoi-like pattern for fog
      float fogPattern(vec2 uv, float time) {
        vec2 p = uv * 3.0;
        float n = fbm(p + time * 0.1);
        n += fbm(p * 2.0 - time * 0.15) * 0.5;
        return n;
      }
      
      void main() {
        vec2 uv = vUv;
        vec2 originalUv = vUv;
        
        // Calculate distance from mouse to current pixel
        vec2 mousePos = uMouse / uResolution;
        mousePos.y = 1.0 - mousePos.y; // Flip Y
        
        float dist = distance(uv, mousePos);
        vec2 direction = normalize(uv - mousePos); // Declare outside if-block
        
        // 🌫️ FOG PARAMETERS
        float fogRadius = 0.35;
        float fogStrength = 0.8;
        
        // Soft circular falloff for fog
        float fogMask = 1.0 - smoothstep(0.0, fogRadius, dist);
        fogMask = pow(fogMask, 2.0); // Soft edges
        
        if (fogMask > 0.01) {
          // 🌀 TURBULENT FOG DISTORTION
          vec2 noiseUv = uv * 5.0 + uTime * 0.2;
          float turbulence = fbm(noiseUv);
          
          // Multiple layers of fog movement
          vec2 fogDistort1 = vec2(
            fbm(uv * 3.0 + uTime * 0.3 + vec2(100.0, 0.0)),
            fbm(uv * 3.0 + uTime * 0.3 + vec2(0.0, 100.0))
          ) - 0.5;
          
          vec2 fogDistort2 = vec2(
            fbm(uv * 6.0 - uTime * 0.2),
            fbm(uv * 6.0 - uTime * 0.2 + vec2(50.0, 50.0))
          ) - 0.5;
          
          // Apply swirling distortion
          uv += fogDistort1 * fogMask * 0.04;
          uv += fogDistort2 * fogMask * 0.02;
          
          // Radial distortion (pulling towards/away from mouse)
          float radialPull = sin(uTime * 2.0 + dist * 10.0) * fogMask;
          uv += direction * radialPull * 0.015;
          
          // Organic warping
          float warp = fogPattern(uv, uTime);
          uv += vec2(
            sin(warp * 6.28 + uTime) * fogMask * 0.01,
            cos(warp * 6.28 - uTime) * fogMask * 0.01
          );
        }
        
        // 💨 SAMPLE TEXTURE WITH FOG DISTORTION
        vec4 color = texture2D(uTexture, uv);
        
        // 🌫️ FOG COLOR & ALPHA BLENDING
        vec3 fogColor = vec3(0.6, 0.65, 0.8); // Cool fog tint
        
        // Animated fog density
        float fogDensity = fogMask * (0.3 + 0.2 * sin(uTime * 1.5 + dist * 8.0));
        
        // Mix original color with fog
        color.rgb = mix(color.rgb, fogColor, fogDensity * 0.4);
        
        // 🌟 SUBTLE FOG GLOW
        float fogGlow = fogMask * (0.5 + 0.3 * sin(uTime * 3.0));
        fogGlow = pow(fogGlow, 3.0);
        color.rgb += fogGlow * vec3(0.4, 0.5, 0.7) * 0.3;
        
        // ✨ FLOATING PARTICLES IN FOG
        float particles = noise(uv * 100.0 + uTime * 5.0);
        particles *= noise(uv * 50.0 - uTime * 3.0);
        particles = smoothstep(0.8, 1.0, particles);
        color.rgb += particles * fogMask * vec3(0.8, 0.9, 1.0) * 0.5;
        
        // 🌀 CHROMATIC ABERRATION (subtle in fog)
        float ca = fogMask * 0.005;
        vec2 caOffset = direction * ca;
        float r = texture2D(uTexture, uv + caOffset).r;
        float b = texture2D(uTexture, uv - caOffset).b;
        color.r = mix(color.r, r, fogMask * 0.5);
        color.b = mix(color.b, b, fogMask * 0.5);
        
        // 💫 EDGE SOFTENING (fog dissipation)
        float edge = smoothstep(fogRadius * 0.7, fogRadius, dist);
        float edgeFade = 1.0 - edge;
        color.rgb = mix(color.rgb, texture2D(uTexture, originalUv).rgb, edge * 0.5);
        
        gl_FragColor = color;
      }
    `;

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 },
        uResolution: {
          // Use CSS dimensions to match mouse coordinate space
          value: new THREE.Vector2(dimensions.width, dimensions.height),
        },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
    });

    // Create plane geometry - match the aspect ratio of the text container
    const aspectRatio = dimensions.width / dimensions.height;
    // Fit the plane to camera view (-1 to 1 = 2 units total)
    const planeHeight = 2.0; // Fill vertical space
    const planeWidth = planeHeight * aspectRatio; // Match aspect ratio perfectly
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Convert mouse position directly to UV space (0-1)
      // No need to scale by pixel ratio - shader will handle it
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    // Animation loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.1;
      mouseY += (targetMouseY - mouseY) * 0.1;

      material.uniforms.uMouse.value.set(mouseX, mouseY);
      material.uniforms.uTime.value = clock.getElapsedTime();

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener("mousemove", handleMouseMove);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, [text, className, dimensions]);

  return (
    <div
      ref={containerRef}
      className="relative inline-block min-h-[1em]" // penting
    >
      <h1 className={`${className} invisible`} aria-hidden="true">
        {text}
      </h1>

      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-auto"
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
      />
    </div>
  );
}
