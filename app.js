/* Remotent — light interactivity for the static prototype */
(() => {
  'use strict';

  /* ---------- Session filter tabs ---------- */
  const tabs = document.querySelectorAll('.tabs__btn');
  const threads = document.querySelectorAll('.thread');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      const filter = tab.dataset.filter;
      threads.forEach((row) => {
        const kind = row.dataset.kind;
        const show = filter === 'all' || filter === kind;
        row.style.display = show ? '' : 'none';
      });
    });
  });

  /* ---------- Pin toggle ---------- */
  document.querySelectorAll('.thread__pin').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('is-on');
      const label = btn.classList.contains('is-on') ? 'Unpin' : 'Pin';
      btn.setAttribute('aria-label', label);
      btn.title = label === 'Unpin' ? 'Pinned' : 'Pin';
    });
  });

  /* ---------- Thread selection ---------- */
  threads.forEach((row) => {
    row.addEventListener('click', () => {
      threads.forEach((r) => r.classList.remove('is-active'));
      row.classList.add('is-active');
    });
  });

  /* ---------- Live clock ---------- */
  const clock = document.getElementById('liveClock');
  if (clock) {
    const tick = () => {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      clock.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Simulated streaming text ---------- */
  const streamEl = document.getElementById('streamText');
  if (streamEl) {
    const phrases = [
      'Patch ready. Splitting fan-in into runtime.NumCPU() workers, draining via context cancellation, and gating commits behind the new ack primitive.',
      'Verifying packet integrity across 14 partitions — loss currently 0.004 %, well under target.',
      'Drafting the migration brief now. Three sections: rationale, rollout windows, fallback paths.',
      'Design node is staging the updated operator console — preview will land in this thread momentarily.',
    ];
    let pi = 0;
    let ci = 0;
    let mode = 'type'; // type | hold | erase
    let hold = 0;

    const render = (text) => {
      streamEl.innerHTML =
        text.replace(/runtime\.NumCPU\(\)/g, '<code>runtime.NumCPU()</code>') +
        '<span class="caret">▍</span>';
    };

    const step = () => {
      const target = phrases[pi];
      if (mode === 'type') {
        ci++;
        render(target.slice(0, ci));
        if (ci >= target.length) { mode = 'hold'; hold = 0; }
      } else if (mode === 'hold') {
        hold++;
        if (hold > 40) { mode = 'erase'; }
      } else if (mode === 'erase') {
        ci = Math.max(0, ci - 3);
        render(target.slice(0, ci));
        if (ci === 0) {
          pi = (pi + 1) % phrases.length;
          mode = 'type';
        }
      }
    };
    setInterval(step, 55);
  }

  /* ---------- Composer ---------- */
  const form = document.getElementById('composer');
  const input = document.getElementById('composerInput');
  if (form && input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      input.value = '';
      input.placeholder = 'Routed to the swarm — listening…';
      input.style.transition = 'color .3s ease';
      input.style.color = 'var(--neon)';
      setTimeout(() => {
        input.style.color = '';
        input.placeholder = 'Direct the swarm — type a command, or / for tools…';
      }, 1200);
    });

    // ⌘K to focus search
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.querySelector('.sessions__search input')?.focus();
      }
    });
  }
})();
