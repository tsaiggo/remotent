/* Remotent — interactivity for the prototype.
   - Left sidebar items are sessions (one <li class="thread"> per session).
   - Click a session to swap the canvas content (mocked data).
   - The composer at the bottom appends new human turns and schedules a
     simulated agent reply, all against the currently selected session. */
(() => {
  'use strict';

  /* ============================================================
     Mock session data — keyed by data-session-id on each thread.
     Each turn supports: { kind: 'human' | 'agent',
       who, role, time, node, avatar, tools, text, terminal,
       artifact, streaming } (most fields optional).
     ============================================================ */
  const SESSIONS = {
    orbital: {
      crumb: 'Orbital telemetry refactor',
      kicker: 'Session 0241 · started 02:14 UTC',
      titleSerif: 'Orbital telemetry',
      titleSans: ' refactor.',
      lede:
        'Three agents collaborating with you to migrate the legacy <code>/v1</code> ingest path ' +
        'onto the new streaming runtime — without dropping a single packet.',
      nodes: [
        { name: 'dev',      kind: 'dev',      live: true,  title: 'Dev node — streaming' },
        { name: 'design',   kind: 'design',   live: true,  title: 'Design node — streaming' },
        { name: 'research', kind: 'research', live: false, title: 'Research node — idle' },
      ],
      turns: [
        {
          kind: 'human', who: 'Wen', role: 'human', time: '02:14:06',
          text: 'Bring up the three nodes. Goal: replace the v1 ingest with the streaming runtime, keep packet loss under 0.01 %, and produce a migration brief by EOD.',
        },
        {
          kind: 'agent', node: 'dev', who: 'dev.node',
          role: 'agent · gpt-codex', roleClass: 'dev',
          time: '02:14:12', tools: ['repo.read', 'shell'],
          text:
            'Inspecting <code>services/ingest-v1</code>. The hot path is in <code>pipeline.go:142</code> — a single goroutine fans in 14 partitions. Proposing to split fan-in across N workers and replace the <em>at-least-once</em> ack with the new <em>exactly-once</em> primitive.',
          terminal: [
            { type: 'prompt', cmd: 'acp.tool/shell' },
            { type: 'line',   text: '$ rg "fan_in" services/ingest-v1 -l' },
            { type: 'out',    text: 'services/ingest-v1/pipeline.go\nservices/ingest-v1/internal/router.go' },
            { type: 'line',   text: '$ go test ./services/ingest-v1/... -run Stream -count=1' },
            { type: 'out',    text: 'ok   services/ingest-v1/internal     0.412s\nok   services/ingest-v1/pipeline     1.804s' },
            { type: 'stream', text: 'drafting patch' },
          ],
        },
        {
          kind: 'agent', node: 'design', who: 'design.node',
          role: 'agent · claude-opus', roleClass: 'design',
          time: '02:14:18', tools: ['figma.read'],
          text:
            'Re-aligning the operator console to surface partition health as a first-class signal. Replacing the legacy donut with a hairline sparkline strip — same data, a tenth of the visual weight.',
          artifact: { caption: 'partition.health · last 60 min', meta: '▲ 4.2% · variance 0.011' },
        },
        {
          kind: 'agent', node: 'research', quiet: true, who: 'research.node',
          role: 'agent · gemini', time: '02:14:21',
          text: 'Surfaced 3 prior post-mortems on exactly-once delivery (Kafka 2.0, NATS JetStream, Pulsar). Citations queued — <a href="#">expand 3 refs</a>.',
        },
        {
          kind: 'human', who: 'Wen', role: 'human', time: '02:14:27',
          text: 'Ship the patch behind a feature flag — <code>ingest.v2</code> — and start with the <em>design</em> sparkline rollout on the operator console. Keep the Pulsar reference handy.',
        },
        {
          kind: 'agent', node: 'dev', who: 'dev.node',
          role: 'streaming', roleClass: 'dev',
          time: '02:14:33', streaming: true, live: true,
          text: 'Patch ready. Splitting fan-in into <code>runtime.NumCPU()</code> workers, draining via context cancellation, and gating commits behind the new ack primitive. Estimated cut-over window',
        },
      ],
    },

    'q3-brief': {
      crumb: 'Q3 research brief — Wen',
      kicker: 'Session 0198 · drafted yesterday',
      titleSerif: 'Q3 research brief',
      titleSans: ' — Wen.',
      lede: 'Outline approved. Pending citations from the research node before final hand-off to the editorial review.',
      nodes: [
        { name: 'research', kind: 'research', live: false, title: 'Research node — idle' },
      ],
      turns: [
        { kind: 'human', who: 'Wen', role: 'human', time: '11:02:14',
          text: 'Draft the Q3 narrative around three themes: streaming runtime, agent collaboration, and operator ergonomics. Keep it under 1,200 words.' },
        { kind: 'agent', node: 'research', who: 'research.node',
          role: 'agent · gemini', time: '11:02:42', tools: ['arxiv.search', 'notion.read'],
          text: 'Outline ready. 14 candidate citations queued — 6 strong (high recency + co-citation density), 8 supporting. Want me to expand the Pulsar / JetStream comparison?' },
        { kind: 'human', who: 'Wen', role: 'human', time: '11:05:01',
          text: 'Yes — focus on the <em>exactly-once</em> trade-offs. Skip anything older than 2022.' },
      ],
    },

    'design-audit': {
      crumb: 'Design system audit',
      kicker: 'Session 0233 · opened 11:02',
      titleSerif: 'Design system',
      titleSans: ' audit.',
      lede: 'Awaiting human review on the token diff. Two contrast regressions flagged on the operator console.',
      nodes: [
        { name: 'design', kind: 'design', live: false, title: 'Design node — awaiting review' },
      ],
      turns: [
        { kind: 'agent', node: 'design', who: 'design.node',
          role: 'agent · claude-opus', roleClass: 'design', time: '10:58:12', tools: ['figma.read'],
          text: 'Ran the token audit against the operator console. <strong>2 regressions</strong>: <code>--ink-3</code> on <code>--bg-2</code> drops to 3.8:1, and the warn chip lost its outline on hover.' },
        { kind: 'human', who: 'Wen', role: 'human', time: '11:01:48',
          text: 'Promote <code>--ink-3</code> by one step and reinstate the hairline outline on the warn chip. Diff me the patch.' },
      ],
    },

    'citation-crawler': {
      crumb: 'Citation crawler · arxiv-2411',
      kicker: 'Session 0229 · indexing 09:47',
      titleSerif: 'Citation crawler',
      titleSans: ' · arxiv-2411.',
      lede: '142 sources indexed so far. Filtering for streaming-runtime relevance before promoting candidates to the research drawer.',
      nodes: [
        { name: 'research', kind: 'research', live: true, title: 'Research node — streaming' },
      ],
      turns: [
        { kind: 'human', who: 'Wen', role: 'human', time: '09:46:02',
          text: 'Crawl the November arxiv batch for streaming-runtime papers. De-dup against our existing library.' },
        { kind: 'agent', node: 'research', who: 'research.node',
          role: 'agent · gemini', time: '09:47:11', tools: ['arxiv.search'],
          text: '142 sources indexed, 18 promoted as high-relevance. Top hit: <em>"Backpressure-aware exactly-once delivery"</em> (NSDI ’25).' },
      ],
    },

    'pair-hana': {
      crumb: 'Pair review — Hana',
      kicker: 'Session 0224 · 08:30',
      titleSerif: 'Pair review',
      titleSans: ' — Hana.',
      lede: 'Routing layer walkthrough postponed to tomorrow. Notes captured for the next sync.',
      nodes: [],
      turns: [
        { kind: 'human', who: 'Hana', role: 'human', time: '08:30:00',
          text: 'Let’s revisit the routing layer tomorrow — I want to walk through the fallback paths together.' },
        { kind: 'human', who: 'Wen',  role: 'human', time: '08:31:24',
          text: 'Works for me. I’ll prep a one-pager with the current branches.' },
      ],
    },

    'build-triage': {
      crumb: 'Build pipeline triage',
      kicker: 'Session 0211 · resolved Mon',
      titleSerif: 'Build pipeline',
      titleSans: ' triage.',
      lede: 'Resolved — 4 patches merged. Pipeline green across all matrix entries.',
      nodes: [
        { name: 'dev', kind: 'dev', live: false, title: 'Dev node — idle' },
      ],
      turns: [
        { kind: 'human', who: 'Wen', role: 'human', time: '14:02:18',
          text: 'CI is red on <code>main</code>. Three flakes on the integration matrix — find a root cause.' },
        { kind: 'agent', node: 'dev', who: 'dev.node',
          role: 'agent · gpt-codex', roleClass: 'dev', time: '14:04:51', tools: ['shell', 'gh.read'],
          text: 'Root cause: shared port in <code>integration_test.go</code>. Patched with a per-test listener, plus 3 unrelated lint fixes. All green now.' },
      ],
    },

    'onboarding-mira': {
      crumb: 'Onboarding — Mira',
      kicker: 'Session 0203 · Sun',
      titleSerif: 'Onboarding',
      titleSans: ' — Mira.',
      lede: 'Access provisioned, welcome doc sent. Awaiting first PR.',
      nodes: [],
      turns: [
        { kind: 'human', who: 'Wen', role: 'human', time: '15:10:00',
          text: 'Welcome to the team, Mira! Your access is provisioned — start with the onboarding doc in the wiki.' },
        { kind: 'human', who: 'Mira', role: 'human', time: '15:12:33',
          text: 'Thanks! Reading through now — will open my first PR before EOD Monday.' },
      ],
    },
  };

  /* ============================================================
     SVG snippets reused inside rendered turns.
     ============================================================ */
  const SVG = {
    dev: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m8 6-6 6 6 6M16 6l6 6-6 6"/></svg>',
    design: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></svg>',
    research: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></svg>',
    sparkline:
      '<svg viewBox="0 0 320 64" preserveAspectRatio="none">' +
      '<defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0%" stop-color="#a78bfa" stop-opacity=".55"/>' +
      '<stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="M0,46 L20,40 40,44 60,30 80,34 100,22 120,28 140,18 160,24 180,14 200,20 220,10 240,18 260,8 280,16 300,6 320,12 L320,64 L0,64 Z" fill="url(#g1)"/>' +
      '<path d="M0,46 L20,40 40,44 60,30 80,34 100,22 120,28 140,18 160,24 180,14 200,20 220,10 240,18 260,8 280,16 300,6 320,12" fill="none" stroke="#a78bfa" stroke-width="1"/>' +
      '</svg>',
  };

  const HUMAN_AVATAR_URL = 'https://github.com/user-attachments/assets/ee226c0a-c50d-44d5-b97b-52808f1b3c85';
  const AGENT_AVATAR = {
    dev:      'assets/avatars/dev.png',
    design:   'assets/avatars/design.png',
    research: 'assets/avatars/research.png',
    agent:    'assets/avatars/agent.png',
  };

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Render a single turn to an HTML string. */
  function turnHtml(turn) {
    const isHuman = turn.kind === 'human';
    const node = turn.node || '';
    const humanAvatarImg = `<img class="turn__avatar-img" src="${HUMAN_AVATAR_URL}" alt="">`;
    const agentAvatarUrl = AGENT_AVATAR[node] || AGENT_AVATAR.agent;
    const agentAvatarImg = `<img class="turn__avatar-img" src="${agentAvatarUrl}" alt="">`;
    const avatarInner = isHuman ? humanAvatarImg : agentAvatarImg;
    const avatarClass = isHuman
      ? 'turn__avatar'
      : `turn__avatar turn__avatar--${node}${turn.live ? ' is-live' : ''}`;

    const classes = ['turn', isHuman ? 'turn--human' : 'turn--agent'];
    if (turn.quiet) classes.push('turn--quiet');
    if (turn.streaming) classes.push('turn--streaming');

    const roleClass = turn.roleClass ? ` turn__role--${turn.roleClass}` : '';
    const live = turn.streaming ? '<span class="live-dot" aria-hidden="true"></span>' : '';

    const tools =
      turn.tools && turn.tools.length
        ? `<span class="turn__tools">${turn.tools.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('')}</span>`
        : '';

    let extra = '';
    if (turn.terminal) {
      const lines = turn.terminal
        .map((seg) => {
          if (seg.type === 'prompt') return `<span class="t-prompt">${escapeHtml(turn.who || 'node')} ▸</span> <span class="t-cmd">${escapeHtml(seg.cmd)}</span>`;
          if (seg.type === 'line')   return `<span class="t-line">${escapeHtml(seg.text)}</span>`;
          if (seg.type === 'out')    return `<span class="t-out">${escapeHtml(seg.text)}</span>`;
          if (seg.type === 'stream') return `<span class="t-prompt">${escapeHtml(turn.who || 'node')} ▸</span> <span class="t-stream">${escapeHtml(seg.text)}<span class="t-caret">▍</span></span>`;
          return '';
        })
        .join('\n');
      extra += `<pre class="terminal" aria-label="${escapeHtml(turn.who || 'terminal')}">${lines}</pre>`;
    }
    if (turn.artifact) {
      extra +=
        `<figure class="artifact">` +
        `<div class="artifact__chart" aria-hidden="true">${SVG.sparkline}</div>` +
        `<figcaption><span>${escapeHtml(turn.artifact.caption)}</span>` +
        `<span class="artifact__meta">${escapeHtml(turn.artifact.meta)}</span></figcaption>` +
        `</figure>`;
    }

    const caret = turn.streaming ? '<span class="caret">▍</span>' : '';
    const proseClass = turn.quiet ? 'prose prose--quiet' : 'prose';
    const timeId = turn.streaming ? ' id="liveClock"' : '';
    const proseId = turn.streaming ? ' id="streamText"' : '';

    return `
      <li class="${classes.join(' ')}"${node ? ` data-node="${node}"` : ''}>
        <div class="turn__gutter">
          <span class="${avatarClass}" aria-hidden="true">${avatarInner}</span>
          ${turn.streaming ? '' : '<span class="turn__rail" aria-hidden="true"></span>'}
        </div>
        <div class="turn__body">
          <header class="turn__head">
            <span class="turn__who">${escapeHtml(turn.who || '')}</span>
            <span class="turn__role${roleClass}">${escapeHtml(turn.role || '')}</span>
            ${live}
            <time class="turn__time"${timeId}>${escapeHtml(turn.time || '')}</time>
            ${tools}
          </header>
          <p class="${proseClass}"${proseId}>${turn.text || ''}${caret}</p>
          ${extra}
        </div>
      </li>`;
  }

  /* ============================================================
     Canvas renderer
     ============================================================ */
  const els = {
    crumb:    document.getElementById('crumbCurrent'),
    title:    document.getElementById('canvasTitle'),
    nodes:    document.getElementById('canvasNodes'),
    timeline: document.getElementById('timeline'),
  };

  // Preserve the trailing icon buttons (share/branch/more) of canvasNodes.
  const NODE_TRAILING = els.nodes
    ? Array.from(els.nodes.children).filter(
        (c) => c.classList.contains('canvas__divider') || c.classList.contains('canvas__icon')
      )
    : [];

  function renderNodes(nodes) {
    if (!els.nodes) return;
    els.nodes.innerHTML = '';
    nodes.forEach((n) => {
      const span = document.createElement('span');
      span.className = `node node--${n.kind}`;
      span.title = n.title || '';
      if (n.live) span.innerHTML = `<span class="node__pulse"></span>${escapeHtml(n.name)}`;
      else span.textContent = n.name;
      els.nodes.appendChild(span);
    });
    NODE_TRAILING.forEach((el) => els.nodes.appendChild(el));
  }

  function renderTitle(s) {
    if (!els.title) return;
    els.title.innerHTML =
      `<p class="kicker">${escapeHtml(s.kicker || '')} <span class="kicker__dot"></span></p>` +
      `<h2 class="display"><span class="display__serif">${escapeHtml(s.titleSerif || '')}</span>` +
      `<span class="display__sans">${escapeHtml(s.titleSans || '')}</span></h2>` +
      (s.lede ? `<p class="lede">${s.lede}</p>` : '');
  }

  let currentSessionId = null;

  function renderSession(id) {
    const s = SESSIONS[id];
    if (!s) return;
    currentSessionId = id;
    if (els.crumb) els.crumb.textContent = s.crumb || '';
    renderNodes(s.nodes || []);
    renderTitle(s);
    if (els.timeline) {
      els.timeline.innerHTML = s.turns.map(turnHtml).join('');
      els.timeline.scrollTop = 0;
    }
  }

  /* ============================================================
     Sidebar wiring — tabs, pin, click-to-navigate, New session
     ============================================================ */
  const tabs = document.querySelectorAll('.tabs__btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      const filter = tab.dataset.filter;
      document.querySelectorAll('.thread').forEach((row) => {
        const kind = row.dataset.kind;
        const show = filter === 'all' || filter === kind;
        row.style.display = show ? '' : 'none';
      });
    });
  });

  function bindThread(row) {
    row.addEventListener('click', () => {
      document.querySelectorAll('.thread').forEach((r) => r.classList.remove('is-active'));
      row.classList.add('is-active');
      const id = row.dataset.sessionId;
      if (id) renderSession(id);
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        row.click();
      }
    });
    const pin = row.querySelector('.thread__pin');
    if (pin) {
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        pin.classList.toggle('is-on');
        const on = pin.classList.contains('is-on');
        pin.setAttribute('aria-label', on ? 'Unpin' : 'Pin');
        pin.title = on ? 'Pinned' : 'Pin';
      });
    }
  }
  document.querySelectorAll('.thread').forEach(bindThread);

  /* New session button — prepend a fresh session into Today. */
  const newBtn = document.getElementById('newSessionBtn');
  const todayList = document.getElementById('todayList');
  let newCounter = 0;
  if (newBtn && todayList) {
    newBtn.addEventListener('click', () => {
      newCounter += 1;
      const id = `draft-${Date.now()}-${newCounter}`;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      SESSIONS[id] = {
        crumb: `New session ${newCounter}`,
        kicker: `Session draft · started ${hhmm}`,
        titleSerif: 'New session',
        titleSans: ` ${newCounter}.`,
        lede: 'A blank canvas. Direct the swarm from the composer below — your first turn shapes the session.',
        nodes: [],
        turns: [],
      };

      const li = document.createElement('li');
      li.className = 'thread';
      li.dataset.kind = 'human';
      li.dataset.sessionId = id;
      li.tabIndex = 0;
      li.innerHTML =
        '<span class="thread__dot is-live" aria-hidden="true"></span>' +
        '<div class="thread__body">' +
          '<div class="thread__row">' +
            `<span class="thread__title">New session ${newCounter}</span>` +
            `<time class="thread__time">${hhmm}</time>` +
          '</div>' +
          '<p class="thread__snippet"><span class="tag tag--human">human</span>Draft — empty timeline.</p>' +
        '</div>' +
        '<button class="thread__pin" aria-label="Pin"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 2l8 8-5 1-4 4-1 5-2-2-5 5-1-1 5-5-2-2 5-1 4-4z"/></svg></button>';
      todayList.prepend(li);
      bindThread(li);
      li.click();
    });
  }

  /* ============================================================
     Live clock + simulated streaming text. These re-resolve their
     DOM targets every tick so they keep working as sessions swap.
     ============================================================ */
  setInterval(() => {
    const clock = document.getElementById('liveClock');
    if (!clock) return;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    clock.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  }, 1000);

  const STREAM_PHRASES = [
    'Patch ready. Splitting fan-in into runtime.NumCPU() workers, draining via context cancellation, and gating commits behind the new ack primitive.',
    'Verifying packet integrity across 14 partitions — loss currently 0.004 %, well under target.',
    'Drafting the migration brief now. Three sections: rationale, rollout windows, fallback paths.',
    'Design node is staging the updated operator console — preview will land in this thread momentarily.',
  ];
  let sPi = 0, sCi = 0, sMode = 'type', sHold = 0;
  setInterval(() => {
    const el = document.getElementById('streamText');
    if (!el) return;
    const target = STREAM_PHRASES[sPi];
    if (sMode === 'type') {
      sCi++;
      if (sCi >= target.length) { sMode = 'hold'; sHold = 0; }
    } else if (sMode === 'hold') {
      sHold++;
      if (sHold > 40) sMode = 'erase';
    } else {
      sCi = Math.max(0, sCi - 3);
      if (sCi === 0) { sPi = (sPi + 1) % STREAM_PHRASES.length; sMode = 'type'; }
    }
    const text = target
      .slice(0, sCi)
      .replace(/runtime\.NumCPU\(\)/g, '<code>runtime.NumCPU()</code>');
    el.innerHTML = text + '<span class="caret">▍</span>';
  }, 55);

  /* ============================================================
     Composer — append a human turn to the current session,
     then schedule a mock agent reply.
     ============================================================ */
  const form = document.getElementById('composer');
  const input = document.getElementById('composerInput');

  function nowClock() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function appendTurn(turn) {
    const s = SESSIONS[currentSessionId];
    if (!s) return;
    s.turns.push(turn);
    if (els.timeline) {
      els.timeline.insertAdjacentHTML('beforeend', turnHtml(turn));
      els.timeline.scrollTop = els.timeline.scrollHeight;
    }
  }

  const AGENT_REPLIES = [
    { node: 'dev',      who: 'dev.node',      role: 'agent · gpt-codex',  roleClass: 'dev',
      text: 'Acknowledged. Drafting a patch and running the affected suite in the background.' },
    { node: 'design',   who: 'design.node',   role: 'agent · claude-opus', roleClass: 'design',
      text: 'Got it — I’ll stage a visual diff on the operator console and surface anything that drifts from the token contract.' },
    { node: 'research', who: 'research.node', role: 'agent · gemini',
      text: 'On it. I’ll surface the top citations and flag any that contradict the current direction.' },
  ];

  if (form && input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      input.value = '';

      appendTurn({
        kind: 'human', who: 'Wen', role: 'human',
        time: nowClock(), text: escapeHtml(value),
      });

      const reply = AGENT_REPLIES[Math.floor(Math.random() * AGENT_REPLIES.length)];
      const replyForSession = currentSessionId;
      setTimeout(() => {
        // Only deliver the reply if the user is still viewing that session.
        if (currentSessionId !== replyForSession) {
          // Still record it in the session's data so it appears when revisited.
          SESSIONS[replyForSession]?.turns.push({
            kind: 'agent', node: reply.node, who: reply.who,
            role: reply.role, roleClass: reply.roleClass,
            time: nowClock(), text: reply.text,
          });
          return;
        }
        appendTurn({
          kind: 'agent', node: reply.node, who: reply.who,
          role: reply.role, roleClass: reply.roleClass,
          time: nowClock(), text: reply.text,
        });
      }, 900);
    });

    // ⌘K / Ctrl+K to focus search.
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.querySelector('.sessions__search input')?.focus();
      }
    });
  }

  /* ============================================================
     Initial paint — render the active session (matches markup).
     ============================================================ */
  const initial = document.querySelector('.thread.is-active')?.dataset.sessionId || 'orbital';
  renderSession(initial);

  /* ============================================================
     ░░░ Node Overview ░░░
     A second view that lives in columns 2 + 3 (toggled via the
     `[hidden]` attribute on `.sessions`/`.canvas` vs `.nodes-panel`/
     `.canvas--node`). Each ACP node is a first-class agent record;
     sessions reference nodes by name and aggregate their status.
     ============================================================ */

  const NODES = {
    'dev.node': {
      name: 'dev.node', kind: 'dev', model: 'gpt-codex',
      role: 'agent · gpt-codex', persona: 'Streaming-runtime specialist',
      lede: 'A hands-on engineering node. Patches code, runs tests, and gates merges behind ACP ack primitives. Defaults to <em>at-least-once</em> caution, escalates to humans for irreversible writes.',
      createdAt: '02:14 UTC', owner: 'Wen',
      endpoint: 'acp://fleet.local/dev',
      contextWindow: '128k tokens', memoryItems: 412,
      systemPrompt:
        'You are dev.node, an autonomous engineer on the Remotent fleet.\n' +
        'Mandate: keep services green, ship small reversible patches, never bypass review on production paths.\n' +
        'Tools: prefer repo.read before shell; gate writes behind ack.exactly_once.\n' +
        'Style: terse, mono-spaced diffs, link the failing test before the fix.',
      tools: [
        { name: 'acp.tool/shell', scope: 'write', calls24h: 142 },
        { name: 'repo.read',      scope: 'read',  calls24h: 318 },
        { name: 'gh.read',        scope: 'read',  calls24h: 64  },
        { name: 'gh.write',       scope: 'write', calls24h: 12  },
      ],
      mcp: [
        { name: 'github://tsaiggo/remotent', meta: 'main · read/write' },
        { name: 'pg://telemetry/prod',       meta: 'read · 14 tables' },
      ],
      permissions: {
        humanInLoop: 'ask · for writes outside services/*',
        writePaths: ['services/**', 'cmd/**', 'internal/**'],
      },
    },

    'design.node': {
      name: 'design.node', kind: 'design', model: 'claude-opus',
      role: 'agent · claude-opus', persona: 'Token-system custodian',
      lede: 'Owns the hairline visual language. Audits tokens, runs contrast checks, and stages visual diffs on the operator console before they reach review.',
      createdAt: '02:14 UTC', owner: 'Wen',
      endpoint: 'acp://fleet.local/design',
      contextWindow: '200k tokens', memoryItems: 287,
      systemPrompt:
        'You are design.node. Guardian of the Remotent token system.\n' +
        'Mandate: enforce contrast ≥ 4.5:1 on operator surfaces, keep hairline language consistent across views.\n' +
        'Always cite the affected token (e.g. --ink-3) and propose a one-step promotion before any rewrite.',
      tools: [
        { name: 'figma.read',      scope: 'read',  calls24h: 96 },
        { name: 'tokens.diff',     scope: 'read',  calls24h: 41 },
        { name: 'acp.tool/render', scope: 'write', calls24h: 18 },
      ],
      mcp: [
        { name: 'figma://team/remotent', meta: 'console · read-only' },
        { name: 'tokens://main',         meta: 'v2.3.1 · diff stream' },
      ],
      permissions: {
        humanInLoop: 'ask · before any token promotion',
        writePaths: ['styles/**', 'tokens/**'],
      },
    },

    'research.node': {
      name: 'research.node', kind: 'research', model: 'gemini',
      role: 'agent · gemini', persona: 'Citation crawler & synthesizer',
      lede: 'Surfaces prior art, de-dups against the working library, and ranks candidates by recency × co-citation. Never writes to repos — only the research drawer.',
      createdAt: '02:14 UTC', owner: 'Wen',
      endpoint: 'acp://fleet.local/research',
      contextWindow: '1M tokens', memoryItems: 1842,
      systemPrompt:
        'You are research.node. A read-only synthesist.\n' +
        'Mandate: surface 3–7 high-signal sources per query, flag contradictions, never invent citations.\n' +
        'Format: title · venue · year · one-line claim. Drop everything older than the cut-off year.',
      tools: [
        { name: 'arxiv.search',    scope: 'read', calls24h: 211 },
        { name: 'notion.read',     scope: 'read', calls24h: 88  },
        { name: 'vector.query',    scope: 'read', calls24h: 502 },
      ],
      mcp: [
        { name: 'arxiv://2024-2025',    meta: 'CS.DC · 38k papers' },
        { name: 'notion://research-db', meta: 'read-only · 1.8k notes' },
        { name: 'vector://corpus',      meta: '142k chunks · cosine' },
      ],
      permissions: {
        humanInLoop: 'auto · read-only by design',
        writePaths: [],
      },
    },

    'editor.node': {
      name: 'editor.node', kind: 'design', model: 'claude-opus',
      role: 'agent · claude-opus', persona: 'Narrative & copy editor',
      lede: 'Sharpens drafts. Trims to a word budget, keeps voice consistent, never invents facts — only re-orders and prunes.',
      createdAt: '04:02 UTC', owner: 'Wen',
      endpoint: 'acp://fleet.local/editor',
      contextWindow: '200k tokens', memoryItems: 96,
      paused: true,
      systemPrompt:
        'You are editor.node. Improve clarity without altering meaning.\n' +
        'Prefer Anglo-Saxon roots, cut adverbs, keep sentences under 22 words when possible.',
      tools: [
        { name: 'notion.read',  scope: 'read',  calls24h: 12 },
        { name: 'notion.write', scope: 'write', calls24h: 4  },
      ],
      mcp: [
        { name: 'notion://drafts', meta: 'Q3 brief · read/write' },
      ],
      permissions: {
        humanInLoop: 'ask · on any structural rewrite',
        writePaths: ['notion://drafts/**'],
      },
    },
  };

  /* Aggregate session-level info into a per-node view: live in any
     session? which sessions referenced it? recent turns? */
  function nodeAggregates(nodeName) {
    const kind = NODES[nodeName]?.kind;
    const sessions = [];
    const recentTurns = [];
    let live = false;

    Object.entries(SESSIONS).forEach(([sid, s]) => {
      const usedHere = (s.nodes || []).find(
        (n) => `${n.name}.node` === nodeName || n.name === nodeName.replace(/\.node$/, '')
      );
      if (!usedHere) return;
      if (usedHere.live) live = true;
      sessions.push({
        id: sid,
        title: s.crumb || sid,
        kicker: s.kicker || '',
        live: !!usedHere.live,
      });
      (s.turns || []).forEach((t) => {
        const tnode = t.node ? `${t.node}.node` : null;
        if (tnode === nodeName) {
          recentTurns.push({ time: t.time, text: t.text, who: t.who });
        }
      });
    });

    return { sessions, recentTurns: recentTurns.slice(-4).reverse(), live };
  }

  function nodeStatus(name) {
    const n = NODES[name];
    if (!n) return 'error';
    if (n.paused) return 'paused';
    const agg = nodeAggregates(name);
    return agg.live ? 'live' : 'idle';
  }

  /* ---------- Rendering: node list ---------- */
  function nodeRowHtml(name) {
    const n = NODES[name];
    const agg = nodeAggregates(name);
    const status = nodeStatus(name);
    const dotClass = `node-row__dot is-${status} node-row__dot--${n.kind}`;
    const sessCount = agg.sessions.length;
    const toolCount = n.tools.length;
    const last = agg.recentTurns[0]?.time || '—';
    const pinned = NODE_PINS.has(name) ? ' is-on' : '';
    return (
      `<li class="node-row" data-node-id="${escapeHtml(name)}" data-status="${status}" tabindex="0" aria-label="${escapeHtml(name)} · ${status}">` +
        `<span class="${dotClass}" aria-hidden="true"></span>` +
        `<div class="node-row__body">` +
          `<div class="node-row__head">` +
            `<span class="node-row__name">${escapeHtml(n.name)}</span>` +
            `<span class="node-row__role">${escapeHtml(n.model)}</span>` +
          `</div>` +
          `<p class="node-row__meta">` +
            `<span class="tag tag--${escapeHtml(n.kind)}">${escapeHtml(n.kind)}</span>` +
            `<span>${sessCount} session${sessCount === 1 ? '' : 's'}</span>` +
            `<span class="sep">·</span>` +
            `<span>${toolCount} tool${toolCount === 1 ? '' : 's'}</span>` +
            `<span class="sep">·</span>` +
            `<span>${escapeHtml(last)}</span>` +
          `</p>` +
        `</div>` +
        `<button class="node-row__pin${pinned}" aria-label="${pinned ? 'Unpin' : 'Pin'}" title="${pinned ? 'Pinned' : 'Pin'}">` +
          `<svg viewBox="0 0 24 24" width="12" height="12" fill="${pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.4"><path d="M14 2l8 8-5 1-4 4-1 5-2-2-5 5-1-1 5-5-2-2 5-1 4-4z"/></svg>` +
        `</button>` +
      `</li>`
    );
  }

  const NODE_PINS = new Set(['dev.node']);

  const nodeEls = {
    panel:        document.querySelector('.nodes-panel'),
    canvas:       document.querySelector('.canvas--node'),
    listPinned:   document.getElementById('nodeListPinned'),
    listAll:      document.getElementById('nodeListAll'),
    fleetMeta:    document.getElementById('nodesFleetMeta'),
    search:       document.getElementById('nodesSearch'),
    newBtn:       document.getElementById('newNodeBtn'),
    crumb:        document.getElementById('nodeCrumb'),
    statusBar:    document.getElementById('nodeStatus'),
    titleSerif:   document.getElementById('nodeNameSerif'),
    titleSans:    document.getElementById('nodeNameSans'),
    kicker:       document.getElementById('nodeKicker'),
    lede:         document.getElementById('nodeLede'),
    meta:         document.getElementById('nodeMeta'),
    detail:       document.getElementById('nodeDetail'),
  };

  let currentNodeId = null;
  let currentNodeFilter = 'all';
  let currentNodeSearch = '';

  function refreshFleetMeta() {
    const all = Object.keys(NODES);
    const counts = { all: all.length, live: 0, idle: 0, paused: 0, error: 0 };
    all.forEach((n) => { counts[nodeStatus(n)] += 1; });
    if (nodeEls.fleetMeta) {
      nodeEls.fleetMeta.textContent =
        `ACP fleet · ${counts.live} online / ${counts.all} total`;
    }
    document.querySelectorAll('[data-count-for]').forEach((el) => {
      const k = el.dataset.countFor;
      el.textContent = String(counts[k] || 0).padStart(2, '0');
    });
  }

  function renderNodeList() {
    if (!nodeEls.listAll || !nodeEls.listPinned) return;
    const names = Object.keys(NODES);
    const q = currentNodeSearch.trim().toLowerCase();
    const matches = (name) => {
      if (currentNodeFilter !== 'all' && nodeStatus(name) !== currentNodeFilter) return false;
      if (!q) return true;
      const n = NODES[name];
      const hay = [name, n.model, n.kind, ...(n.tools || []).map((t) => t.name)].join(' ').toLowerCase();
      return hay.includes(q);
    };
    const pinned = names.filter((n) => NODE_PINS.has(n) && matches(n));
    const rest   = names.filter((n) => !NODE_PINS.has(n) && matches(n));
    nodeEls.listPinned.innerHTML = pinned.map(nodeRowHtml).join('') ||
      '<li class="empty-hint" style="padding:6px 8px">No pinned nodes.</li>';
    nodeEls.listAll.innerHTML = rest.map(nodeRowHtml).join('') ||
      '<li class="empty-hint" style="padding:6px 8px">No nodes match this filter.</li>';
    [nodeEls.listPinned, nodeEls.listAll].forEach((ul) => {
      ul.querySelectorAll('.node-row').forEach(bindNodeRow);
    });
    // Mark the active row
    document.querySelectorAll('.node-row').forEach((r) => {
      r.classList.toggle('is-active', r.dataset.nodeId === currentNodeId);
    });
  }

  function bindNodeRow(row) {
    row.addEventListener('click', () => {
      renderNodeDetail(row.dataset.nodeId);
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
    });
    const pin = row.querySelector('.node-row__pin');
    if (pin) {
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = row.dataset.nodeId;
        if (NODE_PINS.has(id)) NODE_PINS.delete(id);
        else NODE_PINS.add(id);
        renderNodeList();
      });
    }
  }

  /* Tiny sparkline path generator (deterministic from a string seed). */
  function sparkPath(seed, w, h) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s >>> 8) / 0xffffff; };
    const pts = 24;
    const xs = (i) => (i / (pts - 1)) * w;
    const ys = (v) => h - 4 - v * (h - 8);
    let d = '';
    for (let i = 0; i < pts; i++) {
      const v = 0.25 + rand() * 0.7;
      d += (i === 0 ? 'M' : 'L') + xs(i).toFixed(1) + ',' + ys(v).toFixed(1) + ' ';
    }
    return d.trim();
  }

  function sparkSvg(seed, color) {
    const w = 200, h = 32;
    const d = sparkPath(seed, w, h);
    return (
      `<svg class="telemetry__spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">` +
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="1"/>` +
      `</svg>`
    );
  }

  function renderNodeDetail(name) {
    if (!NODES[name]) return;
    currentNodeId = name;
    const n = NODES[name];
    const agg = nodeAggregates(name);
    const status = nodeStatus(name);

    document.querySelectorAll('.node-row').forEach((r) => {
      r.classList.toggle('is-active', r.dataset.nodeId === name);
    });

    if (nodeEls.crumb) nodeEls.crumb.textContent = n.name;
    if (nodeEls.titleSerif) nodeEls.titleSerif.textContent = n.name.replace(/\.node$/, '');
    if (nodeEls.titleSans)  nodeEls.titleSans.textContent  = '.node';
    if (nodeEls.kicker) {
      const label = status === 'live' ? 'Streaming' : status === 'paused' ? 'Paused' : status === 'error' ? 'Error' : 'Idle';
      nodeEls.kicker.innerHTML = `${escapeHtml(n.persona)} <span class="kicker__dot"></span> ${label}`;
    }
    if (nodeEls.lede) nodeEls.lede.innerHTML = n.lede;

    // Status bar — pulse, endpoint, action buttons
    if (nodeEls.statusBar) {
      const pulseClass = `node node--${n.kind}`;
      const pulse = status === 'live'
        ? `<span class="${pulseClass}"><span class="node__pulse"></span>${escapeHtml(status)}</span>`
        : `<span class="${pulseClass}">${escapeHtml(status)}</span>`;
      const pauseLabel = n.paused ? 'Resume' : 'Pause';
      nodeEls.statusBar.innerHTML =
        `<span class="node-status">${pulse}` +
          `<span class="node-status__endpoint">${escapeHtml(n.endpoint)}</span>` +
        `</span>` +
        `<span class="node-status__sep" aria-hidden="true"></span>` +
        `<button class="node-status__btn" data-act="toggle-pause" type="button">${pauseLabel}</button>` +
        `<button class="node-status__btn" data-act="restart" type="button">Restart</button>` +
        `<button class="node-status__btn" data-act="clone" type="button">Clone</button>` +
        `<button class="node-status__btn node-status__btn--danger" data-act="archive" type="button">Archive</button>`;
      nodeEls.statusBar.querySelectorAll('button[data-act]').forEach((b) => {
        b.addEventListener('click', () => handleNodeAction(name, b.dataset.act));
      });
    }

    if (nodeEls.meta) {
      nodeEls.meta.innerHTML =
        `<li>model · <b>${escapeHtml(n.model)}</b></li>` +
        `<li>runtime · <b>ACP v0.2</b></li>` +
        `<li>created · <b>${escapeHtml(n.createdAt)}</b></li>` +
        `<li>owner · <b>${escapeHtml(n.owner)}</b></li>`;
    }

    // Sections: Capabilities + Activity
    const toolGrid = n.tools.map((t) => (
      `<div class="tool-chip">` +
        `<span class="tool-chip__name">` +
          `<span class="tool-chip__scope tool-chip__scope--${escapeHtml(t.scope)}">${escapeHtml(t.scope)}</span>` +
          `${escapeHtml(t.name)}` +
        `</span>` +
        `<span class="tool-chip__meta">${t.calls24h} · 24h</span>` +
      `</div>`
    )).join('') || '<div class="empty-hint">No tools granted.</div>';

    const mcpGrid = n.mcp.map((m) => (
      `<div class="mcp-chip">` +
        `<span class="mcp-chip__name">${escapeHtml(m.name)}</span>` +
        `<span class="mcp-chip__meta">${escapeHtml(m.meta)}</span>` +
      `</div>`
    )).join('') || '<div class="empty-hint">No external resources mounted.</div>';

    const writeList = (n.permissions.writePaths || []).length
      ? n.permissions.writePaths.map((p) => `<code>${escapeHtml(p)}</code>`).join(' ')
      : '<span class="empty-hint">Read-only.</span>';

    const sessionList = agg.sessions.length
      ? `<ul class="node-sessions">` + agg.sessions.map((s) => (
          `<li><a href="#" data-jump-session="${escapeHtml(s.id)}">` +
            `<span class="node-sessions__title">${escapeHtml(s.title)}</span>` +
            `<span class="node-sessions__meta">${s.live ? 'live · ' : ''}${escapeHtml(s.kicker)}</span>` +
          `</a></li>`
        )).join('') + `</ul>`
      : '<div class="empty-hint">No sessions reference this node yet.</div>';

    const turnsList = agg.recentTurns.length
      ? `<ul class="node-turns">` + agg.recentTurns.map((t) => (
          `<li class="node-turn">` +
            `<span class="node-turn__time">${escapeHtml(t.time || '')}</span>` +
            `<span class="node-turn__body">${t.text || ''}</span>` +
          `</li>`
        )).join('') + `</ul>`
      : '<div class="empty-hint">No recent turns recorded.</div>';

    const sparkColor =
      n.kind === 'dev'      ? 'var(--green-ink)' :
      n.kind === 'design'   ? 'var(--purple-ink)' :
      n.kind === 'research' ? 'var(--blue-ink)' : 'var(--ink-2)';

    const telemetry =
      `<div class="telemetry">` +
        `<div class="telemetry__card">` +
          `<div class="telemetry__head"><span class="telemetry__label">tokens / min</span><span class="telemetry__value">${1200 + (n.name.length * 37) % 800}</span></div>` +
          sparkSvg(n.name + ':tok', sparkColor) +
        `</div>` +
        `<div class="telemetry__card">` +
          `<div class="telemetry__head"><span class="telemetry__label">tool-call success</span><span class="telemetry__value">${(94 + ((n.name.length * 7) % 5)).toFixed(0)}.${((n.name.length * 3) % 9)}%</span></div>` +
          sparkSvg(n.name + ':ok', sparkColor) +
        `</div>` +
        `<div class="telemetry__card">` +
          `<div class="telemetry__head"><span class="telemetry__label">avg turn latency</span><span class="telemetry__value">${(0.8 + ((n.name.length % 9) / 10)).toFixed(2)}s</span></div>` +
          sparkSvg(n.name + ':lat', sparkColor) +
        `</div>` +
      `</div>`;

    nodeEls.detail.innerHTML =
      `<section class="node-section">` +
        `<div class="node-section__head">` +
          `<h3 class="node-section__title">Tools · ACP grants</h3>` +
          `<span class="node-section__hint">${n.tools.length} authorized</span>` +
        `</div>` +
        `<div class="chip-grid">${toolGrid}</div>` +
      `</section>` +

      `<section class="node-section">` +
        `<div class="node-section__head">` +
          `<h3 class="node-section__title">Resources · MCP &amp; data</h3>` +
          `<span class="node-section__hint">${n.mcp.length} mounted</span>` +
        `</div>` +
        `<div class="chip-grid">${mcpGrid}</div>` +
      `</section>` +

      `<section class="node-section">` +
        `<div class="node-section__head">` +
          `<h3 class="node-section__title">Memory &amp; context</h3>` +
        `</div>` +
        `<div class="stat-grid">` +
          `<div class="stat"><div class="stat__label">Context window</div><div class="stat__value">${escapeHtml(n.contextWindow)}</div></div>` +
          `<div class="stat"><div class="stat__label">Long-term memory</div><div class="stat__value">${n.memoryItems}</div><div class="stat__sub">items indexed</div></div>` +
        `</div>` +
        `<details class="node-prompt">` +
          `<summary>System prompt · preview</summary>` +
          `<div class="node-prompt__body">${escapeHtml(n.systemPrompt)}</div>` +
        `</details>` +
      `</section>` +

      `<section class="node-section">` +
        `<div class="node-section__head">` +
          `<h3 class="node-section__title">Permissions</h3>` +
        `</div>` +
        `<div class="stat-grid">` +
          `<div class="stat"><div class="stat__label">Human-in-loop</div><div class="stat__value" style="font-size:13px">${escapeHtml(n.permissions.humanInLoop)}</div></div>` +
          `<div class="stat"><div class="stat__label">Write paths</div><div class="stat__sub" style="margin-top:6px">${writeList}</div></div>` +
        `</div>` +
      `</section>` +

      `<section class="node-section">` +
        `<div class="node-section__head">` +
          `<h3 class="node-section__title">Sessions · appearances</h3>` +
          `<span class="node-section__hint">${agg.sessions.length} total</span>` +
        `</div>` +
        sessionList +
      `</section>` +

      `<section class="node-section">` +
        `<div class="node-section__head">` +
          `<h3 class="node-section__title">Recent turns</h3>` +
        `</div>` +
        turnsList +
      `</section>` +

      `<section class="node-section">` +
        `<div class="node-section__head">` +
          `<h3 class="node-section__title">Telemetry · last 60 min</h3>` +
        `</div>` +
        telemetry +
      `</section>`;

    // Wire session jumps
    nodeEls.detail.querySelectorAll('[data-jump-session]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const sid = a.dataset.jumpSession;
        switchView('hub');
        const row = document.querySelector(`.thread[data-session-id="${sid}"]`);
        if (row) row.click();
      });
    });
  }

  function handleNodeAction(name, act) {
    const n = NODES[name];
    if (!n) return;
    if (act === 'toggle-pause') {
      n.paused = !n.paused;
    } else if (act === 'restart') {
      n.paused = false;
    } else if (act === 'clone') {
      let i = 2;
      const base = name.replace(/\.node$/, '');
      while (NODES[`${base}-${i}.node`]) i++;
      const clone = JSON.parse(JSON.stringify(n));
      clone.name = `${base}-${i}.node`;
      clone.createdAt = nowClock() + ' local';
      clone.paused = true;
      NODES[clone.name] = clone;
      currentNodeId = clone.name;
    } else if (act === 'archive') {
      delete NODES[name];
      NODE_PINS.delete(name);
      const remaining = Object.keys(NODES);
      currentNodeId = remaining[0] || null;
    }
    refreshFleetMeta();
    renderNodeList();
    if (currentNodeId) renderNodeDetail(currentNodeId);
    else if (nodeEls.detail) nodeEls.detail.innerHTML = '<div class="empty-hint">No nodes in fleet. Create one with <strong>+ New</strong>.</div>';
  }

  /* ---------- View switching ---------- */
  function switchView(view) {
    const shell = document.querySelector('.shell');
    if (!shell) return;
    shell.dataset.view = view;
    document.querySelectorAll('.rail__btn[data-view-target]').forEach((b) => {
      const on = b.dataset.viewTarget === view;
      b.classList.toggle('is-active', on);
    });
    const hubSessions = document.querySelector('.sessions');
    const hubCanvas   = document.querySelector('.canvas:not(.canvas--node)');
    if (hubSessions) hubSessions.hidden = (view !== 'hub');
    if (hubCanvas)   hubCanvas.hidden   = (view !== 'hub');
    if (nodeEls.panel)  nodeEls.panel.hidden  = (view !== 'nodes');
    if (nodeEls.canvas) nodeEls.canvas.hidden = (view !== 'nodes');

    if (view === 'nodes') {
      refreshFleetMeta();
      renderNodeList();
      if (!currentNodeId) currentNodeId = Object.keys(NODES)[0];
      if (currentNodeId) renderNodeDetail(currentNodeId);
    }
  }

  document.querySelectorAll('.rail__btn[data-view-target]').forEach((b) => {
    b.addEventListener('click', () => switchView(b.dataset.viewTarget));
  });

  /* Wire filters + search + new-node */
  document.querySelectorAll('[data-node-filter]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-node-filter]').forEach((t) => {
        t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
      currentNodeFilter = tab.dataset.nodeFilter;
      renderNodeList();
    });
  });
  if (nodeEls.search) {
    nodeEls.search.addEventListener('input', () => {
      currentNodeSearch = nodeEls.search.value;
      renderNodeList();
    });
  }
  if (nodeEls.newBtn) {
    let nNew = 0;
    nodeEls.newBtn.addEventListener('click', () => {
      nNew += 1;
      const kinds = ['dev', 'design', 'research'];
      const kind = kinds[(nNew - 1) % kinds.length];
      const id = `node-${Date.now()}-${nNew}.node`;
      NODES[id] = {
        name: id, kind, model: 'unconfigured',
        role: 'agent · unconfigured',
        persona: 'New agent — configure persona, tools, and permissions.',
        lede: 'A blank node. Open the system prompt and grant tools to bring it online.',
        createdAt: nowClock() + ' local', owner: 'Wen',
        endpoint: `acp://fleet.local/${kind}-${nNew}`,
        contextWindow: '—', memoryItems: 0,
        paused: true,
        systemPrompt: 'You are a new Remotent agent. Awaiting persona.',
        tools: [], mcp: [],
        permissions: { humanInLoop: 'ask · everywhere by default', writePaths: [] },
      };
      currentNodeId = id;
      refreshFleetMeta();
      renderNodeList();
      renderNodeDetail(id);
    });
  }

  /* Canvas node chips → jump to node overview detail. We re-run after
     every renderNodes() call by wrapping it. */
  const _origRenderNodes = renderNodes;
  function renderNodesWithLinks(nodes) {
    _origRenderNodes(nodes);
    if (!els.nodes) return;
    els.nodes.querySelectorAll('.node').forEach((chip, i) => {
      const meta = nodes[i];
      if (!meta) return;
      const id = `${meta.name}.node`;
      if (!NODES[id]) return;
      chip.dataset.nodeLink = id;
      chip.style.cursor = 'pointer';
      chip.addEventListener('click', () => {
        currentNodeId = id;
        switchView('nodes');
      });
    });
  }
  // Monkey-patch the renderer used by renderSession.
  // (renderSession is a closure over `renderNodes`; instead of touching it,
  // hook into the live DOM by re-binding chips whenever the chips change.)
  const nodesObserver = els.nodes ? new MutationObserver(() => {
    els.nodes.querySelectorAll('.node').forEach((chip) => {
      if (chip.classList.contains('canvas__divider') || chip.classList.contains('canvas__icon')) return;
      // Derive node kind from class to construct the registry key.
      const kindMatch = Array.from(chip.classList).find((c) => c.startsWith('node--'));
      if (!kindMatch) return;
      const text = (chip.textContent || '').trim();
      if (!text) return;
      const id = `${text}.node`;
      if (!NODES[id] || chip.dataset.nodeLink === id) return;
      chip.dataset.nodeLink = id;
      chip.addEventListener('click', () => {
        currentNodeId = id;
        switchView('nodes');
      });
    });
  }) : null;
  if (nodesObserver && els.nodes) {
    nodesObserver.observe(els.nodes, { childList: true });
    // Initial pass for the markup already in the DOM.
    nodesObserver.takeRecords();
    els.nodes.querySelectorAll('.node').forEach((chip) => {
      const kindMatch = Array.from(chip.classList).find((c) => c.startsWith('node--'));
      if (!kindMatch) return;
      const text = (chip.textContent || '').trim();
      const id = `${text}.node`;
      if (!NODES[id]) return;
      chip.dataset.nodeLink = id;
      chip.addEventListener('click', () => {
        currentNodeId = id;
        switchView('nodes');
      });
    });
  }
  // Silence unused-var warning for the helper kept for documentation.
  void renderNodesWithLinks;

  // Prime fleet counts so the rail toggle shows correct numbers even
  // before the user enters the Nodes view.
  refreshFleetMeta();
})();
