import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Sets an initial camera position + lookAt target.
 * Runs whenever position/target change (both are stable/memoized).
 */
function InitialCamera({ position, target }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateProjectionMatrix();
  }, [camera, position, target]);

  return null;
}

/**
 * NEW: screen glitch overlay inside the Canvas (cheap fullscreen plane)
 */
function ScreenGlitch({ enabled }) {
  const matRef = useRef(null);

  useFrame(() => {
    if (!enabled || !matRef.current) return;

    // Mostly off, occasionally flicker
    const flicker = Math.random() < 0.08 ? 0.035 + Math.random() * 0.05 : 0.0;
    matRef.current.opacity = flicker;
  });

  if (!enabled) return null;

  return (
    <mesh position={[0, 0, 999]}>
      {/* huge plane; camera sees it as overlay */}
      <planeGeometry args={[5000, 5000]} />
      <meshBasicMaterial
        ref={matRef}
        color={"#ff0000"}
        transparent
        opacity={0.0}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Cheap "fire" background: rising ember particles behind the character.
 */
function FireParticles({ enabled }) {
  const pointsRef = useRef(null);

  const particleCount = 250;
  const positions = useMemo(() => {
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 600;
      const y = Math.random() * 250;
      const z = (Math.random() - 0.5) * 200;
      arr[i * 3 + 0] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!enabled) return;
    const pts = pointsRef.current;
    if (!pts) return;

    const attr = pts.geometry.getAttribute("position");
    const arr = attr.array;

    const t = clock.getElapsedTime();
    const speed = 35;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3 + 1; // y
      arr[idx] += speed * 0.016;

      if (arr[idx] > 300) {
        arr[idx] = 0;
        arr[i * 3 + 0] = (Math.random() - 0.5) * 600;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 200;
      }
    }

    attr.needsUpdate = true;

    const pulse = 0.9 + 0.1 * Math.sin(t * 6.0);
    pts.scale.set(pulse, pulse, pulse);
  });

  if (!enabled) return null;

  return (
    <group position={[0, 100, -350]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={"#ff7a18"}
          size={10}
          sizeAttenuation
          transparent
          opacity={0.9}
        />
      </points>
    </group>
  );
}

/**
 * Loads the GLB and controls head spin + head tilts + (optional) lasers/horns.
 * NEW: head tilts + shadow face flicker support when evilMode is on.
 */
function BusinessManAnimated({
  onTarget,
  isTalking,
  laserMode,
  hornMode,
  headSpinToken,
  evilMode,
}) {
  const headBone = useRef(null);
  const spin = useRef({ active: false, start: 0, duration: 1.2, baseY: 0 });

  // NEW: head tilt twitch controller
  const tilt = useRef({ active: false, start: 0, duration: 0.12, baseZ: 0, delta: 0 });

  const group = useRef(null);
  const { scene, animations } = useGLTF("/models/business_man.glb");
  const { actions, names } = useAnimations(animations, group);

  // NEW: shadow face flicker state
  const shadow = useRef({
    active: false,
    endAt: 0,
    cached: false,
    originals: new Map(), // material -> { color, emissive, emissiveIntensity }
  });

  // ---- Laser eyes anchored to actual eye bones (WORLD space) ----
  const { camera } = useThree();
  const eyeL = useRef(null);
  const eyeR = useRef(null);
  const beamL = useRef(null);
  const beamR = useRef(null);
  const eyeMarkerL = useRef(null);
  const eyeMarkerR = useRef(null);

  // ---- Devil horns anchored to face/head bone (WORLD space) ----
  const faceBone = useRef(null);
  const hornL = useRef(null);
  const hornR = useRef(null);

  useEffect(() => {
    if (!scene) return;

    const head = scene.getObjectByName("Head_06");
    if (!head) {
      console.warn("Couldn't find Head_06 in scene.");
      return;
    }

    headBone.current = head;
    spin.current.baseY = head.rotation.y;
    tilt.current.baseZ = head.rotation.z;
    console.log("✅ Head bone set:", head.name);
  }, [scene]);

  // Start head spin when token changes
  useEffect(() => {
    if (!headBone.current) return;

    spin.current.active = true;
    spin.current.start = performance.now();
    spin.current.baseY = headBone.current.rotation.y;
  }, [headSpinToken]);

  useEffect(() => {
    if (!scene) return;

    const l = scene.getObjectByName("Eye_L_015");
    const r = scene.getObjectByName("Eye_R_016");

    if (!l || !r) {
      console.warn("Could not find eye bones Eye_L_015 / Eye_R_016 in scene.");
      return;
    }

    eyeL.current = l;
    eyeR.current = r;
  }, [scene]);

  useEffect(() => {
    if (!scene) return;

    const face = scene.getObjectByName("Face_011");
    if (face) {
      faceBone.current = face;
      return;
    }

    const l = scene.getObjectByName("Eye_L_015");
    if (l?.parent) {
      faceBone.current = l.parent;
      return;
    }

    console.warn("Could not find Face_011 (or eye parent) for horns.");
  }, [scene]);

  // Cache material originals once
  useEffect(() => {
    if (!scene) return;
    if (shadow.current.cached) return;

    scene.traverse((obj) => {
      const m = obj.material;
      if (!m) return;

      // handle arrays of materials too
      const mats = Array.isArray(m) ? m : [m];
      for (const mat of mats) {
        if (!mat) continue;
        if (shadow.current.originals.has(mat)) continue;

        shadow.current.originals.set(mat, {
          color: mat.color ? mat.color.clone() : null,
          emissive: mat.emissive ? mat.emissive.clone() : null,
          emissiveIntensity:
            typeof mat.emissiveIntensity === "number" ? mat.emissiveIntensity : null,
        });
      }
    });

    shadow.current.cached = true;
  }, [scene]);

  // Update beams each frame in WORLD coordinates + head spin + evil effects
  useFrame(() => {
    // ---------- lasers ----------
    if (laserMode) {
      if (!eyeL.current || !eyeR.current) return;

      const tmpPos = new THREE.Vector3();
      const tmpDir = new THREE.Vector3();
      const upAxis = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion();

      const length = 250;
      const aimAt = camera.position;

      const updateOne = (eyeObj, beamMesh, markerMesh, sideOffset = 0) => {
        if (!beamMesh) return;

        eyeObj.getWorldPosition(tmpPos);
        tmpPos.x += sideOffset;

        tmpDir.copy(aimAt).sub(tmpPos).normalize();
        const mid = tmpPos.clone().add(tmpDir.clone().multiplyScalar(length / 2));

        beamMesh.position.copy(mid);
        quat.setFromUnitVectors(upAxis, tmpDir);
        beamMesh.quaternion.copy(quat);
        beamMesh.scale.set(1, length, 1);

        if (markerMesh) markerMesh.position.copy(tmpPos);
      };

      updateOne(eyeL.current, beamL.current, eyeMarkerL.current, -0.2);
      updateOne(eyeR.current, beamR.current, eyeMarkerR.current, 0.2);
    }

    // ---------- horns ----------
    if (hornMode && faceBone.current) {
      const base = faceBone.current;

      const setHorn = (hornMesh, localOffset) => {
        if (!hornMesh) return;

        const worldPos = base.localToWorld(localOffset.clone());
        hornMesh.position.copy(worldPos);
        base.getWorldQuaternion(hornMesh.quaternion);
        hornMesh.rotateX(-0.35);
      };

      setHorn(hornL.current, new THREE.Vector3(-12, 40, 8));
      setHorn(hornR.current, new THREE.Vector3(12, 35, 8));
    }

    // ---------- head spin ----------
    if (spin.current.active && headBone.current) {
      const now = performance.now();
      const t = (now - spin.current.start) / (spin.current.duration * 1000);

      const eased = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
      headBone.current.rotation.y = spin.current.baseY + eased * Math.PI * 2;

      if (t >= 1) {
        headBone.current.rotation.y = spin.current.baseY;
        spin.current.active = false;
      }
    }

    // ---------- NEW: random head tilts (evil mode) ----------
    if (evilMode && headBone.current) {
      // Occasionally start a tilt twitch
      if (!tilt.current.active && Math.random() < 0.01) {
        tilt.current.active = true;
        tilt.current.start = performance.now();
        tilt.current.baseZ = headBone.current.rotation.z;
        tilt.current.delta = (Math.random() - 0.5) * 0.9; // twitch strength
      }
    }

    // Apply tilt twitch if active
    if (tilt.current.active && headBone.current) {
      const now = performance.now();
      const t = (now - tilt.current.start) / (tilt.current.duration * 1000);

      // quick in/out (triangle)
      const tri = t < 0.5 ? t / 0.5 : (1 - t) / 0.5;
      headBone.current.rotation.z = tilt.current.baseZ + tri * tilt.current.delta;

      if (t >= 1) {
        headBone.current.rotation.z = tilt.current.baseZ;
        tilt.current.active = false;
      }
    }

    // ---------- NEW: shadow face flicker (evil mode) ----------
    if (evilMode && shadow.current.cached) {
      // Rarely trigger flicker
      if (!shadow.current.active && Math.random() < 0.008) {
        shadow.current.active = true;
        shadow.current.endAt = performance.now() + 90 + Math.random() * 80; // 90–170ms

        // apply darkness now
        for (const [mat] of shadow.current.originals) {
          if (mat.color) mat.color.set("#120000");
          if (mat.emissive) mat.emissive.set("#000000");
          if (typeof mat.emissiveIntensity === "number") mat.emissiveIntensity = 0.0;
          mat.needsUpdate = true;
        }
      }

      // restore when time is up
      if (shadow.current.active && performance.now() >= shadow.current.endAt) {
        for (const [mat, orig] of shadow.current.originals) {
          if (mat.color && orig.color) mat.color.copy(orig.color);
          if (mat.emissive && orig.emissive) mat.emissive.copy(orig.emissive);
          if (typeof mat.emissiveIntensity === "number" && orig.emissiveIntensity != null) {
            mat.emissiveIntensity = orig.emissiveIntensity;
          }
          mat.needsUpdate = true;
        }
        shadow.current.active = false;
      }
    }
  });

  // Log clip names once they exist
  useEffect(() => {
    if (!names || names.length === 0) {
      console.warn("No animation clips found in this GLB.");
      return;
    }
    console.log("Animation clip names:", names);
  }, [names]);

  const talkClipName = useMemo(() => {
    const lower = (s) => (s || "").toLowerCase();
    return (
      names.find((n) => lower(n).includes("talk")) ||
      names.find((n) => lower(n).includes("speak")) ||
      names.find((n) => lower(n).includes("mouth"))
    );
  }, [names]);

  const idleClipName = useMemo(() => {
    const lower = (s) => (s || "").toLowerCase();
    return (
      names.find((n) => lower(n).includes("idle")) ||
      names.find((n) => lower(n).includes("stand")) ||
      names.find((n) => lower(n).includes("breath")) ||
      names[0]
    );
  }, [names]);

  // Start a default idle
  useEffect(() => {
    if (!idleClipName) return;
    const idle = actions?.[idleClipName];
    if (!idle) return;

    idle.reset().fadeIn(0.2).play();
    return () => idle.fadeOut(0.2);
  }, [actions, idleClipName]);

  // Toggle recruiter talking on/off
  useEffect(() => {
    if (!talkClipName) return;
    const talk = actions?.[talkClipName];
    if (!talk) return;

    if (isTalking) {
      talk.reset().fadeIn(0.15).play();
    } else {
      talk.fadeOut(0.15);
      const t = setTimeout(() => talk.stop(), 160);
      return () => clearTimeout(t);
    }
  }, [actions, talkClipName, isTalking]);

  // Compute a face-ish target and pass it up to the parent
  useEffect(() => {
    if (!group.current) return;

    group.current.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(group.current);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const faceY = center.y + size.y * 0.20;
    onTarget?.([center.x, faceY, center.z]);
  }, [scene, onTarget]);

  return (
    <group ref={group}>
      <primitive object={scene} scale={1.5} position={[0, -1.0, 0]} />

      {/* Eye origin markers + beams */}
      {laserMode ? (
        <>
          <mesh ref={eyeMarkerL}>
            <sphereGeometry args={[2.5, 16, 16]} />
            <meshStandardMaterial emissive={"#ff0000"} emissiveIntensity={20} toneMapped={false} />
          </mesh>
          <mesh ref={eyeMarkerR}>
            <sphereGeometry args={[2.5, 16, 16]} />
            <meshStandardMaterial emissive={"#ff0000"} emissiveIntensity={20} toneMapped={false} />
          </mesh>

          <mesh ref={beamL}>
            <cylinderGeometry args={[0.6, 0.6, 1, 12]} />
            <meshStandardMaterial
              color={"#ff2a2a"}
              emissive={"#ff0000"}
              emissiveIntensity={30}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={beamR}>
            <cylinderGeometry args={[0.6, 0.6, 1, 12]} />
            <meshStandardMaterial
              color={"#ff2a2a"}
              emissive={"#ff0000"}
              emissiveIntensity={30}
              toneMapped={false}
            />
          </mesh>
        </>
      ) : null}

      {/* Devil horns */}
      {hornMode ? (
        <>
          <mesh ref={hornL}>
            <coneGeometry args={[7, 22, 16]} />
            <meshStandardMaterial color={"#1a1a1a"} emissive={"#330000"} emissiveIntensity={0.6} />
          </mesh>
          <mesh ref={hornR}>
            <coneGeometry args={[7, 22, 16]} />
            <meshStandardMaterial color={"#1a1a1a"} emissive={"#330000"} emissiveIntensity={0.6} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

// If you want to log camera position/target, press "p"
function CameraDebugger({ controlsRef }) {
  const { camera } = useThree();

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key.toLowerCase() !== "p") return;

      const pos = camera.position.toArray().map((n) => Number(n.toFixed(6)));
      const rot = [camera.rotation.x, camera.rotation.y, camera.rotation.z].map((n) =>
        Number(n.toFixed(6))
      );

      const tgtVec = controlsRef?.current?.target;
      const tgt = tgtVec ? tgtVec.toArray().map((n) => Number(n.toFixed(6))) : null;

      console.log("📸 Camera position:", pos);
      console.log("🎯 Controls target:", tgt);
      console.log("🧭 Camera rotation (radians):", rot);
    };

    window.addEventListener("keydown", onKeyDown);
    console.log('CameraDebugger ready: press "p" to print camera position/target.');
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [camera, controlsRef]);

  return null;
}

/**
 * NEW: micro camera jitter + sudden light drops controller
 */
function EvilCameraAndLights({ enabled, cameraPos, ambientRef, dirRef }) {
  const { camera } = useThree();
  const base = useRef({
    cam: new THREE.Vector3(cameraPos[0], cameraPos[1], cameraPos[2]),
    ambient: 1.2,
    dir: 1.2,
  });

  useEffect(() => {
    // reset when turning off evil mode
    if (!enabled) {
      camera.position.copy(base.current.cam);
      if (ambientRef.current) ambientRef.current.intensity = base.current.ambient;
      if (dirRef.current) dirRef.current.intensity = base.current.dir;
    }
  }, [enabled, camera, ambientRef, dirRef]);

  useFrame(() => {
    if (!enabled) return;

    const t = performance.now() * 0.001;

    // --- micro jitter ---
    camera.position.x = base.current.cam.x + Math.sin(t * 35) * 0.25;
    camera.position.y = base.current.cam.y + Math.cos(t * 29) * 0.18;
    camera.position.z = base.current.cam.z + Math.sin(t * 31) * 0.12;

    // --- sudden light drops ---
    if (ambientRef.current && dirRef.current) {
      // mostly normal, occasionally "dip"
      const drop = Math.random() < 0.03 ? 0.25 + Math.random() * 0.25 : 1.0;

      // smooth a tiny bit so it's not nauseating
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        base.current.ambient * drop,
        0.15
      );
      dirRef.current.intensity = THREE.MathUtils.lerp(
        dirRef.current.intensity,
        base.current.dir * (0.85 * drop),
        0.15
      );
    }
  });

  return null;
}

export default function RecruiterAvatar({
  isRecruiterTalking = true,
  laserMode = false,
  fireMode = false,
  hornMode = false,
  evilMode = false,
}) {
  const cameraPos = useMemo(() => [-4.4, 150, 200], []);

  const [target, setTarget] = useState([0, 0, 0]);
  const controlsRef = useRef(null);

  const [headSpinToken, setSpinToken] = useState(0);

  // NEW: keep light refs so we can do dips
  const ambientRef = useRef(null);
  const dirRef = useRef(null);

  useEffect(() => {
    if (!evilMode) return;

    const interval = setInterval(() => {
      setSpinToken((n) => n + 1);
    }, 20000);

    return () => clearInterval(interval);
  }, [evilMode]);

  const lasersOn = laserMode || evilMode;
  const hornsOn = hornMode || evilMode;
  const fireOn = fireMode || evilMode;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{
          position: cameraPos,
          fov: 40,
          near: 0.1,
          far: 2000,
        }}
      >
        <InitialCamera position={cameraPos} target={target} />

        {/* NEW: micro camera jitter + light drops when evil */}
        <EvilCameraAndLights
          enabled={evilMode}
          cameraPos={cameraPos}
          ambientRef={ambientRef}
          dirRef={dirRef}
        />

        {/* Lights */}
        <ambientLight ref={ambientRef} intensity={fireOn ? 0.35 : 1.2} />
        <directionalLight ref={dirRef} position={[3, 5, 2]} intensity={fireOn ? 0.55 : 1.2} />

        {/* Fire background */}
        <FireParticles enabled={fireOn} />

        {/* NEW: subtle glitch overlay */}
        <ScreenGlitch enabled={evilMode} />

        {/* Red wash light when in evil/fire mode */}
        {fireOn ? (
          <pointLight
            position={[target[0], target[1] + 80, target[2] + 150]}
            intensity={10}
            distance={2000}
            color={"#ff2200"}
          />
        ) : null}

        {/* Debug helpers */}
        <axesHelper args={[2]} />
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial />
        </mesh>

        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[0.6, 0.6, 0.6]} />
              <meshStandardMaterial />
            </mesh>
          }
        >
          <BusinessManAnimated
            onTarget={setTarget}
            isTalking={isRecruiterTalking}
            laserMode={lasersOn}
            hornMode={hornsOn}
            headSpinToken={headSpinToken}
            evilMode={evilMode}   // NEW: enables head tilt + shadow flicker
          />
        </Suspense>

        <OrbitControls ref={controlsRef} makeDefault target={target} enablePan={false} />
        <CameraDebugger controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/business_man.glb");