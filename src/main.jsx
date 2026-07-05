import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const field = {
  width: 700,
  height: 980,
  x: 40,
  y: 40,
};

const formations = {
  "2-3-1": {
    1: [350, 880],
    2: [220, 700],
    3: [480, 700],
    4: [170, 490],
    5: [350, 490],
    6: [530, 490],
    7: [350, 260],
  },
  "3-2-1": {
    1: [350, 880],
    2: [170, 710],
    3: [350, 710],
    6: [530, 710],
    4: [250, 500],
    5: [450, 500],
    7: [350, 260],
  },
  "2-2-2": {
    1: [350, 880],
    2: [220, 710],
    3: [480, 710],
    4: [250, 500],
    5: [450, 500],
    6: [250, 290],
    7: [450, 290],
  },
};

function initialPlayers() {
  const blue = [
    [1, "GK", 350, 880],
    [2, "DEF", 220, 700],
    [3, "DEF", 480, 700],
    [4, "MID", 250, 520],
    [5, "MID", 450, 520],
    [6, "AIL", 200, 330],
    [7, "ATT", 350, 260],
  ].map(([num, label, x, y]) => ({
    id: `b${num}`,
    team: "blue",
    num,
    label,
    x,
    y,
    color: "#1E5BFF",
  }));

  const red = [
    [1, "GK", 350, 120],
    [2, "DEF", 220, 280],
    [3, "DEF", 480, 280],
    [4, "MID", 250, 420],
    [5, "MID", 450, 420],
    [6, "AIL", 180, 570],
    [7, "ATT", 350, 700],
  ].map(([num, label, x, y]) => ({
    id: `r${num}`,
    team: "red",
    num,
    label,
    x,
    y,
    color: "#D62828",
  }));

  return [...blue, ...red];
}

function App() {
  const [players, setPlayers] = useState(initialPlayers);
  const [ball, setBall] = useState({ x: 350, y: 490 });
  const [drag, setDrag] = useState(null);
  const [selected, setSelected] = useState(null);

  function getPoint(e) {
    const svg = document.getElementById("field-svg");
    const rect = svg.getBoundingClientRect();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * field.width;
    const y = ((clientY - rect.top) / rect.height) * field.height;

    return { x, y };
  }

  function startDrag(e, type, id) {
    e.preventDefault();
    setDrag({ type, id });
    setSelected(type === "ball" ? "Ballon" : id);
  }

  function moveDrag(e) {
    if (!drag) return;
    e.preventDefault();

    const p = getPoint(e);

    if (drag.type === "ball") {
      setBall({ x: p.x, y: p.y });
      return;
    }

    setPlayers((old) =>
      old.map((pl) =>
        pl.id === drag.id ? { ...pl, x: p.x, y: p.y } : pl
      )
    );
  }

  function stopDrag() {
    setDrag(null);
  }

  function applyFormation(name) {
    const f = formations[name];
    setPlayers((old) =>
      old.map((p) => {
        if (p.team !== "blue") return p;
        const pos = f[p.num];
        if (!pos) return p;
        return { ...p, x: pos[0], y: pos[1] };
      })
    );
  }

  function redLine() {
    const order = [2, 6, 4, 1, 3, 5, 7];
    const startX = 100;
    const endX = 600;
    const y = 105;
    const gap = (endX - startX) / (order.length - 1);

    setPlayers((old) =>
      old.map((p) => {
        if (p.team !== "red") return p;
        const index = order.indexOf(p.num);
        if (index === -1) return p;
        return { ...p, x: startX + index * gap, y };
      })
    );
  }

  function addPlayer(team) {
    const num = players.filter((p) => p.team === team).length + 1;
    const color = team === "blue" ? "#1E5BFF" : "#D62828";
    const id = `${team[0]}${Date.now()}`;

    setPlayers((old) => [
      ...old,
      {
        id,
        team,
        num,
        label: team === "blue" ? "NEW" : "ADV",
        x: 350,
        y: team === "blue" ? 800 : 180,
        color,
      },
    ]);
  }

  return (
    <div className="app">
      <aside className="panel left">
        <h2>FORMATIONS</h2>
        <button onClick={() => applyFormation("2-3-1")}>2 - 3 - 1</button>
        <button onClick={() => applyFormation("3-2-1")}>3 - 2 - 1</button>
        <button onClick={() => applyFormation("2-2-2")}>2 - 2 - 2</button>

        <h2>OUTILS</h2>
        <button onClick={redLine}>Adversaires en ligne</button>
        <button onClick={() => addPlayer("blue")}>+ Joueur bleu</button>
        <button onClick={() => addPlayer("red")}>+ Joueur rouge</button>

        <h2>INFO</h2>
        <div className="status">
          {selected ? `Sélection : ${selected}` : "Touchez un joueur"}
        </div>
      </aside>

      <main className="field-wrap">
        <svg
          id="field-svg"
          className="field"
          viewBox={`0 0 ${field.width} ${field.height}`}
          onMouseMove={moveDrag}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onTouchMove={moveDrag}
          onTouchEnd={stopDrag}
        >
          <defs>
            <pattern id="grass" width="120" height="1" patternUnits="userSpaceOnUse">
              <rect width="60" height="1000" fill="#1f9d45" />
              <rect x="60" width="60" height="1000" fill="#18853a" />
            </pattern>
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

          {players.map((p) => (
            <g
              key={p.id}
              transform={`translate(${p.x} ${p.y})`}
              className="player"
              onMouseDown={(e) => startDrag(e, "player", p.id)}
              onTouchStart={(e) => startDrag(e, "player", p.id)}
            >
              <circle r="26" fill={p.color} stroke="white" strokeWidth="4" />
              <text y="6" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">
                {p.num}
              </text>
              <text y="44" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">
                {p.label}
              </text>
            </g>
          ))}

          <g
            transform={`translate(${ball.x} ${ball.y})`}
            className="ball"
            onMouseDown={(e) => startDrag(e, "ball", "ball")}
            onTouchStart={(e) => startDrag(e, "ball", "ball")}
          >
            <circle r="22" fill="white" stroke="black" strokeWidth="3" />
            <text y="8" textAnchor="middle" fontSize="24">⚽</text>
          </g>
        </svg>
      </main>

      <aside className="panel right">
        <h2>MODE IPAD</h2>
        <p>Déplace les joueurs avec le doigt.</p>
        <p>Ajoute cette page à l’écran d’accueil avec Safari.</p>

        <h2>JOUEURS</h2>
        <div className="list">
          {players
            .filter((p) => p.team === "blue")
            .map((p) => (
              <div key={p.id}>{p.num} - {p.label}</div>
            ))}
        </div>
      </aside>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
