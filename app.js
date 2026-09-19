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
  const ctx = canvas.getContext('2d', { alpha: true });

  let noAttempts = 0;
  let bloomRAF = null;
  let scenePrepared = false;
  let lastAmbientFrame = 0;

  const isMobile = matchMedia('(max-width: 760px)').matches || navigator.maxTouchPoints > 0;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;

  // Adaptive quality: mobile keeps the same effect, but with a much cheaper particle budget.
  const lowPower = isMobile || cores <= 4 || memory <= 4;
  const QUALITY = lowPower
    ? { particles: 300, traces: 92, fireflies: 34, dpr: 1.05 }
    : { particles: 500, traces: 140, fireflies: 56, dpr: 1.35 };

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

  function seededNoise(i, salt = 0) {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function makePetalRing(container, count, delayBase, delayStep, inner = false) {
    if (container.children.length) return;

    const frag = document.createDocumentFragment();
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
      frag.appendChild(p);
    }
    container.appendChild(frag);
  }

  function makeSeeds() {
    if (seedField.children.length) return;

    const total = lowPower ? 120 : 170;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const frag = document.createDocumentFragment();

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
      seed.style.setProperty('--seed-scale', (.55 + (1 - t) * .35).toFixed(3));
      frag.appendChild(seed);
    }
    seedField.appendChild(frag);
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

    const frag = document.createDocumentFragment();
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('span');
      p.className = 'mini-petal';
      p.style.setProperty('--a', `${i * (360 / 14)}deg`);
      frag.appendChild(p);
    }
    f.appendChild(frag);

    const core = document.createElement('span');
    core.className = 'mini-core';
    f.appendChild(core);
    return f;
  }

  function makeBouquets() {
    if (bouquets.every(b => b.children.length)) return;

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
      if (b.children.length) return;
      const frag = document.createDocumentFragment();
      layouts[index].forEach(args => frag.appendChild(flowerHTML(...args)));
      b.appendChild(frag);
    });
  }

  function prepareScene() {
    if (scenePrepared) return;
    makePetalRing(outerPetals, 26, .08, .026, false);
    makePetalRing(innerPetals, 22, .44, .023, true);
    makeSeeds();
    makeBouquets();
    scenePrepared = true;
  }

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, QUALITY.dpr);
    const cssW = innerWidth;
    const cssH = innerHeight;

    const w = Math.floor(cssW * dpr);
    const h = Math.floor(cssH * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

    // Precompute trigonometry once. The old version recalculated most of this every frame.
    const particles = Array.from({ length: QUALITY.particles }, () => {
      const a = Math.random() * Math.PI * 2;
      const outer = radius * (1.05 + Math.random() * 1.55);
      const target = radius * (.12 + Math.pow(Math.random(), .72) * .88);
      const phase = Math.random() * Math.PI * 2;
      const spin = (Math.random() - .5) * 1.7;

      return {
        a,
        cosA: Math.cos(a),
        sinA: Math.sin(a),
        outer,
        target,
        size: .55 + Math.random() * 2.0,
        spin,
        phase,
        alpha: .35 + Math.random() * .65,
        warm: Math.random() > .5
      };
    });

    const traces = Array.from({ length: QUALITY.traces }, (_, i) => {
      const a = (i / QUALITY.traces) * Math.PI * 2 + (Math.random() - .5) * .025;
      const bend = (Math.random() - .5) * .7;
      return {
        a,
        len: radius * (.48 + Math.random() * .62),
        bend,
        alpha: .05 + Math.random() * .18,
        cosA: Math.cos(a),
        sinA: Math.sin(a),
        cosA1: Math.cos(a + bend * .05),
        sinA1: Math.sin(a + bend * .05),
        cosMid: Math.cos(a + bend * .34),
        sinMid: Math.sin(a + bend * .34)
      };
    });

    const fireflies = Array.from({ length: QUALITY.fireflies }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: .5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      drift: .15 + Math.random() * .45
    }));

    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.42);
    glow.addColorStop(0, 'rgba(255,226,112,.18)');
    glow.addColorStop(.25, 'rgba(243,198,74,.10)');
    glow.addColorStop(.58, 'rgba(243,198,74,.03)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');

    function clamp01(t) {
      return Math.max(0, Math.min(1, t));
    }

    function easeOut(t) {
      t = clamp01(t);
      return 1 - Math.pow(1 - t, 3);
    }

    function easeInOut(t) {
      t = clamp01(t);
      return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function drawParticle(x, y, size, alpha, warm = true) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = warm ? '#ffe273' : '#f3be3f';

      // Tiny sparks are much cheaper as rects than individual arc paths.
      if (size < 1.35) {
        ctx.fillRect(x, y, size * 1.35, size * 1.35);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function frame(now) {
      const elapsed = now - start;

      // After the expensive bloom has finished, render ambience at ~30fps.
      if (elapsed > 4700 && now - lastAmbientFrame < 33) {
        bloomRAF = requestAnimationFrame(frame);
        return;
      }
      if (elapsed > 4700) lastAmbientFrame = now;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 0–2.15s: procedural traces only while they're actually animating.
      if (elapsed < 2150) {
        const traceP = easeOut(elapsed / 1900);

        for (let i = 0; i < traces.length; i++) {
          const tr = traces[i];
          const stagger = (i % 24) * .012;
          const local = clamp01(traceP * 1.25 - stagger);
          if (local <= 0) continue;

          const r0 = radius * .12;
          const r1 = r0 + tr.len * local;

          const x0 = cx + tr.cosA * r0;
          const y0 = cy + tr.sinA * r0;
          const x1 = cx + tr.cosA1 * r1;
          const y1 = cy + tr.sinA1 * r1;
          const midR = r0 + (r1 - r0) * .55;
          const mx = cx + tr.cosMid * midR;
          const my = cy + tr.sinMid * midR;

          ctx.globalAlpha = tr.alpha * (1 - local * .35);
          ctx.strokeStyle = '#ffe06e';
          ctx.lineWidth = .65;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(mx, my, x1, y1);
          ctx.stroke();
        }
      }

      // 0.25–2.65s: particles spiral inward.
      if (elapsed > 250 && elapsed < 2700) {
        const gather = easeInOut((elapsed - 250) / 2100);

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dynamicA = p.a + (1 - gather) * (2.2 + p.spin) + Math.sin(elapsed * .0014 + p.phase) * .035;
          const r = p.outer + (p.target - p.outer) * gather;
          const squash = .78 + .12 * Math.sin(p.phase);

          const x = cx + Math.cos(dynamicA) * r;
          const y = cy + Math.sin(dynamicA) * r * squash;
          const twinkle = .65 + .35 * Math.sin(elapsed * .004 + p.phase);

          drawParticle(x, y, p.size * (1.15 - gather * .3), p.alpha * twinkle, p.warm);
        }
      }

      // 2.15–4s: one outward burst. It stops completely afterwards.
      if (elapsed > 2150 && elapsed < 4000) {
        const burst = easeOut((elapsed - 2150) / 1650);
        const fade = 1 - clamp01((burst - .48) / .52);

        if (fade > 0) {
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const a = p.a + p.spin * .23;
            const startR = p.target * .72;
            const endR = radius * (1.05 + (i % 11) / 14);
            const r = startR + (endR - startR) * burst;

            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r * .76;

            drawParticle(x, y, p.size * (1.15 - burst * .35), .48 * fade * p.alpha, true);

            if (i % 10 === 0) {
              const tx = cx + Math.cos(a) * (r - 18 - 18 * p.size);
              const ty = cy + Math.sin(a) * (r - 18 - 18 * p.size) * .76;
              ctx.globalAlpha = .14 * fade;
              ctx.strokeStyle = '#ffe996';
              ctx.lineWidth = .7;
              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.lineTo(x, y);
              ctx.stroke();
            }
          }
        }
      }

      // 1.75–3s: cached central glow.
      if (elapsed > 1750 && elapsed < 3000) {
        const flash = Math.sin(clamp01((elapsed - 1750) / 1250) * Math.PI);
        ctx.globalAlpha = flash;
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }

      // From 3s onward: cheap ambient sparks only.
      if (elapsed > 3000) {
        for (let i = 0; i < fireflies.length; i++) {
          const f = fireflies[i];
          const driftX = Math.sin(elapsed * .00045 * f.drift + f.phase) * 12;
          const driftY = Math.cos(elapsed * .00033 * f.drift + f.phase) * 9;
          const tw = .18 + .45 * (.5 + .5 * Math.sin(elapsed * .0023 + f.phase));

          drawParticle(f.x + driftX, f.y + driftY, f.r, tw, true);
        }
      }

      ctx.restore();
      ctx.globalAlpha = 1;

      if (
        surprise.classList.contains('screen--active') &&
        !surprise.classList.contains('show-proof')
      ) {
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

  ['pointerenter', 'pointerdown', 'touchstart'].forEach(type => {
    noBtn.addEventListener(type, e => {
      e.preventDefault();
      moveNo();
    }, { passive: false });
  });

  yesBtn.addEventListener('click', () => {
    // Scene DOM has normally been prepared while she was reading the first screen.
    prepareScene();

    surprise.classList.remove('show-proof', 'is-running');
    show(surprise);

    // Paint the screen immediately; start the expensive FX on the next frame.
    requestAnimationFrame(() => {
      surprise.classList.add('is-running');
      requestAnimationFrame(startBloomFX);
    });
  });

  continueBtn.addEventListener('click', () => {
    cancelAnimationFrame(bloomRAF);
    surprise.classList.add('show-proof');
  });

  restartBtn.addEventListener('click', () => {
    cancelAnimationFrame(bloomRAF);
    surprise.classList.remove('show-proof', 'is-running');
    noAttempts = 0;
    noMessage.textContent = '';
    noBtn.style.cssText = '';
    show(intro);
  });

  addEventListener('resize', () => {
    if (surprise.classList.contains('screen--active')) fitCanvas();
  }, { passive: true });

  // Main optimization: create petals/seeds/bouquets BEFORE she presses "Sí".
  const prepareLater = () => prepareScene();
  if ('requestIdleCallback' in window) {
    requestIdleCallback(prepareLater, { timeout: 900 });
  } else {
    setTimeout(prepareLater, 180);
  }

  // Decode proof images while the intro is idle so the second reveal has no flash/loading.
  document.querySelectorAll('.proof-card img').forEach(img => {
    if (img.decode) img.decode().catch(() => {});
  });
})();
