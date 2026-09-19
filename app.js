(() => {
  const intro = document.querySelector('#intro');
  const surprise = document.querySelector('#surprise');
  const yesBtn = document.querySelector('#yes-btn');
  const noBtn = document.querySelector('#no-btn');
  const noMessage = document.querySelector('#no-message');
  const choiceZone = document.querySelector('#choice-zone');
  const outerPetals = document.querySelector('#outer-petals');
  const innerPetals = document.querySelector('#inner-petals');
  const seedField = document.querySelector('#seed-field');
  const bouquets = [...document.querySelectorAll('.bouquet')];
  const continueBtn = document.querySelector('#continue-btn');
  const restartBtn = document.querySelector('#restart-btn');
  const canvas = document.querySelector('#bloom-canvas');
  const ctx = canvas.getContext('2d');

  let noAttempts = 0;
  let bloomRAF = null;

  const noLines = [
    'Jajaja, buen intento.',
    'Esa opción no se deja tocar.',
    'Sherlyn...',
    'Ya entendiste que no, ¿verdad? 😭',
    'JAJAJA ya basta.'
  ];

  function show(screen) {
    [intro, surprise].forEach(s => s.classList.remove('screen--active'));
    screen.classList.add('screen--active');
  }

  function seededNoise(i, salt=0) {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function makePetalRing(container, count, delayBase, delayStep, inner=false) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'petal';

      const base = (360 / count) * i;
      const jitter = (seededNoise(i, inner ? 9 : 3) - .5) * (inner ? 5 : 4);
      const sx = .90 + seededNoise(i, 4) * .18;
      const sy = .90 + seededNoise(i, 5) * .17;

      p.style.setProperty('--angle', `${base + jitter}deg`);
      p.style.setProperty('--sx', sx.toFixed(3));
      p.style.setProperty('--sy', sy.toFixed(3));
      p.style.animationDelay = `${delayBase + i * delayStep}s`;
      container.appendChild(p);
    }
  }

  function makeSeeds() {
    seedField.innerHTML = '';
    const total = 220;
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < total; i++) {
      const t = i / (total - 1);
      const r = Math.sqrt(t) * 46;
      const a = i * golden;
      const x = 50 + Math.cos(a) * r;
      const y = 50 + Math.sin(a) * r;
      const seed = document.createElement('span');
      seed.className = 'seed';
      seed.style.left = `${x}%`;
      seed.style.top = `${y}%`;
      seed.style.setProperty('--r', `${(a * 180 / Math.PI) + 35}deg`);
      const s = .55 + (1-t) * .35;
      seed.style.transform += ` scale(${s})`;
      seedField.appendChild(seed);
    }
  }

  function flowerHTML(x, y, s, r) {
    const f = document.createElement('div');
    f.className = 'mini-flower';
    f.style.left = x;
    f.style.top = y;
    f.style.setProperty('--s', s);
    f.style.setProperty('--r', r);

    const stem = document.createElement('span');
    stem.className = 'stem';
    stem.style.transform = `rotate(${r})`;
    f.appendChild(stem);

    for (let i = 0; i < 18; i++) {
      const p = document.createElement('span');
      p.className = 'mini-petal';
      p.style.setProperty('--a', `${i * 20}deg`);
      f.appendChild(p);
    }
    const core = document.createElement('span');
    core.className = 'mini-core';
    f.appendChild(core);
    return f;
  }

  function makeBouquets() {
    const layouts = [
      [
        ['3%','37%',.9,'-13deg'], ['27%','8%',.7,'6deg'], ['42%','46%',.74,'13deg'],
        ['8%','66%',.58,'-20deg'], ['52%','70%',.58,'18deg']
      ],
      [
        ['46%','34%',.9,'12deg'], ['18%','7%',.7,'-8deg'], ['5%','48%',.74,'-14deg'],
        ['56%','67%',.58,'21deg'], ['1%','72%',.58,'-18deg']
      ]
    ];
    bouquets.forEach((b, index) => {
      b.innerHTML = '';
      layouts[index].forEach(args => b.appendChild(flowerHTML(...args)));
    });
  }

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function startBloomFX() {
    cancelAnimationFrame(bloomRAF);
    fitCanvas();

    const W = innerWidth;
    const H = innerHeight;
    const start = performance.now();
    const cx = W * .5;
    const cy = H * .52;
    const radius = Math.min(W, H) * .36;

    // Particles begin spread out, spiral toward the bloom, then burst back out.
    const particles = Array.from({length: 760}, (_, i) => {
      const a = Math.random() * Math.PI * 2;
      const outer = radius * (1.05 + Math.random() * 1.55);
      const target = radius * (.12 + Math.pow(Math.random(), .72) * .88);
      return {
        a,
        outer,
        target,
        size: .55 + Math.random() * 2.25,
        spin: (Math.random() - .5) * 1.7,
        phase: Math.random() * Math.PI * 2,
        alpha: .35 + Math.random() * .65,
        warm: Math.random()
      };
    });

    // Long, fine petal-tracing strokes like the original visual reference.
    const traces = Array.from({length: 220}, (_, i) => ({
      a: (i / 220) * Math.PI * 2 + (Math.random()-.5)*.025,
      len: radius * (.48 + Math.random() * .62),
      bend: (Math.random() - .5) * .7,
      alpha: .05 + Math.random() * .18
    }));

    // Persistent floating sparks after the bloom.
    const fireflies = Array.from({length: 120}, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: .5 + Math.random() * 1.7,
      phase: Math.random() * Math.PI * 2,
      drift: .15 + Math.random() * .45
    }));

    function clamp01(t){ return Math.max(0, Math.min(1, t)); }
    function easeOut(t){ t = clamp01(t); return 1 - Math.pow(1 - t, 3); }
    function easeInOut(t){
      t = clamp01(t);
      return t < .5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;
    }

    function drawGlow(strength) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.42);
      g.addColorStop(0, `rgba(255,226,112,${.18*strength})`);
      g.addColorStop(.25, `rgba(243,198,74,${.105*strength})`);
      g.addColorStop(.58, `rgba(243,198,74,${.03*strength})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0,0,W,H);
    }

    function frame(now) {
      const elapsed = now - start;
      ctx.clearRect(0,0,W,H);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // PHASE 1 (0-1.9s): many fine lines draw the flower from the middle outward.
      const traceP = easeOut(elapsed / 1900);
      traces.forEach((tr, i) => {
        const stagger = (i % 28) * .012;
        const local = clamp01(traceP * 1.25 - stagger);
        if (local <= 0) return;

        const r0 = radius * .12;
        const r1 = r0 + tr.len * local;
        const a = tr.a;

        const x0 = cx + Math.cos(a) * r0;
        const y0 = cy + Math.sin(a) * r0;
        const x1 = cx + Math.cos(a + tr.bend*.05) * r1;
        const y1 = cy + Math.sin(a + tr.bend*.05) * r1;
        const mx = cx + Math.cos(a + tr.bend*.34) * (r0 + (r1-r0)*.55);
        const my = cy + Math.sin(a + tr.bend*.34) * (r0 + (r1-r0)*.55);

        ctx.strokeStyle = `rgba(255,224,110,${tr.alpha * (1-local*.35)})`;
        ctx.lineWidth = .55 + (i % 4) * .12;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(mx, my, x1, y1);
        ctx.stroke();
      });

      // PHASE 1.5 (0.25-2.7s): visible spiral of particles pulled into the flower.
      const gather = easeInOut((elapsed - 250) / 2100);
      particles.forEach((p, i) => {
        const a = p.a + (1-gather) * (2.2 + p.spin) + Math.sin(elapsed*.0014+p.phase)*.035;
        const r = p.outer + (p.target - p.outer) * gather;
        const squash = .78 + .12*Math.sin(p.phase);

        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * squash;

        const c = p.warm > .5 ? '255,226,115' : '243,190,63';
        const twinkle = .65 + .35*Math.sin(elapsed*.004 + p.phase);
        ctx.fillStyle = `rgba(${c},${p.alpha * twinkle})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1.15 - gather*.3), 0, Math.PI*2);
        ctx.fill();
      });

      // PHASE 2 (2.15-4.7s): a pronounced burst outward after the flower opens.
      const burst = easeOut((elapsed - 2150) / 1650);
      if (elapsed > 2150) {
        particles.forEach((p, i) => {
          const a = p.a + p.spin*.23;
          const startR = p.target * .72;
          const endR = radius * (1.05 + (i % 11)/14);
          const r = startR + (endR-startR)*burst;
          const x = cx + Math.cos(a)*r;
          const y = cy + Math.sin(a)*r*.76;
          const fade = 1 - clamp01((burst-.48)/.52);

          ctx.fillStyle = `rgba(255,219,94,${.48 * fade * p.alpha})`;
          ctx.beginPath();
          ctx.arc(x,y,p.size*(1.15-burst*.35),0,Math.PI*2);
          ctx.fill();

          // short bright particle trail
          if (i % 6 === 0 && fade > 0) {
            const tx = cx + Math.cos(a)*(r-18-22*p.size);
            const ty = cy + Math.sin(a)*(r-18-22*p.size)*.76;
            ctx.strokeStyle = `rgba(255,233,150,${.18*fade})`;
            ctx.lineWidth = .8;
            ctx.beginPath();
            ctx.moveTo(tx,ty);
            ctx.lineTo(x,y);
            ctx.stroke();
          }
        });
      }

      // Central flash at bloom completion.
      if (elapsed > 1750 && elapsed < 3000) {
        const fp = Math.sin(clamp01((elapsed-1750)/1250)*Math.PI);
        drawGlow(fp);
      }

      // PHASE 3: lingering golden fireflies so the scene never becomes static/dead.
      if (elapsed > 3000) {
        fireflies.forEach(f => {
          const driftX = Math.sin(elapsed*.00045*f.drift + f.phase)*12;
          const driftY = Math.cos(elapsed*.00033*f.drift + f.phase)*9;
          const tw = .18 + .45*(.5+.5*Math.sin(elapsed*.0023+f.phase));
          ctx.fillStyle = `rgba(255,225,118,${tw})`;
          ctx.beginPath();
          ctx.arc(f.x+driftX,f.y+driftY,f.r,0,Math.PI*2);
          ctx.fill();
        });
      }

      ctx.restore();

      // Keep subtle motion alive permanently while surprise screen is visible.
      if (surprise.classList.contains('screen--active') && !surprise.classList.contains('show-proof')) {
        bloomRAF = requestAnimationFrame(frame);
      }
    }

    bloomRAF = requestAnimationFrame(frame);
  }

  function moveNo() {
    const zone = choiceZone.getBoundingClientRect();
    const button = noBtn.getBoundingClientRect();
    const maxX = Math.max(0, zone.width - button.width);
    const maxY = Math.max(0, zone.height - button.height);
    noBtn.style.left = `${Math.random() * maxX}px`;
    noBtn.style.top = `${Math.random() * maxY}px`;
    noBtn.style.right = 'auto';
    noAttempts++;
    noMessage.textContent = noLines[Math.min(noAttempts - 1, noLines.length - 1)];
  }

  ['pointerenter','pointerdown','touchstart'].forEach(type => {
    noBtn.addEventListener(type, e => {
      e.preventDefault();
      moveNo();
    }, {passive:false});
  });

  yesBtn.addEventListener('click', () => {
    makePetalRing(outerPetals, 28, .08, .026, false);
    makePetalRing(innerPetals, 24, .48, .022, true);
    makeSeeds();
    makeBouquets();

    surprise.classList.remove('show-proof','is-running');
    show(surprise);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      surprise.classList.add('is-running');
      startBloomFX();
    }));
  });

  continueBtn.addEventListener('click', () => {
    surprise.classList.add('show-proof');
  });

  restartBtn.addEventListener('click', () => {
    cancelAnimationFrame(bloomRAF);
    surprise.classList.remove('show-proof','is-running');
    noAttempts = 0;
    noMessage.textContent = '';
    noBtn.style.cssText = '';
    show(intro);
  });

  addEventListener('resize', () => {
    if (surprise.classList.contains('screen--active')) fitCanvas();
  });
})();
