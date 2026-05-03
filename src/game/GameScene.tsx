import React, { useRef, useEffect, useMemo, useState, useCallback, Component, ErrorInfo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { BUILDINGS } from "./buildings";
import { gameState } from "./state";

const PLAYER_SPEED = 6;
const SPRINT_MULTIPLIER = 2.0;
const PLAYER_RADIUS = 0.5;
const CAR_ENTER_DIST = 4.5;
const CAR_ACCEL = 14;
const CAR_FRICTION = 0.86;
const CAR_STEER_SPEED = 1.8;
const CAR_MAX_SPEED = 28;
const CAM_DIST = 7;
const CAM_HEIGHT = 3.5;
const CAM_CAR_DIST = 10;
const CAM_CAR_HEIGHT = 5;
const WORLD_BOUND = 98;

enum Controls { forward="forward", back="back", left="left", right="right", sprint="sprint" }

const KEY_MAP = [
  { name: Controls.forward, keys: ["KeyW","ArrowUp"] },
  { name: Controls.back, keys: ["KeyS","ArrowDown"] },
  { name: Controls.left, keys: ["KeyA","ArrowLeft"] },
  { name: Controls.right, keys: ["KeyD","ArrowRight"] },
  { name: Controls.sprint, keys: ["ShiftLeft","ShiftRight"] },
];

function resolveCollisions(nx: number, nz: number, radius: number) {
  let rx = nx, rz = nz;
  for (const b of BUILDINGS) {
    const minX = b.minX - radius, maxX = b.maxX + radius;
    const minZ = b.minZ - radius, maxZ = b.maxZ + radius;
    if (rx > minX && rx < maxX && rz > minZ && rz < maxZ) {
      const oL = rx - minX, oR = maxX - rx;
      const oF = rz - minZ, oB = maxZ - rz;
      const m = Math.min(oL, oR, oF, oB);
      if (m === oL) rx = minX;
      else if (m === oR) rx = maxX;
      else if (m === oF) rz = minZ;
      else rz = maxZ;
    }
  }
  return {
    x: Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, rx)),
    z: Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, rz)),
  };
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[200,200]} />
      <meshLambertMaterial color="#444955" />
    </mesh>
  );
}

function Roads() {
  const roads = useMemo(() => {
    const items = [];
    for (let z = -80; z <= 80; z += 40) items.push({ x:0, z, width:200, depth:6 });
    for (let x = -80; x <= 80; x += 40) items.push({ x, z:0, width:6, depth:200 });
    return items;
  }, []);
  return (
    <>
      {roads.map((r,i) => (
        <mesh key={i} position={[r.x, 0.01, r.z]} rotation={[-Math.PI/2,0,0]}>
          <planeGeometry args={[r.width, r.depth]} />
          <meshLambertMaterial color="#2d3140" />
        </mesh>
      ))}
    </>
  );
}

function Buildings() {
  return (
    <>
      {BUILDINGS.map((b,i) => (
        <mesh key={i} position={[b.x, b.height/2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.width, b.height, b.depth]} />
          <meshLambertMaterial color={b.color} />
        </mesh>
      ))}
    </>
  );
}

function Car({ inCarRef, carPosRef, carAngleRef, carSpeedRef }: any) {
  const meshRef = useRef<THREE.Group>(null!);
  const [, getKeys] = useKeyboardControls<Controls>();

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (inCarRef.current) {
      const k = getKeys();
      if (k.forward) carSpeedRef.current += CAR_ACCEL * dt;
      else if (k.back) carSpeedRef.current -= CAR_ACCEL * 0.7 * dt;
      carSpeedRef.current *= Math.pow(CAR_FRICTION, dt * 60);
      const sf = Math.abs(carSpeedRef.current) / CAR_MAX_SPEED;
      if (k.left) carAngleRef.current += CAR_STEER_SPEED * sf * dt * Math.sign(carSpeedRef.current || 1);
      if (k.right) carAngleRef.current -= CAR_STEER_SPEED * sf * dt * Math.sign(carSpeedRef.current || 1);
      const nx = carPosRef.current.x - Math.sin(carAngleRef.current) * carSpeedRef.current * dt;
      const nz = carPosRef.current.z - Math.cos(carAngleRef.current) * carSpeedRef.current * dt;
      const r = resolveCollisions(nx, nz, 2.2);
      carPosRef.current.set(r.x, 0, r.z);
      gameState.carPos.x = r.x; gameState.carPos.z = r.z; gameState.carAngle = carAngleRef.current;
    }
    if (meshRef.current) {
      meshRef.current.position.copy(carPosRef.current);
      meshRef.current.position.y = 0.5;
      meshRef.current.rotation.y = carAngleRef.current;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh castShadow><boxGeometry args={[2, 1, 4]} /><meshLambertMaterial color="red" /></mesh>
    </group>
  );
}

function Player({ inCarRef, playerPosRef, carPosRef, cameraYawRef }: any) {
  const meshRef = useRef<THREE.Group>(null!);
  const [, getKeys] = useKeyboardControls<Controls>();

  useFrame((_, delta) => {
    if (inCarRef.current) { if (meshRef.current) meshRef.current.visible = false; return; }
    if (meshRef.current) meshRef.current.visible = true;
    const k = getKeys();
    const speed = PLAYER_SPEED * (k.sprint ? SPRINT_MULTIPLIER : 1) * delta;
    const yaw = cameraYawRef.current;
    let dx = 0, dz = 0;
    if (k.forward) { dx -= Math.sin(yaw)*speed; dz -= Math.cos(yaw)*speed; }
    if (k.back) { dx += Math.sin(yaw)*speed; dz += Math.cos(yaw)*speed; }
    if (k.left) { dx -= Math.cos(yaw)*speed; dz += Math.sin(yaw)*speed; }
    if (k.right) { dx += Math.cos(yaw)*speed; dz -= Math.sin(yaw)*speed; }
    if (dx !== 0 || dz !== 0) {
      const r = resolveCollisions(playerPosRef.current.x + dx, playerPosRef.current.z + dz, PLAYER_RADIUS);
      playerPosRef.current.set(r.x, 0, r.z);
    }
    if (meshRef.current) meshRef.current.position.copy(playerPosRef.current);
    gameState.showEnterPrompt = carPosRef.current.distanceTo(playerPosRef.current) < CAR_ENTER_DIST;
  });

  return (
    <group ref={meshRef}>
      <mesh castShadow position={[0, 1, 0]}><boxGeometry args={[0.6, 2, 0.6]} /><meshLambertMaterial color="blue" /></mesh>
    </group>
  );
}

function CameraController({ inCarRef, playerPosRef, carPosRef, carAngleRef, cameraYawRef, cameraPitchRef }: any) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      cameraYawRef.current -= e.movementX * 0.002;
      cameraPitchRef.current -= e.movementY * 0.002;
    };
    gl.domElement.addEventListener("click", () => gl.domElement.requestPointerLock());
    document.addEventListener("mousemove", onMove);
  }, [gl]);

  useFrame(() => {
    const target = inCarRef.current ? carPosRef.current : playerPosRef.current;
    const dist = inCarRef.current ? CAM_CAR_DIST : CAM_DIST;
    const height = inCarRef.current ? CAM_CAR_HEIGHT : CAM_HEIGHT;
    const cx = target.x + Math.sin(cameraYawRef.current) * dist;
    const cz = target.z + Math.cos(cameraYawRef.current) * dist;
    camera.position.lerp(new THREE.Vector3(cx, height, cz), 0.1);
    camera.lookAt(target.x, 1, target.z);
  });
  return null;
}

function InputHandler({ inCarRef, playerPosRef, carPosRef, carAngleRef, carSpeedRef }: any) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyF") {
        if (!inCarRef.current && carPosRef.current.distanceTo(playerPosRef.current) < CAR_ENTER_DIST) {
          inCarRef.current = true;
        } else if (inCarRef.current) {
          inCarRef.current = false;
          playerPosRef.current.copy(carPosRef.current).add(new THREE.Vector3(2, 0, 0));
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return null;
}

export default function GameScene() {
  const inCarRef = useRef(false);
  const playerPosRef = useRef(new THREE.Vector3(0,0,0));
  const carPosRef = useRef(new THREE.Vector3(8,0,0));
  const carAngleRef = useRef(0);
  const carSpeedRef = useRef(0);
  const cameraYawRef = useRef(0);
  const cameraPitchRef = useRef(0);

  return (
    <KeyboardControls map={KEY_MAP}>
      <Canvas shadows camera={{ fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} castShadow />
        <Floor />
        <Roads />
        <Buildings />
        <Car inCarRef={inCarRef} carPosRef={carPosRef} carAngleRef={carAngleRef} carSpeedRef={carSpeedRef} />
        <Player inCarRef={inCarRef} playerPosRef={playerPosRef} carPosRef={carPosRef} cameraYawRef={cameraYawRef} />
        <CameraController inCarRef={inCarRef} playerPosRef={playerPosRef} carPosRef={carPosRef} carAngleRef={carAngleRef} cameraYawRef={cameraYawRef} cameraPitchRef={cameraPitchRef} />
        <InputHandler inCarRef={inCarRef} playerPosRef={playerPosRef} carPosRef={carPosRef} carAngleRef={carAngleRef} carSpeedRef={carSpeedRef} />
      </Canvas>
    </KeyboardControls>
  );
}
