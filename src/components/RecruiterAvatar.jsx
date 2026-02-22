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
 * Cheap "fire" background: rising ember particles behind the character.
 * This is intentionally simple (no shaders) but reads as "hellfire" when combined with red lighting.
 */
function FireParticles({ enabled }) {
  const pointsRef = useRef(null);

  const particleCount = 250;
  const positions = useMemo(() => {
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      // Spread in a wide-ish box; adjust these if your scene scale differs
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
    const speed = 35; // units/sec

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3 + 1; // y
      arr[idx] += speed * 0.016; // approx per frame; good enough for vibe

      // Respawn at bottom when too high
      if (arr[idx] > 300) {
        arr[idx] = 0;
        arr[i * 3 + 0] = (Math.random() - 0.5) * 600;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 200;
      }
    }

    attr.needsUpdate = true;

    // Gentle pulsing via overall opacity-ish effect (done with scale)
    const pulse = 0.9 + 0.1 * Math.sin(t * 6.0);
    pts.scale.set(pulse, pulse, pulse);
  });

  if (!enabled) return null;

  return (
    <group position={[0, 0, -350]}>
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
 * Loads the GLB, computes a "face-ish" target from its bounding box,
 * logs available animation clips, and plays a talk-like clip.
 */
function BusinessManAnimated({ onTarget, isTalking, laserMode, hornMode }) {
  const group = useRef(null);
  const { scene, animations } = useGLTF("/models/business_man.glb");
  const { actions, names } = useAnimations(animations, group);

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

    // These names came from your scene traversal logs:
    const l = scene.getObjectByName("Eye_L_015");
    const r = scene.getObjectByName("Eye_R_016");

    if (!l || !r) {
      console.warn("Could not find eye bones Eye_L_015 / Eye_R_016 in scene.");
      return;
    }

    eyeL.current = l;
    eyeR.current = r;

    console.log("✅ Found eye bones:", l.name, r.name);
  }, [scene]);

  useEffect(() => {
    if (!scene) return;

    // We saw Eye_* bones parented to Face_011 in your traversal.
    // Prefer Face_011 directly; fallback to the eye parent.
    const face = scene.getObjectByName("Face_011");
    if (face) {
      faceBone.current = face;
      console.log("✅ Found face bone for horns:", face.name);
      return;
    }

    // fallback: if eyes exist, use their parent
    const l = scene.getObjectByName("Eye_L_015");
    if (l?.parent) {
      faceBone.current = l.parent;
      console.log("✅ Using eye parent for horns:", l.parent.name);
      return;
    }

    console.warn("Could not find Face_011 (or eye parent) for horns.");
  }, [scene]);

  // Update beams each frame in WORLD coordinates so it survives any parent transforms.
  useFrame(() => {
    if (!laserMode && !hornMode) return;
    if (laserMode) {
      if (!eyeL.current || !eyeR.current) return;

      const tmpPos = new THREE.Vector3();
      const tmpDir = new THREE.Vector3();
      const upAxis = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion();

      const length = 250; // increase if your scene scale is huge
      const aimAt = camera.position; // shoot toward camera (dramatic)

      const updateOne = (eyeObj, beamMesh, markerMesh, sideOffset = 0) => {
        if (!beamMesh) return;

        // Eye origin in world space
        eyeObj.getWorldPosition(tmpPos);

        // Slight offsets so beams don't overlap exactly (left/right separation)
        tmpPos.x += sideOffset;

        // Direction from eye -> camera
        tmpDir.copy(aimAt).sub(tmpPos).normalize();

        // Place beam midpoint forward from origin
        const mid = tmpPos.clone().add(tmpDir.clone().multiplyScalar(length / 2));

        // Beam mesh transform
        beamMesh.position.copy(mid);

        // Cylinder is aligned to Y axis by default, rotate it to match direction
        quat.setFromUnitVectors(upAxis, tmpDir);
        beamMesh.quaternion.copy(quat);

        // Stretch to desired length (scale Y = length because cylinder height = 1)
        beamMesh.scale.set(1, length, 1);

        // Eye marker (helps you visually confirm the origin)
        if (markerMesh) {
          markerMesh.position.copy(tmpPos);
        }
      };

      updateOne(eyeL.current, beamL.current, eyeMarkerL.current, -0.2);
      updateOne(eyeR.current, beamR.current, eyeMarkerR.current, 0.2);
    }

    // Update horns (world-space) so they follow head/face motion
    if (hornMode && faceBone.current) {
      const base = faceBone.current;

      const setHorn = (hornMesh, localOffset) => {
        if (!hornMesh) return;

        const worldPos = base.localToWorld(localOffset.clone());
        hornMesh.position.copy(worldPos);

        // Match head rotation
        base.getWorldQuaternion(hornMesh.quaternion);

        // Slight tilt backward for drama
        hornMesh.rotateX(-0.35);
      };

      // Offsets are in the face bone's local space.
      // These are intentionally big-ish; you'll tune after you see them.
      setHorn(hornL.current, new THREE.Vector3(-12, 35, 8));
      setHorn(hornR.current, new THREE.Vector3(12, 35, 8));
    }
  });
  // ---- End laser eyes ----

  // ---- Scene graph debugger ----
  // Press "o" to print all object names/types in the loaded model.
  // This helps you find eye/head bones like "LeftEye", "RightEye", "mixamorigHead", etc.
  useEffect(() => {
    if (!scene) return;

    const printSceneGraph = () => {
      console.log("===== GLB Scene Graph (type | name | parent) =====");
      scene.traverse((obj) => {
        // Print even if name is empty, but mark it clearly.
        const name = obj.name && obj.name.length ? obj.name : "(no-name)";
        const parentName =
          obj.parent && obj.parent.name && obj.parent.name.length
            ? obj.parent.name
            : "(no-parent-name)";
        console.log(`${obj.type} | ${name} | parent: ${parentName}`);
      });
      console.log("===== END GLB Scene Graph =====");
    };

    // Print once on load (comment this out if it’s too noisy)
    printSceneGraph();

    const onKeyDown = (e) => {
      if (e.key.toLowerCase() !== "o") return;
      printSceneGraph();
    };

    window.addEventListener("keydown", onKeyDown);
    console.log('SceneGraphDebugger ready: press "o" to print the GLB scene graph.');
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scene]);
  // ---- End scene graph debugger ----

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

  // Start a default idle so the character isn't frozen (if we have an idle-ish clip)
  useEffect(() => {
    if (!idleClipName) return;
    const idle = actions?.[idleClipName];
    if (!idle) return;

    idle.reset().fadeIn(0.2).play();
    return () => idle.fadeOut(0.2);
  }, [actions, idleClipName]);

  // Toggle recruiter talking on/off
  useEffect(() => {
    // If we don't have a talk clip, there's nothing to toggle.
    if (!talkClipName) return;

    const talk = actions?.[talkClipName];
    if (!talk) return;

    if (isTalking) {
      talk.reset().fadeIn(0.15).play();
    } else {
      // Fade out and stop to avoid "mouth stuck open" pose
      talk.fadeOut(0.15);
      // stop a tick later so fadeOut can apply
      const t = setTimeout(() => talk.stop(), 160);
      return () => clearTimeout(t);
    }
  }, [actions, talkClipName, isTalking]);

  // Compute a face-ish target and pass it up to the parent
  useEffect(() => {
    if (!group.current) return;

    // compute box from the ACTUAL rendered group (includes scale/position)
    group.current.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(group.current);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const faceY = center.y + size.y * 0.20; // 0.20–0.35; tune
    onTarget?.([center.x, faceY, center.z]);
    }, [scene, onTarget]);

  return (
    <group ref={group}>
      {/* tweak scale/position as needed for your specific model */}
      <primitive object={scene} scale={1.5} position={[0, -1.0, 0]} />

      {/* Eye origin markers (only visible in laser mode) */}
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

          {/* Laser beams (cylinders scaled in useFrame) */}
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

      {/* Devil horns (only visible in horn mode) */}
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
      const tgt = tgtVec
        ? tgtVec.toArray().map((n) => Number(n.toFixed(6)))
        : null;

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

export default function RecruiterAvatar({ isRecruiterTalking = true, laserMode = false, fireMode = false, hornMode = false, evilMode = false }) {
  // Your chosen camera position from the console:
  const cameraPos = useMemo(() => [-4.4, 150, 200], []);

  // Start with a placeholder target; update once the model loads.
  const [target, setTarget] = useState([0, 0, 0]);

  const controlsRef = useRef(null);

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
        {/* Force camera lookAt; will update once target is computed */}
        <InitialCamera position={cameraPos} target={target} />

        {/* Lights */}
        <ambientLight intensity={fireOn ? 0.35 : 1.2} />
        <directionalLight position={[3, 5, 2]} intensity={fireOn ? 0.55 : 1.2} />

        {/* Fire background */}
        <FireParticles enabled={fireOn} />

        {/* Red wash light when in evil/fire mode */}
        {fireOn ? (
          <pointLight position={[target[0], target[1] + 80, target[2] + 150]} intensity={10} distance={2000} color={"#ff2200"} />
        ) : null}

        {/* Debug helpers */}
        <axesHelper args={[2]} />
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial />
        </mesh>

        {/* GLB loader uses Suspense */}
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[0.6, 0.6, 0.6]} />
              <meshStandardMaterial />
            </mesh>
          }
        >
          <BusinessManAnimated onTarget={setTarget} isTalking={isRecruiterTalking} laserMode={lasersOn} hornMode={hornsOn} />
        </Suspense>

        {/* Orbit controls */}
        <OrbitControls ref={controlsRef} makeDefault target={target} enablePan={false} />

        <CameraDebugger controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/business_man.glb");