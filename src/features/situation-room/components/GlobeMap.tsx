'use client';
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Crosshair, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NewsItem, CountriesGeoJSON } from "../domain/types";
// GeoJSON country borders - simplified world coordinates
const COUNTRY_BORDERS_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';


type GlobeMapProps = {
  newsData: NewsItem[];
  onSelectNews: (item: NewsItem) => void;

  // if you pass country data in, type it:
  countries?: CountriesGeoJSON;

  // if you track selected country:
  selectedCountryIso2?: string | null;
  onSelectCountry?: (iso2: string | null) => void;
};

export default function GlobeMap({ newsData, onSelectNews, countries, selectedCountryIso2, onSelectCountry }: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeRef = useRef<THREE.Object3D | null>(null);
  const depthGlobeRef = useRef<THREE.Mesh | null>(null);
  const markersRef = useRef<THREE.Object3D[]>([]);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const [isLoadingBorders, setIsLoadingBorders] = useState(true);
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });
  const minZoomDistance = 2.8;
  const maxZoomDistance = 10;
  const defaultZoomDistance = 3.2;

  const latLngToVector3 = (lat: number, lng: number, radius = 1.001) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  };

  const drawCountryBorders = async (globe: THREE.Object3D) => {
    try {
      const response = await fetch(COUNTRY_BORDERS_URL);
      const geojson = await response.json();
      
      const borderMaterial = new THREE.LineBasicMaterial({ 
        color: 0x22d3ee, 
        transparent: true, 
        opacity: 0.4,
        linewidth: 1
      });

      geojson.features.forEach((feature: CountriesGeoJSON["features"][number]) => {
        const geometry = feature.geometry;
        
        const processCoordinates = (coords: number[][]) => {
          if (coords.length < 2) return;
          
          const points: THREE.Vector3[] = [];
          coords.forEach((coord) => {
            if (Array.isArray(coord) && coord.length >= 2) {
              const [lng, lat] = coord;
              if (typeof lat === 'number' && typeof lng === 'number') {
                points.push(latLngToVector3(lat, lng));
              }
            }
          });
          
          if (points.length > 1) {
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(lineGeometry, borderMaterial);
            globe.add(line);
          }
        };

        if (geometry.type === 'Polygon') {
          geometry.coordinates.forEach((ring: number[][]) => processCoordinates(ring));
        } else if (geometry.type === 'MultiPolygon') {
          geometry.coordinates.forEach((polygon: number[][][]) => {
            polygon.forEach((ring: number[][]) => processCoordinates(ring));
          });
        }
      });
      
      setIsLoadingBorders(false);
    } catch (error) {
      console.error('Failed to load country borders:', error);
      setIsLoadingBorders(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const containerEl = containerRef.current;
    let teardown: (() => void) | null = null;
    let initObserver: ResizeObserver | null = null;

    const initGlobe = (rect: DOMRect) => {
      console.log('[GlobeMap] init size', rect.width, rect.height);

      while (containerEl.firstChild) {
        containerEl.removeChild(containerEl.firstChild);
      }

      // Scene setup
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 1000);
      camera.position.z = defaultZoomDistance;
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(rect.width, rect.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.pointerEvents = 'auto';
      renderer.domElement.style.touchAction = 'none';
      containerEl.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Globe
      const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
      const depthMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        depthWrite: true,
        depthTest: true,
        colorWrite: false,
      });
      const depthGlobe = new THREE.Mesh(globeGeometry, depthMaterial);
      depthGlobe.renderOrder = 0;
      scene.add(depthGlobe);
      depthGlobeRef.current = depthGlobe;
      
      const globeMaterial = new THREE.MeshPhongMaterial({
        color: 0x050a05,
        emissive: 0x051005,
        specular: 0x22d3ee,
        shininess: 5,
        transparent: true,
        opacity: 0.95,
      });

      const globe = new THREE.Mesh(globeGeometry, globeMaterial);
      globe.renderOrder = 1;
      scene.add(globe);
      globeRef.current = globe;
      setIsGlobeReady(true);

      // Load country borders
      drawCountryBorders(globe);

      // Grid lines on globe (subtle lat/lng)
      const gridMaterial = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.08 });
      
      // Latitude lines
      for (let i = -60; i <= 60; i += 30) {
        const latRad = (i * Math.PI) / 180;
        const radius = Math.cos(latRad);
        const y = Math.sin(latRad);
        const points = [];
        for (let j = 0; j <= 360; j += 5) {
          const lngRad = (j * Math.PI) / 180;
          points.push(new THREE.Vector3(
            radius * Math.cos(lngRad) * 1.002,
            y * 1.002,
            radius * Math.sin(lngRad) * 1.002
          ));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, gridMaterial);
        globe.add(line);
      }

      // Longitude lines
      for (let i = 0; i < 360; i += 30) {
        const lngRad = (i * Math.PI) / 180;
        const points = [];
        for (let j = -90; j <= 90; j += 5) {
          const latRad = (j * Math.PI) / 180;
          const radius = Math.cos(latRad);
          points.push(new THREE.Vector3(
            radius * Math.cos(lngRad) * 1.002,
            Math.sin(latRad) * 1.002,
            radius * Math.sin(lngRad) * 1.002
          ));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, gridMaterial);
        globe.add(line);
      }

      // Atmosphere glow
      const atmosphereGeometry = new THREE.SphereGeometry(1.1, 64, 64);
      const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
            gl_FragColor = vec4(0.13, 0.83, 0.93, 1.0) * intensity * 0.4;
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      });
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      atmosphere.renderOrder = 1;
      scene.add(atmosphere);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0x22d3ee, 0.8);
      directionalLight.position.set(5, 3, 5);
      scene.add(directionalLight);

      const backLight = new THREE.DirectionalLight(0x1a3a1a, 0.3);
      backLight.position.set(-5, -3, -5);
      scene.add(backLight);

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        
        currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.05;
        currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.05;
        
        globe.rotation.x = currentRotation.current.x;
        globe.rotation.y = currentRotation.current.y;
        if (depthGlobeRef.current) {
          depthGlobeRef.current.rotation.x = currentRotation.current.x;
          depthGlobeRef.current.rotation.y = currentRotation.current.y;
        }

        if (!isDragging.current) {
          targetRotation.current.y += 0.001;
        }

        markersRef.current.forEach((marker: THREE.Object3D) => {
          marker.lookAt(camera.position);
        });

        renderer.render(scene, camera);
      };
      animate();

      // Handle resize
      const handleResize = () => {
        const nextRect = containerEl.getBoundingClientRect();
        if (!nextRect.width || !nextRect.height) return;
        camera.aspect = nextRect.width / nextRect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(nextRect.width, nextRect.height);
      };
      window.addEventListener('resize', handleResize);
      const sizeObserver = new ResizeObserver(() => handleResize());
      sizeObserver.observe(containerEl);

      // Mouse events for rotation
      const handlePointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        isDragging.current = true;
        previousMousePosition.current = { x: e.clientX, y: e.clientY };
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        
        const deltaX = e.clientX - previousMousePosition.current.x;
        const deltaY = e.clientY - previousMousePosition.current.y;
        
        targetRotation.current.y += deltaX * 0.005;
        targetRotation.current.x += deltaY * 0.005;
        targetRotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.current.x));
        
        previousMousePosition.current = { x: e.clientX, y: e.clientY };
      };

      const handleMouseUp = () => {
        isDragging.current = false;
      };

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (!cameraRef.current) return;
        const delta = e.deltaY;
        const nextZoom = cameraRef.current.position.z + delta * 0.002;
        cameraRef.current.position.z = Math.min(maxZoomDistance, Math.max(minZoomDistance, nextZoom));
        cameraRef.current.lookAt(0, 0, 0);
        console.log('[GlobeMap] wheel', delta, cameraRef.current.position.length());
      };

      const canvas = renderer.domElement;
      canvas.addEventListener('pointerdown', handlePointerDown);
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('resize', handleResize);
        sizeObserver.disconnect();
        canvas.removeEventListener('pointerdown', handlePointerDown);
        canvas.removeEventListener('wheel', handleWheel);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        while (containerEl.firstChild) {
          containerEl.removeChild(containerEl.firstChild);
        }
        renderer.dispose();
      };
    };

    const tryInit = () => {
      if (teardown) return;
      const rect = containerEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      teardown = initGlobe(rect);
      if (initObserver) {
        initObserver.disconnect();
        initObserver = null;
      }
    };

    tryInit();

    if (!teardown) {
      initObserver = new ResizeObserver(() => tryInit());
      initObserver.observe(containerEl);
    }

    return () => {
      if (initObserver) {
        initObserver.disconnect();
      }
      if (teardown) {
        teardown();
      }
    };
  }, []);

  // Update markers when news data changes
  useEffect(() => {
    if (!isGlobeReady || !globeRef.current || !newsData.length) return;
    const globe = globeRef.current;

    markersRef.current.forEach((marker: THREE.Object3D) => {
      globe.remove(marker);
    });
    markersRef.current = [];

    let skipped = 0;
    newsData.forEach((news, index) => {
      const lat = Number(news.lat);
      const lng = Number(news.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        skipped += 1;
        return;
      }

      const position = latLngToVector3(lat, lng, 1.03);

      const markerGroup = new THREE.Group();
      markerGroup.position.copy(position);

      let markerColor;
      switch (news.threat_level?.toLowerCase()) {
        case 'critical': markerColor = 0xff0000; break;
        case 'high': markerColor = 0xff8800; break;
        case 'moderate': markerColor = 0xffcc00; break;
        default: markerColor = 0x00ff00;
      }

      // Outer pulsing ring
      const ringGeometry = new THREE.RingGeometry(0.025, 0.04, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: markerColor, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: true,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.renderOrder = 2;
      markerGroup.add(ring);

      // Center dot
      const dotGeometry = new THREE.CircleGeometry(0.018, 32);
      const dotMaterial = new THREE.MeshBasicMaterial({ 
        color: markerColor,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.renderOrder = 2;
      markerGroup.add(dot);

      markerGroup.userData = { news, index };

      markerGroup.renderOrder = 2;
      globe.add(markerGroup);
      markersRef.current.push(markerGroup);
    });

    if (skipped > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[GlobeMap] Skipped ${skipped} news items without valid lat/lng (total ${newsData.length}).`
      );
    }
  }, [isGlobeReady, newsData]);

  // Handle marker clicks
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      if (!rendererRef.current) return;
      const camera = cameraRef.current;
      if (!camera) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      const intersects = raycaster.intersectObjects(markersRef.current, true);
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData.news) {
          obj = obj.parent;
        }
        if (obj.userData.news) {
          onSelectNews(obj.userData.news);
        }
      }
    };

    rendererRef.current.domElement.addEventListener('click', handleClick);
    return () => {
      if (rendererRef.current) {
        rendererRef.current.domElement.removeEventListener('click', handleClick);
      }
    };
  }, [onSelectNews]);

  const handleZoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.max(minZoomDistance, cameraRef.current.position.z - 0.3);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.min(maxZoomDistance, cameraRef.current.position.z + 0.3);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  const handleReset = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z = defaultZoomDistance;
      cameraRef.current.lookAt(0, 0, 0);
    }
    targetRotation.current = { x: 0, y: 0 };
  };

  return (
    <div className="relative w-full h-full bg-[#0d0d0d]/80 backdrop-blur-sm border border-cyan-900/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-[#0a0a0a] to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold tracking-wider text-cyan-400">GLOBAL THREAT MAP</span>
            {isLoadingBorders && (
              <div className="flex items-center gap-1 ml-2">
                <Loader2 className="w-3 h-3 text-cyan-600 animate-spin" />
                <span className="text-[10px] text-cyan-600">Loading borders...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 pointer-events-auto">
            <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-7 w-7 p-0 text-cyan-400 hover:bg-cyan-900/30">
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-7 w-7 p-0 text-cyan-400 hover:bg-cyan-900/30">
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 w-7 p-0 text-cyan-400 hover:bg-cyan-900/30">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Globe container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border border-cyan-900/30 rounded p-3 pointer-events-none">
        <span className="text-[10px] text-cyan-600 tracking-wider block mb-2">THREAT LEVELS</span>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-gray-400">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[10px] text-gray-400">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-[10px] text-gray-400">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-gray-400">Low</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 z-10 text-[10px] text-cyan-600/50 tracking-wider pointer-events-none">
        DRAG TO ROTATE • CLICK MARKERS FOR DETAILS
      </div>
    </div>
  );
}
