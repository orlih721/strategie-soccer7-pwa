import React, { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const W = 700;
const H = 980;

const formations = {
  "2-3-1": {1:[350,880],2:[220,700],3:[480,700],4:[170,490],5:[350,490],6:[530,490],7:[350,260]},
  "3-2-1": {1:[350,880],2:[170,710],3:[350,710],6:[530,710],4:[250,500],5:[450,500],7:[350,260]},
  "2-2-2": {1:[350,880],2:[220,710],3:[480,710],4:[250,500],5:[450,500],6:[250,290],7:[450,290]}
};

function initialPlayers() {
  const blue = [[1,"GK",350,880],[2,"DEF",220,700],[3,"DEF",480,700],[4,"MID",250,520],[5,"MID",450,520],[6,"AIL",200,330],[7,"ATT",350,260]]
    .map(([num,label,x,y]) => ({ id:`b${num}`, team:"blue", num, label, x, y, color:"#1E5BFF", size:26 }));
  const red = [[1,"GK",350,120],[2,"DEF",220,280],[3,"DEF",480,280],[4,"MID",250,420],[5,"MID",450,420],[6,"AIL",180,570],[7,"ATT",350,700]]
    .map(([num,label,x,y]) => ({ id:`r${num}`, team:"red", num, label, x, y, color:"#D62828", size:26 }));
  return [...blue, ...red];
}

function App() {
  const svgRef = useRef(null);
  const [players, setPlayers] = useState(initialPlayers);
  const [ball, setBall] = useState({ x: 350, y: 490 });
  const [mode, setMode] = useState("move");
  const [selected, setSelected] = useState("");
  const [drag, setDrag] = useState(null);
  const [status, setStatus] = useState("Prêt");
  const [arrows, setArrows] = useState([]);
  const [zones, setZones] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [steps, setSteps] = useState([]);
  const [arrowStart, setArrowStart] = useState(null);
  const [temp, setTemp] = useState(null);
  const [zoneStart, setZoneStart] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const [arrowKind, setArrowKind] = useState({ color:"#FFD400", style:"course" });
  const [editing, setEditing] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pinchStart, setPinchStart] = useState(null);

  function pt(e) {
    const r = svgRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: ((cx-r.left)/r.width)*W, y: ((cy-r.top)/r.height)*H };
  }

  function distanceTouches(e) {
    if (!e.touches || e.touches.length < 2) return 0;
    const a = e.touches[0];
    const b = e.touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function start(e, type, id) {
    e.preventDefault();

    if (e.touches && e.touches.length === 2) {
      setPinchStart({ distance: distanceTouches(e), zoom });
      return;
    }

    const p = pt(e);
    if (mode === "arrow") { setArrowStart(p); setTemp(p); return; }
    if (mode === "zone") { setZoneStart(p); setTemp(p); return; }
    if (mode === "draw") {
      const d = { id:`d${Date.now()}`, points:[p], color:"#fff" };
      setDrawing(d);
      setDrawings(old => [...old, d]);
      return;
    }
    setDrag({ type, id });
    setSelected(type === "ball" ? "Ballon" : id);
  }

  function move(e) {
    e.preventDefault();

    if (e.touches && e.touches.length === 2 && pinchStart) {
      const d = distanceTouches(e);
      if (pinchStart.distance > 0) {
        const nextZoom = Math.max(0.8, Math.min(1.6, pinchStart.zoom * (d / pinchStart.distance)));
        setZoom(nextZoom);
      }
      return;
    }

    const p = pt(e);
    if (mode === "arrow" && arrowStart) { setTemp(p); return; }
    if (mode === "zone" && zoneStart) { setTemp(p); return; }
    if (mode === "draw" && drawing) {
      const nd = { ...drawing, points:[...drawing.points, p] };
      setDrawing(nd);
      setDrawings(old => old.map(x => x.id === nd.id ? nd : x));
      return;
    }
    if (!drag) return;
    if (drag.type === "ball") { setBall(p); return; }
    setPlayers(old => old.map(pl => pl.id === drag.id ? { ...pl, x:p.x, y:p.y } : pl));
  }

  function stop() {
    if (mode === "arrow" && arrowStart && temp) {
      const dx=temp.x-arrowStart.x, dy=temp.y-arrowStart.y;
      if (Math.hypot(dx,dy)>20) {
        setArrows(old => [...old, { id:`a${Date.now()}`, x1:arrowStart.x, y1:arrowStart.y, x2:temp.x, y2:temp.y, ...arrowKind }]);
        setStatus("Flèche ajoutée");
      }
    }
    if (mode === "zone" && zoneStart && temp) {
      const x=Math.min(zoneStart.x,temp.x), y=Math.min(zoneStart.y,temp.y);
      const w=Math.abs(temp.x-zoneStart.x), h=Math.abs(temp.y-zoneStart.y);
      if (w>20 && h>20) setZones(old => [...old, {id:`z${Date.now()}`, x,y,w,h,color:"#FFD400"}]);
    }
    setDrag(null); setArrowStart(null); setTemp(null); setZoneStart(null); setDrawing(null); setPinchStart(null);
  }

  function applyFormation(name) {
    setPlayers(old => old.map(p => {
      if (p.team !== "blue") return p;
      const pos = formations[name][p.num];
      return pos ? { ...p, x:pos[0], y:pos[1] } : p;
    }));
    setStatus(`Formation appliquée : ${name}`);
  }

  function redLine() {
    const order=[2,6,4,1,3,5,7], startX=100, endX=600, y=105, gap=(endX-startX)/(order.length-1);
    setPlayers(old => old.map(p => {
      if (p.team !== "red") return p;
      const i=order.indexOf(p.num);
      return i>=0 ? { ...p, x:startX+i*gap, y } : p;
    }));
    setStatus("Adversaires en ligne");
  }

  function benchSubs() {
    const existing = players.filter(p => p.team === "sub");
    if (existing.length === 0) {
      const subs = [8,9,10,11,12].map((num,i)=>({id:`s${num}`,team:"sub",num,label:`R${num}`,x:120+i*115,y:955,color:"#8338EC",size:23}));
      setPlayers(old => [...old, ...subs]);
    } else {
      setPlayers(old => old.map(p => p.team === "sub" ? { ...p, x:120+existing.findIndex(s=>s.id===p.id)*115, y:955 } : p));
    }
    setStatus("Banc remplaçants");
  }

  function addPlayer(team) {
    const num = players.filter(p=>p.team===team).length+1;
    const color = team==="blue" ? "#1E5BFF" : team==="red" ? "#D62828" : "#8338EC";
    setPlayers(old => [...old, {id:`${team[0]}${Date.now()}`, team, num, label:team==="sub"?"REM":team==="blue"?"NEW":"ADV", x:350, y:team==="blue"?800:team==="red"?180:950, color, size:26}]);
  }

  function saveLocal() {
    localStorage.setItem("soccer7-save", JSON.stringify({players, ball, arrows, zones, drawings, steps}));
    setStatus("Sauvegardé dans l’iPad");
  }

  function loadLocal() {
    const raw = localStorage.getItem("soccer7-save");
    if (!raw) { setStatus("Aucune sauvegarde"); return; }
    const d = JSON.parse(raw);
    setPlayers(d.players || initialPlayers());
    setBall(d.ball || {x:350,y:490});
    setArrows(d.arrows || []);
    setZones(d.zones || []);
    setDrawings(d.drawings || []);
    setSteps(d.steps || []);
    setStatus("Sauvegarde ouverte");
  }

  function newScene() {
    setPlayers(initialPlayers()); setBall({x:350,y:490}); setArrows([]); setZones([]); setDrawings([]); setSteps([]); setStatus("Nouvelle scène");
  }

  function deleteSelected() {
    setPlayers(old => old.filter(p => p.id !== selected));
    setArrows(old => old.filter(a => a.id !== selected));
    setZones(old => old.filter(z => z.id !== selected));
    setDrawings(old => old.filter(d => d.id !== selected));
    setSelected("");
  }

  function clearArrows() {
    setArrows([]);
    setStatus("Toutes les flèches ont été effacées");
  }

  function zoomIn() {
    setZoom(z => Math.min(1.6, z + 0.1));
  }

  function zoomOut() {
    setZoom(z => Math.max(0.8, z - 0.1));
  }

  function resetZoom() {
    setZoom(1);
  }

  function recordStep() {
    setSteps(old => [...old, { players: players.map(p=>({id:p.id,x:p.x,y:p.y})), ball:{...ball} }]);
    setStatus(`Étape enregistrée : ${steps.length+1}`);
  }

  function playSteps() {
    if (steps.length < 2) { setStatus("Il faut au moins 2 étapes"); return; }
    let idx = 1;
    const run = (step) => {
      const startP = players.map(p=>({id:p.id,x:p.x,y:p.y}));
      const startB = {...ball};
      let frame=0, total=30;
      const timer = setInterval(() => {
        frame++;
        const t=frame/total, e=t*t*(3-2*t);
        setPlayers(old => old.map(p => {
          const s=startP.find(x=>x.id===p.id), c=step.players.find(x=>x.id===p.id);
          return s && c ? {...p, x:s.x+(c.x-s.x)*e, y:s.y+(c.y-s.y)*e} : p;
        }));
        setBall({x:startB.x+(step.ball.x-startB.x)*e, y:startB.y+(step.ball.y-startB.y)*e});
        if (frame>=total) {
          clearInterval(timer);
          idx++;
          if (idx < steps.length) setTimeout(()=>run(steps[idx]),150);
          else setStatus("Lecture terminée");
        }
      }, 25);
    };
    setStatus("Lecture en cours");
    run(steps[idx]);
  }

  function openEdit(p) { setEditing({...p}); }
  function saveEdit() {
    setPlayers(old => old.map(p => p.id === editing.id ? editing : p));
    setEditing(null);
    setStatus("Joueur modifié");
  }

  function path(points) {
    return points.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.y}`).join(" ");
  }
  function dash(style) {
    if (style === "passe") return "12 10";
    if (style === "pressing") return "3 10";
    return "";
  }

  return (
    <div className="app">
      <aside className="panel left">
        <h2>FORMATIONS</h2>
        <button onClick={()=>applyFormation("2-3-1")}>2 - 3 - 1</button>
        <button onClick={()=>applyFormation("3-2-1")}>3 - 2 - 1</button>
        <button onClick={()=>applyFormation("2-2-2")}>2 - 2 - 2</button>

        <h2>OUTILS</h2>
        <button onClick={()=>setMode("move")}>Déplacer</button>
        <button onClick={()=>{setMode("arrow");setArrowKind({color:"#FFD400",style:"course"});}}>Flèche course</button>
        <button onClick={()=>{setMode("arrow");setArrowKind({color:"#00A6FF",style:"passe"});}}>Flèche passe</button>
        <button onClick={()=>{setMode("arrow");setArrowKind({color:"#FF3333",style:"pressing"});}}>Flèche pressing</button>
        <button onClick={()=>setMode("draw")}>Dessin libre</button>
        <button onClick={()=>setMode("zone")}>Zone colorée</button>
        <button onClick={redLine}>Adversaires en ligne</button>
        <button onClick={benchSubs}>Banc remplaçants</button>
        <button onClick={deleteSelected}>Effacer sélection</button>
        <button onClick={clearArrows}>Effacer flèches</button>

        <h2>ZOOM</h2>
        <button onClick={zoomIn}>Zoom +</button>
        <button onClick={zoomOut}>Zoom -</button>
        <button onClick={resetZoom}>Zoom normal</button>

        <h2>ANIMATION</h2>
        <button onClick={recordStep}>+ Enregistrer étape</button>
        <button onClick={playSteps}>▶ Lecture</button>

        <h2>SAUVEGARDE</h2>
        <button onClick={saveLocal}>💾 Sauvegarder iPad</button>
        <button onClick={loadLocal}>📂 Ouvrir iPad</button>
        <button onClick={newScene}>🆕 Nouvelle scène</button>
      </aside>

      <main className="field-wrap">
        <svg
          ref={svgRef}
          className="field"
          style={{ transform: `scale(${zoom})` }}
          viewBox={`0 0 ${W} ${H}`}
          onMouseMove={move}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={(e) => {
            if (e.touches && e.touches.length === 2) {
              e.preventDefault();
              setPinchStart({ distance: distanceTouches(e), zoom });
            }
          }}
          onTouchMove={move}
          onTouchEnd={stop}
        >
          <defs>
            <pattern id="grass" width="120" height="1" patternUnits="userSpaceOnUse">
              <rect width="60" height="1000" fill="#1f9d45" />
              <rect x="60" width="60" height="1000" fill="#18853a" />
            </pattern>
            <marker id="arrowHead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
              <path d="M2,2 L10,6 L2,10 Z" fill="currentColor" />
            </marker>
          </defs>

          <rect x="0" y="0" width="700" height="980" fill="#111" />
          <rect x="40" y="40" width="620" height="900" fill="url(#grass)" />
          <rect x="40" y="40" width="620" height="900" fill="none" stroke="white" strokeWidth="4" />
          <line x1="40" y1="490" x2="660" y2="490" stroke="white" strokeWidth="4" />
          <circle cx="350" cy="490" r="70" fill="none" stroke="white" strokeWidth="4" />
          <circle cx="350" cy="490" r="6" fill="white" />
          <rect x="220" y="40" width="260" height="120" fill="none" stroke="white" strokeWidth="4" />
          <rect x="280" y="40" width="140" height="55" fill="none" stroke="white" strokeWidth="4" />
          <circle cx="350" cy="125" r="6" fill="white" />
          <rect x="300" y="15" width="100" height="25" fill="none" stroke="white" strokeWidth="4" />
          <rect x="220" y="820" width="260" height="120" fill="none" stroke="white" strokeWidth="4" />
          <rect x="280" y="885" width="140" height="55" fill="none" stroke="white" strokeWidth="4" />
          <circle cx="350" cy="855" r="6" fill="white" />
          <rect x="300" y="940" width="100" height="25" fill="none" stroke="white" strokeWidth="4" />

          {zones.map(z=><rect key={z.id} x={z.x} y={z.y} width={z.w} height={z.h} fill="rgba(255,212,0,.25)" stroke={z.color} strokeWidth="3" onMouseDown={()=>setSelected(z.id)} onTouchStart={()=>setSelected(z.id)} />)}
          {drawings.map(d=><path key={d.id} d={path(d.points)} fill="none" stroke={d.color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" onMouseDown={()=>setSelected(d.id)} onTouchStart={()=>setSelected(d.id)} />)}
          {arrows.map(a=><line key={a.id} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={a.color} strokeWidth="6" strokeLinecap="round" strokeDasharray={dash(a.style)} markerEnd="url(#arrowHead)" onMouseDown={()=>setSelected(a.id)} onTouchStart={()=>setSelected(a.id)} />)}

          {mode==="arrow" && arrowStart && temp && <line x1={arrowStart.x} y1={arrowStart.y} x2={temp.x} y2={temp.y} stroke={arrowKind.color} strokeWidth="5" opacity=".7" />}
          {mode==="zone" && zoneStart && temp && <rect x={Math.min(zoneStart.x,temp.x)} y={Math.min(zoneStart.y,temp.y)} width={Math.abs(temp.x-zoneStart.x)} height={Math.abs(temp.y-zoneStart.y)} fill="rgba(255,212,0,.25)" stroke="#FFD400" strokeWidth="3" />}

          {players.map(p=>(
            <g key={p.id} transform={`translate(${p.x} ${p.y})`} className="player" onMouseDown={(e)=>start(e,"player",p.id)} onTouchStart={(e)=>start(e,"player",p.id)} onDoubleClick={()=>openEdit(p)}>
              <circle r={p.size} fill={p.color} stroke={selected===p.id?"#FFD400":"white"} strokeWidth="4" />
              <text y="7" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">{p.num}</text>
              <text y={p.size+19} textAnchor="middle" fill="white" fontSize="13" fontWeight="700">{p.label}</text>
            </g>
          ))}

          <g transform={`translate(${ball.x} ${ball.y})`} className="ball" onMouseDown={(e)=>start(e,"ball","ball")} onTouchStart={(e)=>start(e,"ball","ball")}>
            <circle r="22" fill="white" stroke={selected==="Ballon"?"#FFD400":"black"} strokeWidth="3" />
            <text y="8" textAnchor="middle" fontSize="24">⚽</text>
          </g>
        </svg>
      </main>

      <aside className="panel right">
        <h2>MODE IPAD</h2>
        <p>Déplace les joueurs avec le doigt.</p>
        <p>Double-clic sur PC pour modifier.</p>
        <h2>JOUEURS</h2>
        <div className="list">{players.filter(p=>p.team==="blue").map(p=><div key={p.id}>{p.num} - {p.label}</div>)}</div>
        <h2>ÉTAT</h2>
        <div className="status">{status}</div>
        <div className="status small">Mode : {mode} | Étapes : {steps.length}</div>
        <div className="status small">Zoom : {Math.round(zoom * 100)}%</div>
        <button onClick={()=>addPlayer("blue")}>+ Joueur bleu</button>
        <button onClick={()=>addPlayer("red")}>+ Joueur rouge</button>
        <button onClick={()=>addPlayer("sub")}>+ Remplaçant</button>
      </aside>

      {editing && (
        <div className="modal">
          <div className="modal-card">
            <h2>Modifier joueur</h2>
            <label>Numéro</label>
            <input type="number" value={editing.num} onChange={(e)=>setEditing({...editing,num:Number(e.target.value)})}/>
            <label>Poste / nom</label>
            <input value={editing.label} onChange={(e)=>setEditing({...editing,label:e.target.value})}/>
            <label>Équipe</label>
            <select value={editing.team} onChange={(e)=>setEditing({...editing,team:e.target.value,color:e.target.value==="blue"?"#1E5BFF":e.target.value==="red"?"#D62828":"#8338EC"})}>
              <option value="blue">Mes joueurs</option>
              <option value="red">Adversaires</option>
              <option value="sub">Remplaçants</option>
            </select>
            <label>Couleur</label>
            <input type="color" value={editing.color} onChange={(e)=>setEditing({...editing,color:e.target.value})}/>
            <label>Taille</label>
            <input type="range" min="18" max="40" value={editing.size} onChange={(e)=>setEditing({...editing,size:Number(e.target.value)})}/>
            <div className="modal-actions">
              <button onClick={()=>setEditing(null)}>Annuler</button>
              <button onClick={saveEdit}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
