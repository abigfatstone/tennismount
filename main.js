import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { runtimeText as t, coachContent, speechLocale, selectVoice, nextPhraseIndex } from "./runtime-i18n.js";

/* ===== 配置 ===== */
const LAUNCH_AT = new Date("2026-12-01T20:00:00+08:00");
// 接入订阅后端时填 URL（接收 POST JSON {email, tier, ts}）；为空则为"本地预览模式"
const SUBSCRIBE_ENDPOINT = "";
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const DEG = Math.PI / 180;

/* ===== 开机动画 ===== */
(function boot() {
  const el = $("#boot"), log = $("#bootlog");
  if (REDUCED || sessionStorage.getItem("tm-booted")) { el.classList.add("gone"); return; }
  const lines = () => [
    `TennisMount ${t("bootloader")} v1.0.0 · ESP32-S3 @ 240 MHz`,
    `[ <span class=ok>OK</span> ] MT6701 ${t("encoder")} ......... 14-bit abs @ 0x06`,
    `[ <span class=ok>OK</span> ] ${t("align")} .............. pole_pairs=7  skip (NVS)`,
    `[ <span class=ok>OK</span> ] ${t("planner")} ................ vmax=120°/s amax=600°/s²`,
    `[ <span class=ok>OK</span> ] ${t("advertising")} ........ TennisMount-7E4B`,
    `[ <span class=ok>OK</span> ] ${t("battery")} ................ 4.02 V · 82%`,
    `> ${t("link")} · rtt 31 ms`,
    `> ${t("bootMode")}`,
  ];
  let i = 0;
  const done = () => { el.classList.add("gone"); sessionStorage.setItem("tm-booted", "1"); };
  el.addEventListener("click", done);
  const tick = () => {
    if (i < lines().length) { log.innerHTML += lines()[i++] + "\n"; setTimeout(tick, 110); }
    else setTimeout(done, 380);
  };
  tick();
  window.addEventListener("tm:languagechange", () => { log.innerHTML = lines().slice(0, i).join("\n") + "\n"; });
})();

/* ===== 滚动出现 / glitch / 倒计时 / 磁吸按钮 ===== */
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: 0.12 });
$$(".reveal").forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });

const glitch = $(".glitch");
if (!REDUCED) setInterval(() => { glitch.classList.add("go"); setTimeout(() => glitch.classList.remove("go"), 460); }, 3800);

(function countdown() {
  const el = $("#countdown");
  const showLive = () => { el.innerHTML = `<div style="flex:1"><b>${t("liveTitle")}</b><span>${t("liveSubtitle")}</span></div>`; $("#launchTag").textContent = t("launchTag"); };
  window.addEventListener("tm:languagechange", () => { if (LAUNCH_AT <= Date.now()) showLive(); });
  const set = (k, v) => { $(`[data-k=${k}]`, el).textContent = String(v).padStart(2, "0"); };
  const upd = () => {
    let ms = LAUNCH_AT - Date.now();
    if (ms <= 0) { showLive(); return; }
    const s = Math.floor(ms / 1000);
    set("d", Math.floor(s / 86400)); set("h", Math.floor(s / 3600) % 24); set("m", Math.floor(s / 60) % 60); set("s", s % 60);
    setTimeout(upd, 1000 - (Date.now() % 1000));
  };
  upd();
})();

if (!REDUCED && matchMedia("(pointer:fine)").matches) {
  $$(".magnetic").forEach((b) => {
    b.addEventListener("mousemove", (e) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty("--mx", `${(e.clientX - r.left - r.width / 2) * 0.22}px`);
      b.style.setProperty("--my", `${(e.clientY - r.top - r.height / 2) * 0.3}px`);
    });
    b.addEventListener("mouseleave", () => { b.style.setProperty("--mx", "0px"); b.style.setProperty("--my", "0px"); });
  });
}

/* ===== 运动规划（与固件同思路的梯形速度规划） ===== */
function planStep(st, target, vmax, amax, dt) {
  const d = target - st.pos;
  const stopDist = (st.vel * st.vel) / (2 * amax);
  let vDes;
  if (Math.abs(d) < 0.02 && Math.abs(st.vel) < 1) { st.vel = 0; return st; }
  if (Math.sign(d) === Math.sign(st.vel) && Math.abs(d) <= stopDist) vDes = 0;
  else vDes = Math.sign(d) * Math.min(vmax, Math.sqrt(2 * amax * Math.abs(d)));
  const dv = clamp(vDes - st.vel, -amax * dt, amax * dt);
  st.vel += dv;
  st.pos += st.vel * dt;
  return st;
}

/* ===== 3D 查看器 ===== */
const PAN_PARTS = ["top_cap", "phone_arm", "phone_plate", "knob", "REF_iPhone", "REF_motor_GBM2804H"];
const SHELLS = ["base_shell", "bottom_plate", "top_cap", "motor_mount", "phone_arm"];
const MATS = {
  light: { color: 0xd5dbe0, roughness: 0.55, metalness: 0.0 },
  dark: { color: 0x1a1e23, roughness: 0.38, metalness: 0.15 },
  phone: { color: 0x0b0d10, roughness: 0.15, metalness: 0.7 },
  battery: { color: 0x18a7b5, roughness: 0.35, metalness: 0.2 },
  pcb: { color: 0x0f5d34, roughness: 0.5, metalness: 0.2, emissive: 0x0a2a14 },
  pcbDark: { color: 0x111a2c, roughness: 0.5, metalness: 0.2 },
  steel: { color: 0xb9c1c7, roughness: 0.22, metalness: 1.0 },
  motor: { color: 0x7d868e, roughness: 0.32, metalness: 0.9 },
  magnet: { color: 0x5a6068, roughness: 0.4, metalness: 0.8 },
  led: { color: 0xd4ff3a, roughness: 0.3, metalness: 0, emissive: 0xd4ff3a, emissiveIntensity: 1.4 },
};
function matFor(name) {
  if (name.includes("iPhone")) return MATS.phone;
  if (name.includes("battery")) return MATS.battery;
  if (name.includes("LED")) return MATS.led;
  if (name.includes("bearing")) return MATS.steel;
  if (name.includes("motor_GBM")) return MATS.motor;
  if (name.includes("REF_magnet")) return MATS.magnet;
  if (name.includes("XIAO") || name.includes("SimpleFOC")) return MATS.pcbDark;
  if (name.startsWith("REF_")) return MATS.pcb;
  if (["base_shell", "bottom_plate", "motor_mount"].includes(name)) return MATS.light;
  return MATS.dark;
}

let gltfPromise = null;
const loadModel = () => (gltfPromise ??= new GLTFLoader().loadAsync("assets/tennismount.glb"));

function createViewer(canvas, { onFrame, camPos = [2.6, 2.1, 3.4], target = [0, 0.75, 0], autoRotate = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
  camera.position.set(...camPos);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...target);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 1.6; controls.maxDistance = 14;
  controls.autoRotate = autoRotate && !REDUCED; controls.autoRotateSpeed = 0.8;

  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd4ff3a, 1.2); rim.position.set(-4, 2, -3); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x3af0ff, 0.9); rim2.position.set(4, 1, -4); scene.add(rim2);

  // 地面：发光网格圆盘
  const grid = new THREE.PolarGridHelper(2.4, 24, 8, 96, 0x2c3a1a, 0x182016);
  grid.position.y = 0; scene.add(grid);
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.43, 0.47, 96), new THREE.MeshBasicMaterial({ color: 0xd4ff3a, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.002; scene.add(glow);

  const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; root.scale.setScalar(0.01); scene.add(root);
  const pan = new THREE.Group(); root.add(pan);
  const parts = {};

  const api = { scene, camera, renderer, controls, root, pan, parts, xray: false, visible: true, ready: null };

  api.ready = loadModel().then((gltf) => {
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const name = (o.name || o.parent?.name || "").replace(/\.\d+$/, "");
      let g = o.geometry.clone();
      g.deleteAttribute("normal");
      g = toCreasedNormals(g, 32 * DEG);
      const m = new THREE.MeshStandardMaterial({ ...matFor(name) });
      const mesh = new THREE.Mesh(g, m);
      mesh.name = name;
      o.updateWorldMatrix(true, false);
      mesh.applyMatrix4(o.matrixWorld);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), new THREE.LineBasicMaterial({ color: 0xd4ff3a, transparent: true, opacity: 0.0 }));
      mesh.add(edges);
      mesh.userData = { base: mesh.position.clone(), edges, mat: m, baseOpacity: 1 };
      (PAN_PARTS.includes(name) ? pan : root).add(mesh);
      parts[name] = mesh;
    });
    return api;
  });

  api.setXray = (on) => {
    api.xray = on;
    for (const [n, p] of Object.entries(parts)) {
      const shell = SHELLS.includes(n) || n === "phone_plate" || n === "knob";
      const m = p.userData.mat;
      m.transparent = on && shell; m.opacity = on && shell ? 0.08 : 1; m.depthWrite = !(on && shell);
      p.userData.edges.material.opacity = on ? (shell ? 0.55 : 0.25) : 0;
      if (n === "REF_iPhone") p.visible = !on && api.phoneOn !== false;
    }
  };
  api.highlight = (name) => {
    for (const [n, p] of Object.entries(parts)) {
      const m = p.userData.mat, base = matFor(n);
      m.emissive.setHex(n === name ? 0x6f8a12 : (base.emissive ?? 0));
      m.emissiveIntensity = n === name ? 1 : (base.emissiveIntensity ?? 1);
      p.userData.edges.material.opacity = n === name ? 0.9 : (api.xray ? 0.3 : 0);
    }
  };

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas); resize();
  new IntersectionObserver(([e]) => { api.visible = e.isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  const loop = () => {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!api.visible) return;
    onFrame?.(dt, api);
    controls.update();
    renderer.render(scene, camera);
  };
  loop();
  return api;
}

/* ===== Hero：自动跟拍动画 + HUD ===== */
(function hero() {
  const st = { pos: 0, vel: 0 }, sim = { t: 0, target: 0, next: 0, track: true, bat: 82 };
  const hudAng = $("#hudAng"), hudVel = $("#hudVel"), hudLat = $("#hudLat"), hudBat = $("#hudBat"), hudMode = $("#hudMode");
  let hudT = 0;
  const v = createViewer($("#heroCanvas"), {
    camPos: [2.9, 1.9, 3.6], target: [0, 0.78, 0],
    onFrame(dt, api) {
      sim.t += dt;
      if (sim.track && !REDUCED) {
        if (sim.t > sim.next) { sim.target = (Math.random() * 2 - 1) * 55; sim.next = sim.t + 0.9 + Math.random() * 1.8; }
        for (let i = 0; i < 4; i++) planStep(st, sim.target, 120, 600, dt / 4);
      } else planStep(st, 0, 60, 300, dt);
      api.pan.rotation.z = -st.pos * DEG;
      hudT += dt;
      if (hudT > 0.08) {
        hudT = 0;
        const s = (n, w, d = 0) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(d).padStart(w, "0");
        hudAng.textContent = s(st.pos, 5, 2) + "°";
        hudVel.textContent = s(st.vel, 3) + "°/s";
        hudLat.textContent = `${14 + Math.round(Math.random() * 10)} ms`;
        sim.bat = Math.max(20, sim.bat - 0.0006);
        hudBat.textContent = `${Math.round(sim.bat)}%`;
      }
    },
  });
  let modelFailed = false;
  const renderStatus = () => {
    if (modelFailed) $("#heroLoading").textContent = t("modelError");
    hudMode.textContent = t(sim.track ? "modeTrack" : "modeHome");
  };
  window.addEventListener("tm:languagechange", renderStatus);
  renderStatus();
  v.ready.then(() => $("#heroLoading").classList.add("gone")).catch(() => { modelFailed = true; renderStatus(); });

  $$(".hud-ctl .chip").forEach((c) => c.addEventListener("click", () => {
    c.classList.toggle("on");
    const on = c.classList.contains("on");
    if (c.dataset.act === "track") { sim.track = on; renderStatus(); }
    if (c.dataset.act === "xray") v.setXray(on);
    if (c.dataset.act === "phone") { v.phoneOn = on; if (v.parts.REF_iPhone) v.parts.REF_iPhone.visible = on && !v.xray; }
  }));
  // 默认显示手机
  v.ready.then(() => { v.phoneOn = true; $('[data-act="phone"]').classList.add("on"); }).catch(() => {});
})();

/* ===== 拆解视图 ===== */
(function explode() {
  const OFF = { // 模型坐标 z 方向偏移（mm），t=1 时
    bottom_plate: [0, 0, -95], REF_battery_21700: [0, 0, -60], REF_IP5328P: [0, -10, -50], REF_MT3608: [0, -18, -40],
    REF_SimpleFOC_Mini: [0, 14, -40], REF_XIAO_ESP32S3: [0, 22, -30], REF_LED_strip: [0, 40, 0], base_shell: [0, 0, 0],
    REF_MT6701: [0, 0, 22], motor_mount: [0, 0, 42], magnet_cap: [0, 0, 62], REF_magnet: [0, 0, 62], REF_bearing_61808: [0, 0, 84],
    REF_motor_GBM2804H: [0, 0, 108], top_cap: [0, 0, 135], phone_arm: [0, 0, 165], phone_plate: [0, 0, 190], knob: [-25, 0, 190], REF_iPhone: [0, 0, 215],
  };
  const slider = $("#explode"), out = $("#explodeVal");
  const paint = () => { out.textContent = `${slider.value}%`; slider.style.setProperty("--v", `${slider.value}%`); };
  let cur = 0, goal = 0, user = false, t = 0;
  const v = createViewer($("#explodeCanvas"), {
    camPos: [5.0, 3.0, 6.2], target: [0, 1.35, 0], autoRotate: true,
    onFrame(dt, api) {
      t += dt;
      if (!user && !REDUCED) goal = (Math.sin(t * 0.55 - Math.PI / 2) + 1) / 2;
      cur += (goal - cur) * Math.min(1, dt * 6);
      for (const [n, p] of Object.entries(api.parts)) {
        const o = OFF[n] || [0, 0, 0], b = p.userData.base;
        p.position.set(b.x + o[0] * cur, b.y + o[1] * cur, b.z + o[2] * cur);
      }
      if (!user) { slider.value = Math.round(cur * 100); paint(); }
    },
  });
  slider.addEventListener("input", () => { user = true; goal = slider.value / 100; paint(); });
  $$("#partsList li").forEach((li) => {
    const on = () => { $$("#partsList li").forEach((x) => x.classList.toggle("on", x === li)); v.highlight(li.dataset.part); };
    li.addEventListener("mouseenter", on); li.addEventListener("click", on);
  });
  $("#partsList").addEventListener("mouseleave", () => { $$("#partsList li").forEach((x) => x.classList.remove("on")); v.highlight(null); });
})();

/* ===== 跟拍算法仿真 ===== */
(function trackingDemo() {
  const cv = $("#courtCanvas"), ctx = cv.getContext("2d");
  const vf = $("#vfPlayer"), term = $("#termLog");
  const M = { center: $("#mCenter"), err: $("#mErr"), vel: $("#mVel"), jerk: $("#mJerk") };
  const HFOV = 69, HALF = HFOV / 2, CAM = { x: 0, y: -3.4 }, LAT = 0.1;
  const view = { x0: -9.2, x1: 9.2, y0: -4.3, y1: 7.2 };

  let mode = "smart", visible = false;
  const S = {
    t: 0, p: { x: 0.5, y: 0.3, vx: 0, vy: 0 }, wp: { x: 0, y: 0.3 }, wpAt: 0, vmax: 5.5,
    mount: { pos: 0, vel: 0 }, target: 0, following: false, offSince: null,
    ab: { x: 0, v: 0, init: false }, queue: [], nextCap: 0, seq: 0, trail: [],
    stats: [], lastVelSign: 0, flips: [], lost: false, cmd: 0, passer: null, logT: 0, stateT: 0,
  };

  const bearing = (x, y) => Math.atan2(x - CAM.x, y - CAM.y) / DEG;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
  const hex = (bytes) => bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
  const le16 = (v) => { const u = v & 0xffff; return [u & 0xff, u >> 8]; };
  const le32 = (v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
  const lines = [];
  const renderLog = () => { term.innerHTML = lines.map(({ cls, text }) => `<span class="${cls}">${typeof text === "function" ? text() : text}</span>`).join("\n"); };
  const log = (cls, text) => { lines.push({ cls, text }); if (lines.length > 15) lines.shift(); renderLog(); };
  window.addEventListener("tm:languagechange", () => { renderLog(); draw(); });

  function newWaypoint(sprint = false) {
    const side = Math.sign(S.p.x) || 1;
    if (sprint) { S.wp = { x: -side * rnd(3.8, 4.6), y: rnd(0, 0.8) }; S.vmax = 6.8; S.wpAt = S.t + 2.2; log("ev", () => t("sprint", { side: t(side > 0 ? "left" : "right") })); return; }
    const big = Math.random() < 0.45;
    S.wp = { x: clamp(big ? -side * rnd(1.5, 4.4) : S.p.x + rnd(-1.4, 1.4), -4.6, 4.6), y: Math.random() < 0.08 ? rnd(2.5, 5) : rnd(-0.6, 1.0) };
    S.vmax = big ? rnd(4.6, 6) : rnd(1.5, 3); S.wpAt = S.t + rnd(0.9, 2.3);
  }

  function step(dt) {
    S.t += dt;
    // --- 球员运动
    if (S.t > S.wpAt) newWaypoint();
    const p = S.p, dx = S.wp.x - p.x, dy = S.wp.y - p.y, dist = Math.hypot(dx, dy);
    const vDes = Math.min(S.vmax, Math.sqrt(2 * 9 * dist));
    const tvx = dist > 0.01 ? (dx / dist) * vDes : 0, tvy = dist > 0.01 ? (dy / dist) * vDes : 0;
    const ax = clamp((tvx - p.vx) / dt, -10, 10), ay = clamp((tvy - p.vy) / dt, -10, 10);
    p.vx += ax * dt; p.vy += ay * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    // 路人
    if (!S.passer && Math.random() < dt * 0.06) S.passer = { x: -9.5, y: -2.4, v: rnd(1, 1.6) };
    if (S.passer) { S.passer.x += S.passer.v * dt; if (S.passer.x > 9.5) S.passer = null; }

    // --- 30 Hz 采集 → Vision 检测（含噪声）
    if (S.t >= S.nextCap) {
      S.nextCap += 1 / 30;
      const truth = bearing(p.x, p.y), e = truth - S.mount.pos + gauss() * 0.45;
      S.queue.push({ at: S.t + LAT, tCap: S.t, e, mAt: S.mount.pos, inFrame: Math.abs(truth - S.mount.pos) < HALF });
    }
    // --- 结果送达控制器
    while (S.queue.length && S.queue[0].at <= S.t) control(S.queue.shift());

    // --- 支架（固件规划器 1 kHz 子步）
    const amax = mode === "smart" ? 600 : 2400;
    for (let i = 0; i < 4; i++) planStep(S.mount, clamp(S.target, -150, 150), 120, amax, dt / 4);

    // --- 统计
    const err = bearing(p.x, p.y) - S.mount.pos;
    S.stats.push({ t: S.t, c: Math.abs(err) < 0.15 * HFOV, e: Math.abs(err) });
    while (S.stats.length && S.stats[0].t < S.t - 10) S.stats.shift();
    const sg = Math.abs(S.mount.vel) > 3 ? Math.sign(S.mount.vel) : 0;
    if (sg && S.lastVelSign && sg !== S.lastVelSign) S.flips.push(S.t);
    if (sg) S.lastVelSign = sg;
    while (S.flips.length && S.flips[0] < S.t - 5) S.flips.shift();
    S.trail.push({ x: p.x, y: p.y }); if (S.trail.length > 70) S.trail.shift();
  }

  function control(d) {
    if (!d.inFrame) {
      if (!S.lost) { S.lost = true; log("ev", () => t("targetLost")); }
      return;
    }
    if (S.lost) { S.lost = false; log("ev", () => t("targetAcquired")); }
    let cmd;
    if (mode === "smart") {
      const z = d.mAt + d.e, h = 1 / 30;           // 用"拍这一帧时"的支架角度
      const ab = S.ab;
      if (!ab.init) { ab.x = z; ab.v = 0; ab.init = true; }
      const xp = ab.x + ab.v * h, r = z - xp;
      ab.x = xp + 0.5 * r; ab.v = ab.v + (0.1 / h) * r;
      cmd = ab.x + ab.v * (LAT + 0.03);
      const lead = Math.abs(ab.v) > 15 ? Math.sign(ab.v) * Math.min(1, (Math.abs(ab.v) - 15) / 45) * 0.1 * HFOV : 0;
      cmd += lead;
      const err = cmd - S.mount.pos, a = Math.abs(err) / HFOV;
      if (S.following) { if (a < 0.02) S.following = false; else S.target = cmd; }
      else if (a > 0.08) { S.following = true; S.target = cmd; S.offSince = null; }
      else if (a > 0.05) { S.offSince ??= S.t; if (S.t - S.offSince > 1) { S.following = true; S.target = cmd; } }
      else S.offSince = null;
    } else {
      cmd = S.mount.pos + d.e;                      // 常见错误：用当前角度 + 过期偏差
      S.target = cmd;
    }
    S.cmd = cmd;
    // --- BLE 日志（按真实协议编码）
    S.seq = (S.seq + 1) & 0xff;
    S.logT += 1;
    if (S.logT % 3 === 0) {
      const v = Math.round(clamp(S.target, -150, 150) * 100);
      log("tx", `TX CTRL  ${hex([1, S.seq, ...le16(v), ...le16(120), 0, 0])}  TRACK ${(v / 100).toFixed(2).padStart(7)}°`);
    }
    if (S.logT % 5 === 0) {
      const a = Math.round(S.mount.pos * 100), vel = Math.round(clamp(S.mount.vel * 100, -32767, 32767));
      log("rx", `RX STATE ${hex([...le32(Math.round(S.t * 1000)), ...le16(a), ...le16(vel), 82, 0x02, 41, S.seq, 1, 0])}`);
    }
  }

  /* ---- 绘制 ---- */
  let W = 0, H = 0, sx = 1;
  const X = (x) => ((x - view.x0) / (view.x1 - view.x0)) * W;
  const Y = (y) => H - ((y - view.y0) / (view.y1 - view.y0)) * H;
  function resize() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2);
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const span = (H / W) * (view.x1 - view.x0); view.y1 = view.y0 + span; sx = W / (view.x1 - view.x0);
  }
  new ResizeObserver(resize).observe(cv); resize();

  function ray(angDeg, len) { return { x: CAM.x + Math.sin(angDeg * DEG) * len, y: CAM.y + Math.cos(angDeg * DEG) * len }; }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // 场地
    ctx.fillStyle = "#0a1410"; ctx.fillRect(X(-5.485), Y(11.885), X(5.485) - X(-5.485), Y(0) - Y(11.885));
    ctx.strokeStyle = "rgba(232,238,242,.42)"; ctx.lineWidth = 1.5;
    const L = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(X(a), Y(b)); ctx.lineTo(X(c), Y(d)); ctx.stroke(); };
    L(-5.485, 0, 5.485, 0); L(-5.485, 0, -5.485, 11.885); L(5.485, 0, 5.485, 11.885);
    L(-4.115, 0, -4.115, 11.885); L(4.115, 0, 4.115, 11.885); L(-4.115, 6.4, 4.115, 6.4); L(0, 6.4, 0, 11.885); L(0, 0, 0, 0.15);
    ctx.setLineDash([4, 5]); ctx.strokeStyle = "rgba(58,240,255,.5)"; L(-5.485, 11.885, 5.485, 11.885); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(125,138,148,.8)"; ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(t("baseline"), X(-5.4), Y(0) + 13); ctx.fillText(t("serviceLine"), X(-4.05), Y(6.4) - 5);
    // 网格
    ctx.strokeStyle = "rgba(255,255,255,.035)"; ctx.lineWidth = 1;
    for (let gx = Math.ceil(view.x0); gx <= view.x1; gx++) L(gx, view.y0, gx, view.y1);
    for (let gy = Math.ceil(view.y0); gy <= view.y1; gy++) L(view.x0, gy, view.x1, gy);

    // 视场锥
    const m = S.mount.pos, len = 30;
    const a = ray(m - HALF, len), b = ray(m + HALF, len);
    const grd = ctx.createRadialGradient(X(CAM.x), Y(CAM.y), 0, X(CAM.x), Y(CAM.y), 14 * sx);
    grd.addColorStop(0, "rgba(212,255,58,.22)"); grd.addColorStop(1, "rgba(212,255,58,.02)");
    ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(X(CAM.x), Y(CAM.y)); ctx.lineTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(212,255,58,.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(CAM.x), Y(CAM.y)); ctx.lineTo(X(b.x), Y(b.y)); ctx.stroke();
    // 中间 30% 区
    const c1 = ray(m - 0.15 * HFOV, len), c2 = ray(m + 0.15 * HFOV, len);
    ctx.fillStyle = "rgba(212,255,58,.06)"; ctx.beginPath(); ctx.moveTo(X(CAM.x), Y(CAM.y)); ctx.lineTo(X(c1.x), Y(c1.y)); ctx.lineTo(X(c2.x), Y(c2.y)); ctx.closePath(); ctx.fill();
    // 目标方向
    const tc = ray(S.target, 16); ctx.setLineDash([3, 4]); ctx.strokeStyle = "rgba(58,240,255,.8)";
    ctx.beginPath(); ctx.moveTo(X(CAM.x), Y(CAM.y)); ctx.lineTo(X(tc.x), Y(tc.y)); ctx.stroke(); ctx.setLineDash([]);

    // 路人
    if (S.passer) {
      ctx.fillStyle = "rgba(125,138,148,.9)"; ctx.beginPath(); ctx.arc(X(S.passer.x), Y(S.passer.y), 5, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(125,138,148,.9)"; ctx.fillText(t("passer"), X(S.passer.x) + 8, Y(S.passer.y) + 4);
    }
    // 远端对手
    ctx.fillStyle = "rgba(125,138,148,.7)"; ctx.beginPath(); ctx.arc(X(Math.sin(S.t * 0.7) * 2.6), Y(view.y1 - 0.5), 4, 0, 7); ctx.fill();

    // 轨迹 + 球员
    ctx.strokeStyle = "rgba(212,255,58,.35)"; ctx.lineWidth = 2; ctx.beginPath();
    S.trail.forEach((q, i) => (i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)))); ctx.stroke();
    const px = X(S.p.x), py = Y(S.p.y);
    ctx.shadowColor = "#d4ff3a"; ctx.shadowBlur = 16; ctx.fillStyle = S.lost ? "#ff3a6e" : "#d4ff3a";
    ctx.beginPath(); ctx.arc(px, py, 7, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = S.lost ? "#ff3a6e" : "#d4ff3a"; ctx.lineWidth = 1.2; ctx.strokeRect(px - 14, py - 20, 28, 34);
    ctx.fillStyle = S.lost ? "#ff3a6e" : "#d4ff3a"; ctx.fillText(t(S.lost ? "lost" : "locked"), px + 18, py - 10);

    // 支架
    ctx.save(); ctx.translate(X(CAM.x), Y(CAM.y)); ctx.rotate(m * DEG);
    ctx.fillStyle = "#1a1e23"; ctx.strokeStyle = "#d4ff3a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#d4ff3a"; ctx.fillRect(-9, -16, 18, 5);
    ctx.restore();
    ctx.fillStyle = "#e8eef2"; ctx.fillText(`${t("mount")} ${m >= 0 ? "+" : "−"}${Math.abs(m).toFixed(1)}°`, X(CAM.x) + 20, Y(CAM.y) + 4);

    // 取景条
    const off = Math.tan((bearing(S.p.x, S.p.y) - m) * DEG) / (2 * Math.tan(HALF * DEG)) + 0.5;
    vf.style.left = `${clamp(off, 0, 1) * 100}%`;
    vf.classList.toggle("out", off < 0.35 || off > 0.65);

    // 指标
    if (S.stats.length > 30) {
      const n = S.stats.length, c = S.stats.filter((s) => s.c).length / n, e = S.stats.reduce((acc, s) => acc + s.e, 0) / n;
      M.center.textContent = `${Math.round(c * 100)}%`; M.center.classList.toggle("bad", c < 0.85);
      M.err.textContent = `${e.toFixed(1)}°`; M.err.classList.toggle("bad", e > 8);
      M.vel.textContent = `${Math.round(Math.abs(S.mount.vel))}°/s`;
      const j = S.flips.length / 5; M.jerk.textContent = j.toFixed(1); M.jerk.classList.toggle("bad", j > 0.8);
    }
  }

  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible) return;
    const sub = 4; for (let i = 0; i < sub; i++) step(dt / sub);
    draw();
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); }).observe(cv);
  requestAnimationFrame(loop);

  $$(".seg button").forEach((b) => b.addEventListener("click", () => {
    $$(".seg button").forEach((x) => x.classList.toggle("on", x === b));
    mode = b.dataset.mode; S.stats = []; S.flips = []; S.ab.init = false; S.following = false;
    const selectedMode = mode;
    log("ev", () => t("controller", { mode: t(selectedMode === "smart" ? "smartController" : "naiveController") }));
  }));
  $("#demoSprint").addEventListener("click", () => newWaypoint(true));
  log("ev", () => t("linkUp"));
  log("ev", () => t("tapLock"));
})();

/* ===== 边录边传仿真（60 倍速：每段 60 s → 1 s） ===== */
(function cloudSim() {
  const segsEl = $("#csSegs"); if (!segsEl) return;
  const N = 18, SEG_MB = 60, UPLINK_MBPS = 12;
  const upSec = (SEG_MB * 8) / UPLINK_MBPS / 60;   // 上传一段需要的"真实秒" / 60 倍速
  const cells = Array.from({ length: N }, () => segsEl.appendChild(document.createElement("i")));
  const localEl = $("#csLocal"), cloudEl = $("#csCloud"), lb = $("#csLocalBar"), cb = $("#csCloudBar"), pk = $("#csPackets");
  let t = 0, last = performance.now(), visible = false, cloudMB = 0;
  const segs = [];   // {i, recEnd, upEnd, state}
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); }).observe(segsEl);
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    if (!visible || REDUCED) return;
    t += dt;
    const idx = Math.floor(t);                       // 当前正在录的段
    if (idx >= N + 2) { t = 0; segs.length = 0; cloudMB = 0; cells.forEach((c) => (c.className = "")); return; }
    if (idx < N && !segs[idx]) segs[idx] = { i: idx, state: "rec" };
    let localMB = 0;
    segs.forEach((s) => {
      if (!s) return;
      if (s.state === "rec") {
        if (t >= s.i + 1) { s.state = "up"; s.upEnd = t + upSec; const p = document.createElement("i"); p.className = "pkt"; pk.appendChild(p); setTimeout(() => p.remove(), 1500); }
        else localMB += SEG_MB * (t - s.i);
      }
      if (s.state === "up") {
        if (t >= s.upEnd) { s.state = "ok"; cloudMB += SEG_MB; } else localMB += SEG_MB;
      }
      cells[s.i].className = s.state;
    });
    localEl.textContent = `${Math.round(localMB)} MB`;
    cloudEl.textContent = `${(cloudMB / 1024).toFixed(2)} GB`;
    lb.style.width = `${Math.min(100, (localMB / (SEG_MB * 3)) * 100)}%`;
    cb.style.width = `${(cloudMB / (SEG_MB * N)) * 100}%`;
  }
  requestAnimationFrame(frame);
})();

/* ===== 语音教练试听（句库同 docs/COACH_SPEC.md §2） ===== */
(function coachDemo() {
  const list = $("#cueList"); if (!list) return;
  const VOICE = { gentle: { rate: 0.95, pitch: 1.15 }, funny: { rate: 1.12, pitch: 1.3 }, strict: { rate: 1.08, pitch: 0.75 } };
  const synth = window.speechSynthesis;
  let persona = "gentle", lastIdx = {};
  function render() {
    list.innerHTML = "";
    const { cues, lines } = coachContent();
    cues.forEach(([id, label]) => {
      const b = document.createElement("button");
      b.className = "cue"; b.type = "button";
      b.dataset.cue = id;
      b.innerHTML = `<span class="play">▶</span><small>${label}</small><q>${lines[persona][id][0]}</q>`;
      list.appendChild(b);
    });
  }
  function speak(id, btn) {
    const arr = coachContent().lines[persona][id];
    const k = nextPhraseIndex(arr.length, lastIdx[id]);   // 不连续重复同一句
    lastIdx[id] = k;
    $("q", btn).textContent = arr[k];
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(arr[k]);
    u.lang = speechLocale(); Object.assign(u, VOICE[persona]);
    const voice = selectVoice(synth.getVoices());
    if (voice) u.voice = voice;
    $$(".cue").forEach((c) => c.classList.remove("speaking"));
    btn.classList.add("speaking");
    u.onend = u.onerror = () => btn.classList.remove("speaking");
    synth.speak(u);
  }
  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-cue]");
    if (button && list.contains(button)) speak(button.dataset.cue, button);
  });
  const stopSpeech = () => { synth?.cancel(); $$(".cue").forEach((c) => c.classList.remove("speaking")); };
  window.addEventListener("tm:languagechange", () => { stopSpeech(); lastIdx = {}; render(); });
  $$(".persona").forEach((p) => p.addEventListener("click", () => {
    stopSpeech();
    persona = p.dataset.p;
    lastIdx = {};
    $$(".persona").forEach((x) => { x.classList.toggle("on", x === p); x.setAttribute("aria-checked", x === p); });
    render();
  }));
  render();
})();

/* ===== 代码页签 ===== */
$$(".tabs button").forEach((b) => b.addEventListener("click", () => {
  $$(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
  $$(".pane").forEach((p) => p.classList.toggle("on", p.dataset.pane === b.dataset.tab));
}));

/* ===== 订阅 ===== */
(function subscribe() {
  const form = $("#subForm"), email = $("#subEmail"), tier = $("#subTier"), msg = $("#subMsg");
  let languageRevision = 0;
  window.addEventListener("tm:languagechange", () => {
    languageRevision++;
    msg.textContent = "";
    msg.className = "sub-msg mono";
    email.setCustomValidity("");
  });
  $$("[data-tier]").forEach((a) => a.addEventListener("click", () => { tier.value = a.dataset.tier; setTimeout(() => email.focus(), 600); }));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "sub-msg mono";
    const v = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = t("invalidEmail"); msg.classList.add("err"); return; }
    const rec = { email: v, tier: tier.value, ts: new Date().toISOString() };
    if (SUBSCRIBE_ENDPOINT) {
      const revision = languageRevision;
      const selectedTier = tier.value;
      msg.textContent = t("sending");
      try {
        const r = await fetch(SUBSCRIBE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rec) });
        if (!r.ok) throw new Error(r.status);
        if (revision !== languageRevision) return;
        const tierLabel = [...tier.options].find((option) => option.value === selectedTier)?.text || selectedTier;
        msg.textContent = t("subscribeSuccess", { tier: tierLabel });
        form.reset();
      } catch { if (revision !== languageRevision) return; msg.textContent = t("subscribeError"); msg.classList.add("err"); }
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem("tm-subs") || "[]");
        const list = Array.isArray(saved) ? saved : [];
        list.push(rec); localStorage.setItem("tm-subs", JSON.stringify(list));
        msg.textContent = t("subscribePreview", { tier: tier.selectedOptions[0].text });
        form.reset();
      } catch { msg.textContent = t("subscribeStorageError"); msg.classList.add("err"); }
    }
  });
})();
