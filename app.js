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
    dev:      'headers/acp_notion_avatar_08_long_hair_glasses.png',
    design:   'headers/acp_notion_avatar_06_high_bun_earrings.png',
    research: 'headers/acp_notion_avatar_05_wavy_hair_stubble.png',
    agent:    'headers/acp_notion_avatar_09_headset_support.png',
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
})();
