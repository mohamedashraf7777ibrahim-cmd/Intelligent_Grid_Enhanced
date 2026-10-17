const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
menuToggle.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

const routeTable = {
  'hub-market': [12.4, 28], 'hub-north': [10.8, 24], 'hub-airport': [17.6, 36],
  'market-north': [6.7, 18], 'airport-north': [9.9, 22], 'airport-market': [14.2, 32]
};
const locations = {
  hub: 'Distribution Hub', north: 'North District',
  market: 'Central Market', airport: 'Airport Depot'
};
function routeBetween(a, b) {
  if (a === b) return [0, 0];
  const key = [a, b].sort().join('-');
  return routeTable[key] || [8.5, 21];
}
function calculateRoute() {
  const from = document.getElementById('origin').value;
  const to = document.getElementById('destination').value;
  const disruption = document.getElementById('disruption').checked;
  const [baseDistance, baseMinutes] = routeBetween(from, to);
  const distanceValue = disruption && from !== to ? baseDistance * 1.16 : baseDistance;
  const timeValue = disruption && from !== to ? Math.round(baseMinutes * 1.45) : baseMinutes;
  document.getElementById('fromName').textContent = locations[from];
  document.getElementById('toName').textContent = locations[to];
  document.getElementById('distance').innerHTML = `${distanceValue.toFixed(1)} <small>km</small>`;
  document.getElementById('duration').innerHTML = `${timeValue} <small>min</small>`;
  document.getElementById('cost').textContent = `$${(distanceValue * 0.5).toFixed(2)}`;
  document.getElementById('statusText').textContent = disruption && from !== to ? 'DISRUPTION SIMULATED' : 'BASELINE PLAN';
  document.getElementById('resultNote').textContent = disruption && from !== to
    ? 'Simulation only: the disruption increases estimated time and distance to demonstrate why route plans may need to change. No live traffic is used.'
    : 'Baseline sample route. Real values depend on road networks, traffic, and operating constraints.';
}
document.getElementById('calculateRoute').addEventListener('click', calculateRoute);
document.getElementById('disruption').addEventListener('change', calculateRoute);
document.getElementById('origin').addEventListener('change', calculateRoute);
document.getElementById('destination').addEventListener('change', calculateRoute);

// Decision lab: illustrative scenario assumptions, explicitly not live traffic data.
const labStops = document.getElementById('labStops');
const labTraffic = document.getElementById('labTraffic');
const labCapacity = document.getElementById('labCapacity');
const formatHours = n => `${n.toFixed(1)} h`;
function updateLabLabels(){
  document.getElementById('stopsOut').textContent = labStops.value;
  document.getElementById('trafficOut').textContent = ['None','Low','Medium','High'][Number(labTraffic.value)];
  document.getElementById('capacityOut').textContent = `${labCapacity.value}%`;
}
function runDecisionLab(){
  const stops = Number(labStops.value), severity = Number(labTraffic.value), capacity = Number(labCapacity.value)/100;
  // Transparent classroom model: baseline time rises with stop count and lower capacity;
  // static plans incur more disruption delay than an adaptive plan.
  const base = 0.22*stops + 0.9 + (1-capacity)*3.1;
  const disruption = [0,0.12,0.3,0.52][severity];
  const staticTime = base*(1+disruption*1.35);
  const dynamicTime = base*(1+disruption*0.58);
  const saved = Math.max(0,staticTime-dynamicTime);
  const fuel = Math.min(35,Math.max(0,Math.round((saved/staticTime)*100*0.8)));
  document.getElementById('staticHours').textContent = formatHours(staticTime);
  document.getElementById('dynamicHours').textContent = formatHours(dynamicTime);
  document.getElementById('staticBar').style.width = '100%';
  document.getElementById('dynamicBar').style.width = `${Math.max(8,dynamicTime/staticTime*100)}%`;
  document.getElementById('savedTime').textContent = `${saved.toFixed(1)} h`;
  document.getElementById('fuelSaved').textContent = `${fuel}%`;
  document.getElementById('stopsMetric').textContent = stops;
  document.getElementById('labStatus').textContent = severity===0 ? 'Normal operating conditions' : `${['','Low','Medium','High'][severity]} disruption scenario`;
  document.getElementById('labInsight').textContent = severity===0
    ? 'With no disruption configured, the scenario shows only the modeled planning difference. Real performance depends on road topology, constraints, and the quality of operational data.'
    : `Under this illustrative ${['','low','medium','high'][severity]} disruption, the dynamic scenario estimates ${saved.toFixed(1)} fewer vehicle-hours than the fixed plan. This is a model output, not a guaranteed real-world saving.`;
}
if(labStops && labTraffic && labCapacity){
  [labStops,labTraffic,labCapacity].forEach(el=>el.addEventListener('input',updateLabLabels));
  document.getElementById('runLab').addEventListener('click',runDecisionLab);
  updateLabLabels(); runDecisionLab();
}

// KPI calculator uses the formulas stated in the supplied presentation.
function updateKpis(){
  const ontime = Math.max(0,Number(document.getElementById('ontimeInput').value)||0);
  const total = Math.max(0,Number(document.getElementById('totalInput').value)||0);
  const perfect = Math.max(0,Number(document.getElementById('perfectInput').value)||0);
  const orders = Math.max(0,Number(document.getElementById('ordersInput').value)||0);
  const ontimeValid = total>0 && ontime<=total;
  const fillValid = orders>0 && perfect<=orders;
  document.getElementById('ontimeResult').textContent = ontimeValid ? `${(ontime/total*100).toFixed(1)}%` : 'Check inputs';
  document.getElementById('fillResult').textContent = fillValid ? `${(perfect/orders*100).toFixed(1)}%` : 'Check inputs';
  document.getElementById('ontimeTarget').textContent = ontimeValid ? `${ontime} on-time / ${total} total deliveries` : 'Counts must be valid and total must be greater than zero';
  document.getElementById('fillTarget').textContent = fillValid ? `${perfect} perfect / ${orders} total orders` : 'Perfect orders cannot exceed total orders';
}
['ontimeInput','totalInput','perfectInput','ordersInput'].forEach(id=>{
  const el=document.getElementById(id); if(el) el.addEventListener('input',updateKpis);
});
updateKpis();

// Cinematic, interactive logistics network. All values are illustrative; no live GPS is used.
(() => {
  const canvas = document.getElementById('networkCanvas');
  if (!canvas) return;
  const panel = canvas.closest('.map-panel');
  const ctx = canvas.getContext('2d');
  if (!ctx || !panel) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = 600, H = 470;
  let width = W, height = H, dpr = 1, nodes = [], edges = [], route = [];
  let packets = [], lastRouteChange = 0, frame = 0, raf = 0, pointer = null;
  const palette = { cyan: '#65ddff', mint: '#83ffc2', blue: '#65a5ff', white: '#e6faff' };

  function makeNetwork() {
    nodes = [];
    const cols = 6, rows = 5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c;
        nodes.push({ id, x: 42 + c * 103 + (Math.random() - .5) * 25,
          y: 42 + r * 96 + (Math.random() - .5) * 22,
          bx: 42 + c * 103, by: 42 + r * 96,
          phase: Math.random() * Math.PI * 2, size: id % 6 === 0 ? 4.2 : 2.5,
          type: id === 0 ? 'hub' : id === 29 ? 'destination' : 'node' });
      }
    }
    edges = [];
    nodes.forEach((n, i) => {
      const right = nodes[i + 1];
      const down = nodes[i + 6];
      const diag = nodes[i + 7];
      if (right && i % 6 !== 5) edges.push([n.id, right.id]);
      if (down) edges.push([n.id, down.id]);
      if (diag && i % 6 !== 5 && Math.random() > .3) edges.push([n.id, diag.id]);
      if (i + 5 < nodes.length && i % 6 !== 0 && Math.random() > .65) edges.push([n.id, i + 5]);
    });
    document.getElementById('networkNodeCount').textContent = `${nodes.length} NODES`;
    chooseRoute(Math.floor(Math.random() * 4) * 6);
  }

  function shortestRoute(start, goal) {
    // Dijkstra on a small, weighted illustrative graph.
    const dist = new Array(nodes.length).fill(Infinity), prev = new Array(nodes.length).fill(-1), used = new Set();
    dist[start] = 0;
    while (used.size < nodes.length) {
      let u = -1, best = Infinity;
      for (let i = 0; i < dist.length; i++) if (!used.has(i) && dist[i] < best) { best = dist[i]; u = i; }
      if (u < 0 || u === goal) break;
      used.add(u);
      for (const e of edges) {
        let v = e[0] === u ? e[1] : e[1] === u ? e[0] : -1;
        if (v < 0 || used.has(v)) continue;
        const a = nodes[u], b = nodes[v];
        let weight = Math.hypot(a.bx - b.bx, a.by - b.by) * (0.78 + Math.random() * .36);
        if (pointer && Math.hypot(b.bx - pointer.x, b.by - pointer.y) < 65) weight *= 1.18;
        if (dist[u] + weight < dist[v]) { dist[v] = dist[u] + weight; prev[v] = u; }
      }
    }
    const path = []; let at = goal;
    while (at !== -1) { path.unshift(at); if (at === start) break; at = prev[at]; }
    return path[0] === start ? path : [start, 1, 8, 15, 22, goal];
  }

  function chooseRoute(start = 0, goal = 29) {
    if (start === goal) goal = (goal + 11) % nodes.length;
    route = shortestRoute(start, goal);
    packets = [];
    const count = Math.max(2, Math.min(6, route.length));
    for (let i = 0; i < count; i++) packets.push({ segment: 0, progress: i / count, speed: .0035 + Math.random() * .002 });
    lastRouteChange = performance.now();
    const state = document.getElementById('networkState');
    if (state) state.textContent = 'ROUTE RECALCULATED';
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(280, rect.width || 600); height = width * H / W;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr * width / W, 0, 0, dpr * height / H, 0, 0);
    if (!nodes.length) makeNetwork();
    if (raf) cancelAnimationFrame(raf);
    draw(performance.now());
  }

  function strokePath(points, color, lineWidth, glow = 0, dash = []) {
    if (points.length < 2) return;
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash(dash); ctx.shadowColor = color; ctx.shadowBlur = glow; ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur = 0;
  }

  function draw(now, staticFrame = false) {
    frame++;
    ctx.clearRect(0, 0, W, H);
    // Subtle ambient light and technical grid.
    const glow = ctx.createRadialGradient(300, 230, 10, 300, 230, 360);
    glow.addColorStop(0, 'rgba(36,130,155,.14)'); glow.addColorStop(1, 'rgba(3,10,18,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(97,177,211,.065)'; ctx.lineWidth = .7;
    for (let x = 0; x <= W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    nodes.forEach(n => {
      n.x = n.bx + (reduceMotion ? 0 : Math.sin(now * .00045 + n.phase) * 3.4);
      n.y = n.by + (reduceMotion ? 0 : Math.cos(now * .00038 + n.phase) * 3.2);
    });

    // Connections fade with distance, making the grid feel deep rather than flat.
    for (const [ai, bi] of edges) {
      const a = nodes[ai], b = nodes[bi];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      strokePath([a, b], `rgba(76,174,211,${Math.max(.07, .22 - dist / 1800)})`, .85);
    }

    const routePoints = route.map(id => nodes[id]);
    strokePath(routePoints, 'rgba(108,255,190,.12)', 13, 20);
    strokePath(routePoints, 'rgba(108,255,190,.38)', 5, 13);
    strokePath(routePoints, palette.mint, 1.7, 8);
    strokePath(routePoints, 'rgba(238,255,251,.72)', .55, 3, [3, 7]);

    // Animated delivery pulses travel along the current route.
    if (!reduceMotion && route.length > 1 && !staticFrame) {
      packets.forEach(p => {
        p.progress += p.speed;
        if (p.progress >= 1) { p.progress = 0; p.segment = (p.segment + 1) % (route.length - 1); }
      });
    }
    packets.forEach(p => {
      const a = nodes[route[p.segment]], b = nodes[route[Math.min(p.segment + 1, route.length - 1)]];
      if (!a || !b) return;
      const x = a.x + (b.x - a.x) * p.progress, y = a.y + (b.y - a.y) * p.progress;
      const tail = { x: x - (b.x - a.x) * .075, y: y - (b.y - a.y) * .075 };
      strokePath([tail, { x, y }], '#d8ffbd', 2.2, 14);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, 12);
      rg.addColorStop(0, 'rgba(218,255,195,.95)'); rg.addColorStop(1, 'rgba(109,240,194,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
    });

    nodes.forEach((n, i) => {
      const onRoute = route.includes(i), hub = n.type === 'hub', destination = n.type === 'destination';
      const color = onRoute || hub ? palette.mint : destination ? palette.blue : palette.cyan;
      const radius = hub || destination ? 5.2 : onRoute ? 3.7 : n.size;
      ctx.beginPath(); ctx.arc(n.x, n.y, radius * 3.2, 0, Math.PI * 2);
      ctx.fillStyle = onRoute ? 'rgba(131,255,194,.055)' : 'rgba(101,221,255,.025)'; ctx.fill();
      ctx.beginPath(); ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = onRoute ? 16 : 8; ctx.fill(); ctx.shadowBlur = 0;
      if (hub || destination) {
        ctx.beginPath(); ctx.arc(n.x, n.y, radius + 5 + (reduceMotion ? 0 : Math.sin(now * .002 + i) * 1.5), 0, Math.PI * 2);
        ctx.strokeStyle = hub ? 'rgba(131,255,194,.6)' : 'rgba(101,165,255,.65)'; ctx.lineWidth = 1; ctx.stroke();
      }
      if (pointer && Math.hypot(n.x - pointer.x, n.y - pointer.y) < 15) {
        ctx.beginPath(); ctx.arc(n.x, n.y, 12, 0, Math.PI * 2); ctx.strokeStyle = '#e9fff7'; ctx.lineWidth = 1; ctx.stroke();
      }
    });

    // End-point labels stay quiet and readable.
    const start = nodes[route[0]], end = nodes[route[route.length - 1]];
    if (start && end) {
      ctx.font = '10px monospace'; ctx.fillStyle = '#c6ffe7'; ctx.fillText('DISTRIBUTION HUB', Math.min(start.x + 12, 440), Math.max(18, start.y - 13));
      ctx.fillStyle = '#b8d4ff'; ctx.fillText('DELIVERY ZONE', Math.max(10, end.x - 83), Math.min(H - 15, end.y + 21));
    }

    if (!reduceMotion && !staticFrame) {
      if (now - lastRouteChange > 9000) chooseRoute(Math.floor(Math.random() * 4) * 6, 29 - Math.floor(Math.random() * 4));
      raf = requestAnimationFrame(t => draw(t));
    }
  }

  function toLogicalPoint(event) {
    const r = canvas.getBoundingClientRect();
    return { x: (event.clientX - r.left) * W / r.width, y: (event.clientY - r.top) * H / r.height };
  }
  canvas.addEventListener('pointermove', e => {
    pointer = toLogicalPoint(e);
    const nearest = nodes.reduce((best, n) => {
      const d = Math.hypot(n.x - pointer.x, n.y - pointer.y);
      return d < best.d ? { n, d } : best;
    }, { n: null, d: Infinity });
    canvas.style.cursor = nearest.d < 18 ? 'pointer' : 'crosshair';
  });
  canvas.addEventListener('pointerleave', () => { pointer = null; });
  canvas.addEventListener('click', e => {
    const p = toLogicalPoint(e);
    const nearest = nodes.reduce((best, n) => {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      return d < best.d ? { n, d } : best;
    }, { n: null, d: Infinity });
    if (nearest.n && nearest.d < 28) {
      chooseRoute(nearest.n.id, nearest.n.id === 29 ? 0 : 29);
      if (reduceMotion) draw(performance.now(), true);
    } else {
      chooseRoute(Math.floor(Math.random() * 4) * 6, 29 - Math.floor(Math.random() * 4));
      if (reduceMotion) draw(performance.now(), true);
    }
  });

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(panel);
  else window.addEventListener('resize', resize);
  resize();
  if (reduceMotion) draw(performance.now(), true);
})();
