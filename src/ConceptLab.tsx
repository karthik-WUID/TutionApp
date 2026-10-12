import { useEffect, useRef, useState } from 'react';
import { Download, Pause, Play, RotateCcw, Video } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Lesson } from './types';

function label(text: string, color = '#718559') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d')!;
  context.fillStyle = color; context.font = '500 42px sans-serif'; context.textAlign = 'center'; context.fillText(text, 256, 77);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(3.2, .8, 1); return sprite;
}
function sphere(radius: number, color: string) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), new THREE.MeshStandardMaterial({ color, roughness: .45, metalness: .03 }));
}
function line(points: THREE.Vector3[], color: string, width = .026) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 80, width, 8, false), new THREE.MeshStandardMaterial({ color, roughness: .7 }));
}

export default function ConceptLab({ lesson }: { lesson: Lesson }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const running = useRef(true);
  const reset = useRef(false);
  const force = useRef(2);
  const currentStep = useRef(0);
  const capture = useRef<{ context: CanvasRenderingContext2D; start: number; recorder: MediaRecorder } | null>(null);
  const mounted = useRef(true);
  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState(0);
  const [forceValue, setForceValue] = useState(2);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    mounted.current = true;
    const host = hostRef.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); }
    catch { setError('This browser cannot display the 3D model. The explanation steps below still walk you through the concept.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#eaf0df', 1);
    host.appendChild(renderer.domElement); canvasRef.current = renderer.domElement;
    renderer.domElement.setAttribute('aria-label', `Interactive 3D explanation of ${lesson.title}`);
    renderer.domElement.setAttribute('role', 'img');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.set(5.5, 4.3, 9);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 6; controls.maxDistance = 16; controls.target.set(0, .5, 0);
    scene.add(new THREE.AmbientLight('#ffffff', 2));
    const light = new THREE.DirectionalLight('#fff9e0', 3); light.position.set(5, 7, 4); scene.add(light);
    const grid = new THREE.GridHelper(12, 12, '#c6d4b1', '#dbe4ce'); grid.position.y = -1.7; scene.add(grid);
    const model = new THREE.Group(); scene.add(model);
    const animated: (t: number) => void = (() => {
      if (lesson.id === 'counting') {
        const blocks: THREE.Mesh[] = [];
        for (let i = 0; i < 5; i++) {
          const block = new THREE.Mesh(new THREE.BoxGeometry(.75, .75, .75), new THREE.MeshStandardMaterial({ color: i < 2 ? '#9ebc86' : '#dcc38f' }));
          block.position.set((i - 2) * 1.05, -.25, 0); blocks.push(block); model.add(block);
          const number = label(String(i + 1)); number.scale.set(.9, .225, 1); number.position.set((i - 2) * 1.05, -.85, .3); model.add(number);
        }
        const title = label('2 + 3 = 5'); title.position.set(0, 1.6, 0); model.add(title);
        return (t) => { blocks.forEach((block, i) => { block.rotation.y = .15 * Math.sin(t + i); block.position.y = -.25 + .1 * Math.max(0, Math.sin(t * 1.1 - i)); }); };
      }
      if (lesson.id === 'fractions') {
        const pieces: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
          const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, .3, 32, 1, false, i * Math.PI / 2 + .015, Math.PI / 2 - .03), new THREE.MeshStandardMaterial({ color: '#d5ddbf' }));
          pieces.push(mesh); model.add(mesh);
        }
        const title = label('Four equal parts make one whole'); title.position.set(0, 2, 0); title.scale.set(4.8, 1.2, 1); model.add(title);
        return (t) => { const stage = Math.floor(t / 4) % 4; const selected = stage >= 2 ? 3 : stage === 1 ? 1 : 0; pieces.forEach((piece, i) => { (piece.material as THREE.MeshStandardMaterial).color.set(i < selected ? '#8ba772' : '#d5ddbf'); piece.position.y = i < selected ? .1 : 0; }); };
      }
      if (lesson.id === 'linear') {
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(.13, .35, 2, 24), new THREE.MeshStandardMaterial({ color: '#a8b68e' })); stand.position.y = -.1; model.add(stand);
        const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, .15, .15), new THREE.MeshStandardMaterial({ color: '#bbc9a1' })); beam.position.y = 1; model.add(beam);
        [-2, 2].forEach((x) => { const pan = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .12, 30), new THREE.MeshStandardMaterial({ color: '#d4dfbc' })); pan.position.set(x, -.5, 0); model.add(pan); model.add(line([new THREE.Vector3(x, 1, 0), new THREE.Vector3(x, -.5, 0)], '#bdc9a4')); });
        for (let i = 0; i < 2; i++) { const box = new THREE.Mesh(new THREE.BoxGeometry(.65, .65, .65), new THREE.MeshStandardMaterial({ color: '#92b57a' })); box.position.set(-2.35 + i * .7, -.15, 0); model.add(box); }
        for (let i = 0; i < 3; i++) { const dot = sphere(.12, '#d1b981'); dot.position.set(-2.5 + i * .5, -.25, .7); model.add(dot); }
        for (let i = 0; i < 11; i++) { const dot = sphere(.12, '#d1b981'); dot.position.set(1.55 + i % 4 * .28, -.25 + Math.floor(i / 4) * .25, 0); model.add(dot); }
        const title = label('2x + 3 = 11 · x = 4'); title.position.set(0, 2.1, 0); title.scale.set(4.5, 1.125, 1); model.add(title);
        return (t) => { model.rotation.y = .08 * Math.sin(t * .3); };
      }
      if (lesson.id === 'materials') {
        const wood = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), new THREE.MeshStandardMaterial({ color: '#d0ae7b', roughness: .9 })); wood.position.x = -2.1;
        const metal = sphere(.7, '#adb6b8'); metal.position.x = 0;
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 1.5, 32), new THREE.MeshStandardMaterial({ color: '#a4c1be', transparent: true, opacity: .35, roughness: .1 })); glass.position.x = 2.1;
        model.add(wood, metal, glass);
        ['WOOD', 'METAL', 'GLASS'].forEach((text, i) => { const tag = label(text); tag.position.set(-2.1 + i * 2.1, -1.3, 0); tag.scale.set(1.7, .425, 1); model.add(tag); });
        return (t) => { wood.rotation.y = t * .15; glass.rotation.y = -t * .1; };
      }
      if (lesson.id === 'states' || lesson.id === 'particles') {
        const particles = Array.from({ length: 18 }, () => sphere(.18, '#c8ac7b')); model.add(...particles);
        const tags = ['SOLID', 'LIQUID', 'GAS'].map((text) => { const tag = label(text, '#a99a78'); tag.position.set(0, 2.2, 0); model.add(tag); return tag; });
        return (t) => { const state = Math.floor(t / 4) % 3; tags.forEach((tag, i) => { tag.visible = i === state; }); particles.forEach((p, i) => {
          if (state === 0) p.position.set((i % 3 - 1) * .55 + .02 * Math.sin(t * 7 + i), (Math.floor(i / 6) - 1) * .55, (Math.floor(i / 3) % 2 - .5) * .55);
          else if (state === 1) p.position.set(1.2 * Math.sin(t * .5 + i * 2), -.6 + .4 * Math.sin(t * .4 + i), .8 * Math.cos(t * .4 + i * 2));
          else p.position.set(2.4 * Math.sin(t * .6 + i * 2), 1.2 * Math.sin(t * .7 + i), 1.4 * Math.cos(t * .5 + i * 2));
        }); };
      }
      if (lesson.id === 'carbon') {
        const carbon = sphere(.6, '#a49b8c'); model.add(carbon);
        const directions = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
        directions.forEach((d) => { const end = new THREE.Vector3(...d).normalize().multiplyScalar(1.7); const atom = sphere(.4, '#dfc691'); atom.position.copy(end); model.add(atom); model.add(line([new THREE.Vector3(), end], '#cfc6a7', .07)); });
        const title = label('CH₄ · Four bonds, tetrahedral shape'); title.position.set(0, 2.5, 0); title.scale.set(5, 1.25, 1); model.add(title);
        return (t) => { model.rotation.y = t * .15; };
      }
      if (lesson.id === 'light') {
        const source = sphere(.4, '#e6ce92'); source.position.set(-3, .6, 0); model.add(source);
        const obstacle = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.2, 1), new THREE.MeshStandardMaterial({ color: '#aca1c5' })); model.add(obstacle);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(.1, 3.5, 3.5), new THREE.MeshStandardMaterial({ color: '#e1ddef' })); wall.position.x = 3; model.add(wall);
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.4), new THREE.MeshBasicMaterial({ color: '#b3a9c8', side: THREE.DoubleSide })); shadow.rotation.y = Math.PI / 2; shadow.position.set(2.93, -.6, 0); model.add(shadow);
        [-1, 1].forEach((s) => model.add(line([source.position.clone(), new THREE.Vector3(0, s * .6, s * .5), new THREE.Vector3(2.9, s * 1.2 - .6, s)], '#dacbac', .018)));
        const title = label('Light → object → shadow', '#9b8caf'); title.position.set(0, 2.1, 0); title.scale.set(4.5, 1.125, 1); model.add(title);
        return (t) => { source.scale.setScalar(1 + .04 * Math.sin(t * 2)); };
      }
      if (lesson.subject === 'Chemistry') {
        const left = sphere(.8, '#e8c589'), right = sphere(.8, '#a4b783');
        model.add(left, right);
        const cloud = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 24), new THREE.MeshStandardMaterial({ color: '#adc494', transparent: true, opacity: .12, depthWrite: false }));
        cloud.scale.set(1.6, .85, .85); model.add(cloud);
        const electron1 = sphere(.13, '#757db0'), electron2 = sphere(.13, '#757db0'); model.add(electron1, electron2);
        const text = label('Sharing an electron pair'); text.position.set(0, 2, 0); model.add(text);
        const l = label('H'), r = label('H'); l.scale.set(1.2, .3, 1); r.scale.copy(l.scale); model.add(l, r);
        return (t) => { const distance = 1.35 + .22 * Math.cos(t * .7); left.position.x = -distance; right.position.x = distance; l.position.set(-distance, -1.05, 0); r.position.set(distance, -1.05, 0); electron1.position.set(.8 * Math.cos(t * 1.2), .6 * Math.sin(t * 1.2), .65 * Math.sin(t * 1.2)); electron2.position.copy(electron1.position).multiplyScalar(-1); cloud.rotation.y = t * .1; };
      }
      if (lesson.subject === 'Physics') {
        const track = new THREE.Mesh(new THREE.BoxGeometry(8, .15, 2), new THREE.MeshStandardMaterial({ color: '#d6d7eb', roughness: .8 })); track.position.y = -.9; model.add(track);
        const ball = sphere(.5, '#b0a0cf'); ball.position.y = -.32; model.add(ball);
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(.505, .025, 8, 40), new THREE.MeshStandardMaterial({ color: '#ece7f7' })); ball.add(stripe);
        const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-3, .55, 0), 1, '#9683b7', .22, .12); model.add(arrow);
        const text = label(lesson.id === 'speed' ? 'Distance ÷ time = average speed' : 'A push changes motion', '#9a88ae'); text.position.set(0, 1.8, 0); model.add(text);
        const mass = label(lesson.id === 'speed' ? 'A constant-speed journey' : '1 kg · Force → acceleration', '#a18db6'); mass.position.set(0, -1.5, 1); mass.scale.set(4, 1, 1); model.add(mass);
        return (t) => { const cycle = lesson.id === 'speed' ? 6 / force.current : Math.sqrt(12 / force.current); const time = t % cycle; const x = -3 + (lesson.id === 'speed' ? force.current * time : .5 * force.current * time * time); ball.position.x = x; ball.rotation.z = -x * 2; arrow.position.set(x - .5, .65, 0); arrow.setLength(.45 + force.current * .18, .22, .12); };
      }
      if (lesson.subject === 'English') {
        const axis = line([new THREE.Vector3(-4, 0, 0), new THREE.Vector3(4, 0, 0)], '#9dafb7', .04); model.add(axis);
        const tags = lesson.id === 'nouns' ? ['PERSON', 'PLACE', 'THING'] : lesson.id === 'sentences' ? ['SUBJECT', '+', 'PREDICATE'] : lesson.id === 'argument' ? ['CLAIM', 'EVIDENCE', 'REASONING'] : ['BEFORE', 'THEN', 'NOW'];
        const positions = [-3, 0, 3];
        tags.forEach((tag, i) => { const dot = sphere(.12, '#a3b7c4'); dot.position.x = positions[i]; model.add(dot); const caption = label(tag, '#829ba8'); caption.position.set(positions[i], -.6, 0); caption.scale.set(1.8, .45, 1); model.add(caption); });
        const marker = sphere(.35, '#a8bdce'); model.add(marker);
        const arc = line([new THREE.Vector3(-3, .3, 0), new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(3, .3, 0)], '#c4d3dc', .025); model.add(arc);
        const title = label(lesson.id === 'nouns' ? 'Words that name your world' : lesson.id === 'sentences' ? 'Build a complete thought' : lesson.id === 'argument' ? 'Connect evidence to a claim' : 'Connect an action to a moment', '#859daa'); title.position.set(0, 2.1, 0); title.scale.set(4.8, 1.2, 1); model.add(title);
        return (t) => { const x = -3 + 6 * ((t % 8) / 8); marker.position.set(x, .3 + 1.05 * (1 - (x / 3) ** 2), 0); };
      }
      const xaxis = line([new THREE.Vector3(-4.5, 0, 0), new THREE.Vector3(4.5, 0, 0)], '#c2cbaa', .018);
      const yaxis = line([new THREE.Vector3(0, -1.5, 0), new THREE.Vector3(0, 3.3, 0)], '#c2cbaa', .018); model.add(xaxis, yaxis);
      const points = Array.from({ length: 65 }, (_, i) => { const x = -4 + i / 8; return new THREE.Vector3(x, .25 * x * x - 1, 0); });
      model.add(line(points, '#839f64', .045));
      [-2, 2].forEach((x) => { const root = sphere(.12, '#d7b778'); root.position.set(x, 0, 0); model.add(root); const tag = label(`root: ${x}`, '#a59b72'); tag.position.set(x, -.5, .5); tag.scale.set(1.5, .375, 1); model.add(tag); });
      const marker = sphere(.16, '#a79ac2'); model.add(marker);
      const tangent = line([new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)], '#c5a976', .025); tangent.visible = lesson.id === 'derivatives'; model.add(tangent);
      const equation = label('y = ¼x² − 1'); equation.position.set(0, 3.5, 0); model.add(equation);
      return (t) => { const x = -4 + 8 * ((Math.sin(t * .45) + 1) / 2); marker.position.set(x, .25 * x * x - 1, 0); tangent.position.copy(marker.position); tangent.rotation.z = Math.atan(.5 * x); };
    })();
    const resize = () => { const width = host.clientWidth, height = host.clientHeight; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    let time = 0, last = performance.now(), frame = 0;
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, .1); last = now;
      if (reset.current) { time = 0; reset.current = false; }
      if (running.current) time += delta;
      const nextStep = Math.floor(time / 4) % lesson.animation.length;
      if (nextStep !== currentStep.current) { currentStep.current = nextStep; setStep(nextStep); }
      animated(time); controls.update(); renderer.render(scene, camera);
      const exportState = capture.current;
      if (exportState) {
        const ctx = exportState.context;
        ctx.fillStyle = '#edf2e3'; ctx.fillRect(0, 0, 960, 640); ctx.drawImage(renderer.domElement, 0, 0, 960, 510);
        ctx.fillStyle = '#1f503d'; ctx.font = 'bold 24px sans-serif'; ctx.fillText(`Smart tutor · ${lesson.subject}`, 28, 548);
        ctx.font = '19px sans-serif';
        const words = lesson.animation[nextStep].split(' '); let row = '', y = 581;
        for (const word of words) { const next = `${row}${word} `; if (ctx.measureText(next).width > 900) { ctx.fillText(row, 28, y); y += 27; row = `${word} `; } else row = next; }
        ctx.fillText(row, 28, y);
        if (now - exportState.start >= 16_000) { capture.current = null; exportState.recorder.stop(); }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); setReady(true);
    return () => {
      mounted.current = false; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      if (capture.current) { capture.current.recorder.stop(); capture.current = null; }
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) { if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose(); material.dispose(); }
        }
      });
      renderer.dispose(); renderer.domElement.remove(); canvasRef.current = null;
    };
  }, [lesson.id]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  function makeVideo() {
    if (!canvasRef.current || recording) return;
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) { setError('This browser does not support video export. You can still play the live animation.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 640;
    const context = canvas.getContext('2d')!;
    const stream = canvas.captureStream(30);
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
    let recorder: MediaRecorder;
    try { recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined); }
    catch { stream.getTracks().forEach((t) => t.stop()); setError('Video recording is unavailable in this browser. Try a current Chrome or Firefox.'); return; }
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); if (mounted.current) { setVideoUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }))); setRecording(false); } };
    recorder.onerror = () => { if (mounted.current) { setError('The video could not be recorded. Try again.'); setRecording(false); } capture.current = null; stream.getTracks().forEach((t) => t.stop()); };
    setError(''); setRecording(true); setVideoUrl(''); running.current = true; setPlaying(true); reset.current = true;
    recorder.start(); capture.current = { context, start: performance.now(), recorder };
  }
  return <section className="visual-lab"><div className="visual-canvas" ref={hostRef}><span className="visual-scene-label">INTERACTIVE 3D · CONCEPT MODEL, NOT TO SCALE</span>{!ready && error && <div className="visual-fallback">{error}</div>}<span className="visual-caption">{lesson.animation[step]}</span></div><div className="visual-controls"><div><button disabled={!ready || recording} aria-label={playing ? 'Pause animation' : 'Play animation'} onClick={() => { running.current = !playing; setPlaying(!playing); }}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'Pause' : 'Play'}</button><button disabled={!ready || recording} onClick={() => { reset.current = true; setStep(0); }}><RotateCcw size={13} />Restart</button><button disabled={!ready || recording} onClick={makeVideo}><Video size={14} />{recording ? 'Making your 16s video…' : 'Make explanation video'}</button></div><span>Drag to rotate · Scroll to zoom</span></div>{lesson.subject === 'Physics' && lesson.id !== 'light' && <label className="force-control">{lesson.id === 'speed' ? 'Speed' : 'Push strength'} <input type="range" min="1" max="5" value={forceValue} disabled={recording} onChange={(e) => { const n = Number(e.target.value); force.current = n; setForceValue(n); reset.current = true; }} />{forceValue} {lesson.id === 'speed' ? 'm/s' : 'N'}</label>}<div className="animation-steps">{lesson.animation.map((text, i) => <div key={text} className={`animation-step ${step === i ? 'active' : ''}`}><span>STEP 0{i + 1}</span>{text}</div>)}</div>{videoUrl && <div className="video-result"><video controls src={videoUrl} aria-label={`${lesson.title} animated explanation`} /><a href={videoUrl} download={`smart-tutor-${lesson.id}.webm`}><Download size={14} />Save your animated explanation</a></div>}{error && ready && <p className="form-error" role="alert" style={{ margin: 20 }}>{error}</p>}</section>;
}
