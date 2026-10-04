/**
 * ============================================================================
 * V2 3-Second Executive Parent Scan Dashboard (window.ParentUI)
 * Implements:
 *  - Row 1: 3-Second Executive Scan (3 Cards):
 *      Card 1: Longitudinal Lexile Trajectory & Official BEACON Anchor (835L -> 840L -> 830L -> 800L -> 940L + Live V2 Rolling Estimate vs. 1075L Dickerson MS AC Cutoff)
 *      Card 2: Traffic-Light Skill Mastery Matrix (5 BEACON Domains, Lit vs. Info split, 1-click Queue Practice)
 *      Card 3: Top Actionable Weakness Alert (2-sentence bottleneck explanation + 1-click Queue Targeted Workout Next)
 *  - Row 2: Diagnostic Deep-Dive Strip:
 *      Card 1: Distractor Trap Vulnerability Breakdown (5 BEACON Trap Archetypes)
 *      Card 2: Pacing & EBSR Paired Proof Telemetry (Avg sec/item, Impulsive <8s, Hesitation >90s, Joint EBSR Accuracy)
 *      Card 3: Dickerson Middle School 6th Grade AC Placement Readiness Card (AC ELA, AC Reading, AC Social Studies, AC Science vs. 1075L cutoff)
 *  - Row 3: Complete 24-Workout Curriculum Browser & Append-Only Trial History Log with Item Inspector Drawer/Modal
 * ============================================================================
 */

(function () {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return 'Recent Session';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (_) {
      return isoStr;
    }
  }

  const TRAP_DISPLAY_ORDER = [
    {
      code: 'TRAP_WORD_MATCH',
      shortLabel: 'Verbatim Word-Match',
      kidName: 'Copy-Paste Trap',
      remediation: 'Repeats exact words from the passage, but flips who did the action or changes the meaning.',
    },
    {
      code: 'TRAP_TOO_NARROW',
      shortLabel: 'Too Narrow / Detail',
      kidName: 'Tiny Detail Trap',
      remediation: 'States a true fact from a single sentence that is too narrow to be the main idea or summary.',
    },
    {
      code: 'TRAP_EXTREME',
      shortLabel: 'Extreme Language',
      kidName: 'Danger Word Trap',
      remediation: "Uses absolute words ('always', 'never', 'completely', 'only') that overstate careful text claims.",
    },
    {
      code: 'TRAP_OUTSIDE_INFO',
      shortLabel: 'Outside Info',
      kidName: 'Outside Fact Trap',
      remediation: 'Sounds plausible in real life, but has zero verbatim line evidence in the passage.',
    },
    {
      code: 'TRAP_SYNTACTIC_REVERSAL',
      shortLabel: 'Syntactic Reversal',
      kidName: 'Flipped Action Trap',
      remediation: 'Swaps the grammatical actor and receiver in passive voice or multi-clause Monster Sentences.',
    },
  ];

  const DOMAIN_SHORT_LABELS = {
    D1_KEY_IDEAS: 'Key Ideas & Inference',
    D2_CRAFT_STRUCTURE: 'Vocab & Text Structure',
    D3_INTEGRATION: 'Claims & Synthesis',
    D4_SYNTAX: 'Sentence Surgery [Syntax]',
    D5_EBSR: 'Paired Proof [EBSR]',
  };

  const MATH_DOMAINS_META = [
    {
      code: '5.NF',
      shortKey: 'NF',
      label: '5.NF: Fractions & Operations',
      baselinePct: 64,
      focusNote: 'Unlike denominators, mixed numbers & fraction multiplication/division',
    },
    {
      code: '5.NBT',
      shortKey: 'NBT',
      label: '5.NBT: Base Ten & Decimals',
      baselinePct: 70,
      focusNote: 'Place value, powers of 10, multi-digit & decimal operations',
    },
    {
      code: '5.OA',
      shortKey: 'OA',
      label: '5.OA: Algebraic Thinking',
      baselinePct: 76,
      focusNote: 'Order of operations (PEMDAS), numerical expressions & patterns',
    },
    {
      code: '5.MD',
      shortKey: 'MD',
      label: '5.MD: Measurement & Volume',
      baselinePct: 74,
      focusNote: 'Unit conversions, line plots & composite rectangular prism volume',
    },
    {
      code: '5.G',
      shortKey: 'G',
      label: '5.G: Coordinate Geometry',
      baselinePct: 82,
      focusNote: 'First-quadrant coordinate plane graphing & 2D polygon hierarchy',
    },
  ];

  const ParentUI = {
    activeSubject: 'reading', // 'reading' | 'math'
    filters: {
      tier: 'ALL',
      genre: 'ALL',
      domain: 'ALL',
    },
    inspectedTrialId: null,

    /**
     * Switch active subject ('reading' | 'math') and re-render Parent Dashboard
     */
    setSubject(subject) {
      this.activeSubject = subject === 'math' ? 'math' : 'reading';
      this.renderDashboard();
    },

    /**
     * Render the Subject Toggle Bar inside Parent Mode
     */
    renderSubjectToggleBanner(prog) {
      const isMath = this.activeSubject === 'math';
      const rollingLexile = Number(prog.estimatedLexile) || 940;
      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick="window.switchSubject ? window.switchSubject('reading') : window.ParentUI.setSubject('reading')"
              class="px-4 py-2 rounded-xl font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 ${
                !isMath
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }"
            >
              <span>📚 Reading Telemetry (${rollingLexile}L &rarr; 1075L+ AC)</span>
            </button>
            <button
              type="button"
              onclick="window.switchSubject ? window.switchSubject('math') : window.ParentUI.setSubject('math')"
              class="px-4 py-2 rounded-xl font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 ${
                isMath
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }"
            >
              <span>📐 Math Telemetry (700Q &rarr; 950Q+ Adv/Acc)</span>
            </button>
          </div>
          <div class="text-xs font-semibold text-slate-500">
            ${
              isMath
                ? 'Official BEACON Quantile Anchor: <strong>500Q &rarr; 515Q &rarr; 760Q &rarr; 700Q</strong> &bull; Dickerson MS Cutoffs: <strong>850Q / 950Q</strong>'
                : 'Official BEACON Lexile Anchor: <strong>835L &rarr; 840L &rarr; 830L &rarr; 800L &rarr; 940L</strong> &bull; Dickerson MS AC Cutoff: <strong>1075L+</strong>'
            }
          </div>
        </div>
      `;
    },

    /**
     * Render the complete 3-Second Executive Parent Dashboard
     */
    renderDashboard() {
      const root = document.getElementById('parent-dashboard-root');
      if (!root) return;

      const state = window.V2State || {};
      const curr = state.curriculum || {};
      const prog = state.progress || {};
      const workouts = Array.isArray(state.workouts) ? state.workouts : [];

      // Update subheader caption for current student
      const subheaderEl = document.getElementById('parent-subheader-caption');
      if (subheaderEl) {
        const sName = prog.studentName || 'Lucas Ramirez';
        const school = prog.school || 'Nickajack Elementary';
        const targetMS = prog.targetMiddleSchool || 'Dickerson Middle School';
        if (this.activeSubject === 'math') {
          subheaderEl.innerHTML = `${escapeHtml(sName)} &bull; 5th Grade, ${escapeHtml(school)} Official DRC BEACON Math Anchor (<strong>700Q</strong>; Peak <strong>760Q</strong>) &rarr; ${escapeHtml(targetMS)} Adv Math 6 (<strong>850Q+</strong>) &amp; Math 6/7A (<strong>950Q+</strong>)`;
        } else {
          subheaderEl.innerHTML = `${escapeHtml(sName)} &bull; 5th Grade, ${escapeHtml(school)} Official DRC BEACON Anchor (<strong>940L</strong> on 09/01/2026) &rarr; ${escapeHtml(targetMS)} 6th Grade AC Cutoff (<strong>1075L+</strong>)`;
        }
      }

      if (this.activeSubject === 'math') {
        root.innerHTML = `
          ${this.renderSubjectToggleBanner(prog)}
          ${this.renderMathDashboardSection(prog)}
          <div class="space-y-6">
            ${this.renderTrialHistoryLog(prog, workouts)}
          </div>
          ${this.renderTrialInspectorModal(prog, workouts)}
        `;
        return;
      }

      root.innerHTML = `
        ${this.renderSubjectToggleBanner(prog)}

        <!-- ROW 1: 3-SECOND EXECUTIVE SCAN (3 CARDS) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div class="lg:col-span-5 flex">
            ${this.renderTrajectoryCard(prog, curr)}
          </div>
          <div class="lg:col-span-4 flex">
            ${this.renderTrafficLightMatrixCard(prog, curr)}
          </div>
          <div class="lg:col-span-3 flex">
            ${this.renderTopWeaknessAlertCard(prog, curr, workouts)}
          </div>
        </div>

        <!-- ROW 2: DIAGNOSTIC DEEP-DIVE STRIP (3 CARDS) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div class="lg:col-span-4 flex">
            ${this.renderDistractorTrapCard(prog, curr)}
          </div>
          <div class="lg:col-span-4 flex">
            ${this.renderPacingAndEbsrCard(prog)}
          </div>
          <div class="lg:col-span-4 flex">
            ${this.renderDickersonACReadinessCard(prog)}
          </div>
        </div>

        <!-- ROW 3: COMPLETE DAILY WORKOUT CURRICULUM BROWSER & APPEND-ONLY TRIAL LOG -->
        <div class="space-y-6">
          ${this.renderCurriculumBrowser(workouts, prog)}
          ${this.renderTrialHistoryLog(prog, workouts)}
        </div>

        <!-- ITEM INSPECTOR MODAL / DRAWER -->
        ${this.renderTrialInspectorModal(prog, workouts)}
      `;
    },

    /**
     * Render the Math Executive Telemetry Section (Quantile Trajectory 500Q -> 515Q -> 760Q -> 700Q vs 950Q cutoff,
     * 5 GSE Math Domains 5.OA, 5.NBT, 5.NF, 5.MD, 5.G, Dickerson MS Math 6/7A & Adv Math 6 readiness cards, and Math Missions)
     */
    renderMathDashboardSection(prog) {
      const trials = Array.isArray(prog.trialHistory) ? prog.trialHistory : [];
      const mathTrials = trials.filter(
        (t) =>
          t.subject === 'math' ||
          String(t.workoutId || '').startsWith('workout-') ||
          String(t.workoutId || '').startsWith('mission-')
      );

      // Compute rolling Quantile estimate anchored at 700Q official baseline
      let rollingQuantile = 700;
      if (mathTrials.length > 0) {
        let totalFirst = 0;
        let totalItems = 0;
        mathTrials.forEach((mt) => {
          totalFirst += Number(mt.firstTryCorrectCount) || 0;
          totalItems += Math.max(1, Number(mt.questionsAttempted) || 6);
        });
        const acc = totalFirst / Math.max(1, totalItems);
        const gain = Math.round((acc - 0.6) * 140 * Math.min(2.5, mathTrials.length * 0.5));
        rollingQuantile = Math.max(660, Math.min(1020, 700 + gain));
      }

      const gapTo850 = Math.max(0, 850 - rollingQuantile);
      const gapTo950 = Math.max(0, 950 - rollingQuantile);

      // Official BEACON Quantile Trajectory: 500Q -> 515Q -> 760Q -> 700Q + Live V2 Est.
      const quantilePoints = [
        { label: 'Fall G4', shortWindow: 'Baseline', q: 500, isOfficial: true },
        { label: 'Winter G4', shortWindow: 'Mid-Year', q: 515, isOfficial: true },
        { label: 'Spring G4', shortWindow: 'Peak (+245Q)', q: 760, isOfficial: true },
        { label: 'Fall G5', shortWindow: 'Current Anchor', q: 700, isOfficial: true },
        { label: 'Live V2 Est.', shortWindow: '±25Q SEM', q: rollingQuantile, isOfficial: false },
      ];

      const svgW = 520;
      const svgH = 210;
      const padL = 44;
      const padR = 32;
      const padT = 26;
      const padB = 42;
      const plotW = svgW - padL - padR;
      const plotH = svgH - padT - padB;
      const minQ = 450;
      const maxQ = 1020;

      const yForQ = (qVal) => {
        const clamped = Math.max(minQ, Math.min(maxQ, qVal));
        return Math.round(padT + plotH - ((clamped - minQ) / (maxQ - minQ)) * plotH);
      };
      const xForIdx = (idx) => Math.round(padL + (idx / (quantilePoints.length - 1)) * plotW);

      const y950 = yForQ(950);
      const y850 = yForQ(850);
      const coords = quantilePoints.map((pt, i) => ({
        ...pt,
        x: xForIdx(i),
        y: yForQ(pt.q),
      }));

      const officialPath = coords
        .slice(0, 4)
        .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
        .join(' ');
      const livePath = `M ${coords[3].x} ${coords[3].y} L ${coords[4].x} ${coords[4].y}`;

      // Compute domain mastery across 5 GSE Math domains (5.OA, 5.NBT, 5.NF, 5.MD, 5.G)
      const domainRowsHtml = MATH_DOMAINS_META.map((dm) => {
        let attempts = 0;
        let correct = 0;
        mathTrials.forEach((mt) => {
          const items = Array.isArray(mt.itemAttempts) ? mt.itemAttempts : [];
          items.forEach((it) => {
            const st = String(it.standard || it.domain || '').toUpperCase();
            if (st.includes(dm.shortKey)) {
              attempts += 1;
              if (it.firstTryCorrect) correct += 1;
            }
          });
        });
        const pct =
          attempts > 0
            ? Math.round((dm.baselinePct * 3 + (correct / attempts) * 100 * attempts) / (3 + attempts))
            : dm.baselinePct;

        let badgeHtml = '';
        if (pct >= 85) {
          badgeHtml = `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-extrabold">🟢 Mastered (${pct}%)</span>`;
        } else if (pct >= 68) {
          badgeHtml = `<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-extrabold">🟡 Developing (${pct}%)</span>`;
        } else {
          badgeHtml = `<span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-extrabold">🔴 Needs Focus (${pct}%)</span>`;
        }

        return `
          <div class="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-extrabold text-slate-900">${escapeHtml(dm.label)}</span>
              ${badgeHtml}
            </div>
            <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div class="h-full ${pct >= 85 ? 'bg-emerald-500' : pct >= 68 ? 'bg-amber-500' : 'bg-rose-500'}" style="width: ${pct}%"></div>
            </div>
            <div class="text-[11px] text-slate-500">${escapeHtml(dm.focusNote)}</div>
          </div>
        `;
      }).join('');

      const targetedList = Array.isArray(window.LUCAS_TARGETED_WORKOUTS)
        ? window.LUCAS_TARGETED_WORKOUTS
        : [];
      const missionsList = Array.isArray(window.MATH_MISSIONS_DATA)
        ? window.MATH_MISSIONS_DATA
        : [];

      return `
        <!-- MATH ROW 1: 3-SECOND EXECUTIVE SCAN (QUANTILE TRAJECTORY + 5 GSE DOMAINS + DICKERSON MS MATH READINESS) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <!-- CARD 1: OFFICIAL BEACON QUANTILE TRAJECTORY -->
          <div class="lg:col-span-5 flex">
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between w-full">
              <div>
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                      1. Longitudinal Quantile Trajectory
                    </span>
                    <h2 class="text-base sm:text-lg font-extrabold text-slate-900">
                      Official BEACON Math Anchor (500Q &rarr; 515Q &rarr; 760Q &rarr; 700Q)
                    </h2>
                  </div>
                  <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-extrabold">
                    🎯 ${gapTo850}Q to Adv Math 6 &bull; ${gapTo950}Q to Math 6/7A
                  </span>
                </div>

                <div class="grid grid-cols-3 gap-2.5 mb-3">
                  <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
                    <div class="text-[11px] font-bold text-slate-500">Fall G5 Official</div>
                    <div class="text-lg sm:text-xl font-extrabold text-slate-900">700Q <span class="text-xs font-bold text-emerald-600">(Peak 760Q)</span></div>
                  </div>
                  <div class="rounded-xl bg-indigo-50/70 border border-indigo-200 p-2.5">
                    <div class="text-[11px] font-bold text-indigo-700">Live Rolling Est.</div>
                    <div class="text-lg sm:text-xl font-extrabold text-indigo-950">${rollingQuantile}Q <span class="text-xs font-bold text-indigo-600">&plusmn;25Q</span></div>
                  </div>
                  <div class="rounded-xl bg-emerald-50/70 border border-emerald-200 p-2.5">
                    <div class="text-[11px] font-bold text-emerald-800">Dickerson Cutoffs</div>
                    <div class="text-lg sm:text-xl font-extrabold text-emerald-900">850Q / 950Q+</div>
                  </div>
                </div>

                <div class="w-full overflow-x-auto bg-slate-50/60 rounded-xl border border-slate-100 p-2">
                  <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full h-auto select-none">
                    <line x1="${padL}" y1="${y950}" x2="${svgW - padR}" y2="${y950}" stroke="#059669" stroke-width="2" stroke-dasharray="6,4" />
                    <text x="${padL + 4}" y="${y950 - 5}" fill="#065f46" font-size="10" font-weight="800">
                      🎯 950Q Dickerson MS Math 6/7A Accelerated Cutoff
                    </text>

                    <line x1="${padL}" y1="${y850}" x2="${svgW - padR}" y2="${y850}" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4,4" />
                    <text x="${padL + 4}" y="${y850 - 4}" fill="#92400e" font-size="9" font-weight="700">
                      ⭐ 850Q Dickerson MS Advanced Math 6 Cutoff
                    </text>

                    <text x="${padL - 6}" y="${yForQ(950) + 3}" text-anchor="end" fill="#64748b" font-size="9" font-weight="600">950Q</text>
                    <text x="${padL - 6}" y="${yForQ(800) + 3}" text-anchor="end" fill="#64748b" font-size="9" font-weight="600">800Q</text>
                    <text x="${padL - 6}" y="${yForQ(650) + 3}" text-anchor="end" fill="#64748b" font-size="9" font-weight="600">650Q</text>
                    <text x="${padL - 6}" y="${yForQ(500) + 3}" text-anchor="end" fill="#64748b" font-size="9" font-weight="600">500Q</text>

                    <path d="${officialPath}" fill="none" stroke="#334155" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="${livePath}" fill="none" stroke="#4f46e5" stroke-width="2.75" stroke-dasharray="5,4" stroke-linecap="round" />

                    ${coords
                      .map((c, idx) => {
                        const isLive = !c.isOfficial;
                        const isPeak = idx === 2;
                        const dotColor = isLive ? '#4f46e5' : isPeak ? '#059669' : '#334155';
                        return `
                          <g>
                            <circle cx="${c.x}" cy="${c.y}" r="${isLive || isPeak ? 6 : 4.5}" fill="${dotColor}" stroke="#ffffff" stroke-width="2" />
                            <text x="${c.x}" y="${c.y - 10}" text-anchor="middle" fill="${dotColor}" font-size="10" font-weight="800">
                              ${c.q}Q
                            </text>
                            <text x="${c.x}" y="${svgH - 22}" text-anchor="middle" fill="#334155" font-size="9" font-weight="700">
                              ${escapeHtml(c.label)}
                            </text>
                            <text x="${c.x}" y="${svgH - 10}" text-anchor="middle" fill="#64748b" font-size="8" font-weight="600">
                              ${escapeHtml(c.shortWindow)}
                            </text>
                          </g>
                        `;
                      })
                      .join('')}
                  </svg>
                </div>
              </div>

              <div class="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600">
                <strong>Official BEACON Quantile History:</strong> 500Q &rarr; 515Q &rarr; <strong>760Q</strong> &rarr; <strong>700Q</strong> (Target: 850Q Adv Math 6 / 950Q Math 6/7A)
              </div>
            </div>
          </div>

          <!-- CARD 2: 5 GSE MATH DOMAINS (5.OA, 5.NBT, 5.NF, 5.MD, 5.G) -->
          <div class="lg:col-span-4 flex">
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between w-full">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                      2. GSE Grade 5 Math Domains
                    </span>
                    <h2 class="text-base sm:text-lg font-extrabold text-slate-900">
                      5.OA &bull; 5.NBT &bull; 5.NF &bull; 5.MD &bull; 5.G
                    </h2>
                  </div>
                </div>
                <div class="space-y-2">
                  ${domainRowsHtml}
                </div>
              </div>
              <div class="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600">
                Priority Growth Lever: <strong>5.NF (Fractions) &amp; 5.NBT (Decimals)</strong> unlock +150Q–250Q on BEACON.
              </div>
            </div>
          </div>

          <!-- CARD 3: DICKERSON MS MATH 6/7A & ADV MATH 6 READINESS CARD -->
          <div class="lg:col-span-3 flex">
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between w-full">
              <div class="space-y-3.5">
                <div>
                  <span class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                    3. Dickerson MS Math Placement
                  </span>
                  <h2 class="text-base sm:text-lg font-extrabold text-slate-900">
                    Math 6/7A (&ge;950Q) &amp; Adv Math 6 (&ge;850Q)
                  </h2>
                </div>

                <!-- Readiness Card 1: Math 6/7A Accelerated -->
                <div class="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold text-indigo-950">🚀 Math 6/7A Accelerated</span>
                    <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-extrabold">Cutoff: &ge;950Q</span>
                  </div>
                  <div class="text-xs text-slate-700">
                    Current Estimate: <strong>${rollingQuantile}Q</strong> (${gapTo950 === 0 ? 'Qualified!' : `-${gapTo950}Q gap`})
                  </div>
                  <div class="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                    <div class="h-full bg-indigo-600 rounded-full" style="width: ${Math.min(100, Math.round((rollingQuantile / 950) * 100))}%"></div>
                  </div>
                  <div class="text-[11px] text-slate-500">Compresses 6th &amp; 7th grade GSE Math into 6th grade year.</div>
                </div>

                <!-- Readiness Card 2: Advanced Math 6 -->
                <div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold text-emerald-950">⭐ Advanced Math 6</span>
                    <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">Cutoff: &ge;850Q</span>
                  </div>
                  <div class="text-xs text-slate-700">
                    Current Estimate: <strong>${rollingQuantile}Q</strong> (${gapTo850 === 0 ? 'Qualified!' : `-${gapTo850}Q gap`})
                  </div>
                  <div class="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-600 rounded-full" style="width: ${Math.min(100, Math.round((rollingQuantile / 850) * 100))}%"></div>
                  </div>
                  <div class="text-[11px] text-slate-500">Above-level 6th grade Advanced Content math track at Dickerson MS.</div>
                </div>
              </div>

              <div class="pt-3 mt-3 border-t border-slate-100">
                <button
                  type="button"
                  onclick="window.ParentUI.launchMathMissionNow('workout-decimals-fractions')"
                  class="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-xs transition cursor-pointer"
                >
                  📐 Launch Focus Workout #1 (5.NF/5.NBT)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- MATH ROW 2: PRESERVED V1 TARGETED WORKOUTS (3) & MATH MISSIONS (20) -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
            <div>
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                Preserved V1 Math Assessment Bank
              </span>
              <h3 class="text-lg font-extrabold text-slate-900">
                3 Lucas Targeted Focus Workouts &amp; 20 Grade 5 GSE Math Missions
              </h3>
            </div>
          </div>

          <div class="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 bg-indigo-50/30">
            ${targetedList
              .map(
                (tw, i) => `
                <div class="bg-white rounded-xl border border-indigo-200 p-4 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <div class="text-[11px] font-extrabold uppercase text-indigo-600">Targeted Focus Workout #${i + 1}</div>
                    <div class="text-sm font-extrabold text-slate-900 mt-0.5">${escapeHtml(tw.title)}</div>
                    <div class="text-xs text-slate-600 mt-1">${escapeHtml(tw.subtitle || '')}</div>
                  </div>
                  <button
                    type="button"
                    onclick="window.ParentUI.launchMathMissionNow('${escapeHtml(tw.id)}')"
                    class="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs cursor-pointer transition"
                  >
                    Launch Focus Workout (${(tw.questions || []).length} Items)
                  </button>
                </div>
              `
              )
              .join('')}
          </div>

          <div class="overflow-x-auto max-h-96">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-100/90 text-slate-600 uppercase text-[11px] font-extrabold sticky top-0 z-10">
                <tr>
                  <th class="py-3 px-4">#</th>
                  <th class="py-3 px-4">Mission Title</th>
                  <th class="py-3 px-3">Category &amp; GSE Domains</th>
                  <th class="py-3 px-3">Items</th>
                  <th class="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200/70">
                ${missionsList
                  .map(
                    (m, idx) => `
                    <tr class="hover:bg-slate-50 transition">
                      <td class="py-2.5 px-4 font-extrabold text-slate-700">#${idx + 1}</td>
                      <td class="py-2.5 px-4 font-extrabold text-slate-900">${escapeHtml(m.title)}</td>
                      <td class="py-2.5 px-3 font-semibold text-slate-600">${escapeHtml(m.category || 'Grade 5 GSE Math')}</td>
                      <td class="py-2.5 px-3 font-bold text-slate-700">${(m.questions || []).length} questions</td>
                      <td class="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onclick="window.ParentUI.launchMathMissionNow('${escapeHtml(m.id)}')"
                          class="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition cursor-pointer"
                        >
                          Launch Now
                        </button>
                      </td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    launchMathMissionNow(missionId) {
      if (typeof window.switchSubject === 'function') {
        window.switchSubject('math');
      } else if (window.StudentUI && typeof window.StudentUI.setSubject === 'function') {
        window.StudentUI.setSubject('math');
      }
      if (typeof window.switchAppMode === 'function') {
        window.switchAppMode('student');
      }
      if (window.StudentUI && typeof window.StudentUI.startWorkout === 'function') {
        window.StudentUI.startWorkout(missionId);
      }
    },

    /**
     * ROW 1, CARD 1: Longitudinal Lexile Trajectory & Official BEACON Anchor
     */
    renderTrajectoryCard(prog, curr) {
      const history =
        (Array.isArray(prog.officialBeaconHistory) && prog.officialBeaconHistory.length
          ? prog.officialBeaconHistory
          : curr.studentProfile && curr.studentProfile.officialBeaconHistory) || [
          { displayDate: '03/19/2025', window: 'Spring G3', lexile: 835 },
          { displayDate: '09/04/2025', window: 'Fall G4', lexile: 840 },
          { displayDate: '12/17/2025', window: 'Winter G4', lexile: 830 },
          { displayDate: '03/18/2026', window: 'Spring G4', lexile: 800 },
          { displayDate: '09/01/2026', window: 'Fall G5', lexile: 940 },
        ];

      const rollingLexile = Number(prog.estimatedLexile) || 940;
      const sem = Number(prog.estimatedSEM) || 25;
      const deltaFrom940 = rollingLexile - 940;
      const gapTo1075 = Math.max(0, 1075 - rollingLexile);

      let statusPill = '';
      if (rollingLexile >= 1075) {
        statusPill = `<span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-extrabold">🟢 QUALIFIED RANGE (&ge;1075L)</span>`;
      } else if (rollingLexile >= 980) {
        statusPill = `<span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-extrabold">🟡 ON TRACK (${gapTo1075}L to 1075L)</span>`;
      } else {
        statusPill = `<span class="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-xs font-extrabold">🔴 NEEDS ACCELERATION (${gapTo1075}L to 1075L)</span>`;
      }

      // Build SVG coordinates for the 5 official tests + 1 Live V2 Rolling Estimate
      const pointsData = [
        ...history.map((h) => ({
          label: h.displayDate,
          shortWindow: h.window || '',
          lexile: Number(h.lexile),
          isOfficial: true,
        })),
        {
          label: 'Live V2 Est.',
          shortWindow: `±${sem}L SEM`,
          lexile: rollingLexile,
          isOfficial: false,
        },
      ];

      const svgW = 520;
      const svgH = 210;
      const padL = 42;
      const padR = 32;
      const padT = 26;
      const padB = 42;
      const plotW = svgW - padL - padR;
      const plotH = svgH - padT - padB;
      const minLex = 750;
      const maxLex = 1150;

      const yForLex = (lex) => {
        const clamped = Math.max(minLex, Math.min(maxLex, lex));
        return Math.round(padT + plotH - ((clamped - minLex) / (maxLex - minLex)) * plotH);
      };

      const xForIdx = (idx) => {
        return Math.round(padL + (idx / (pointsData.length - 1)) * plotW);
      };

      const y1075 = yForLex(1075);
      const y940 = yForLex(940);

      const coords = pointsData.map((pt, i) => ({
        ...pt,
        x: xForIdx(i),
        y: yForLex(pt.lexile),
      }));

      const officialPath = coords
        .slice(0, 5)
        .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
        .join(' ');

      const liveSegmentPath =
        coords.length >= 6
          ? `M ${coords[4].x} ${coords[4].y} L ${coords[5].x} ${coords[5].y}`
          : '';

      const livePt = coords[coords.length - 1];
      const semTopY = yForLex(rollingLexile + sem);
      const semBotY = yForLex(rollingLexile - sem);

      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between w-full">
          <div>
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                  1. Longitudinal Lexile Trajectory
                </span>
                <h2 class="text-base sm:text-lg font-extrabold text-slate-900">
                  5-Test Official BEACON Anchor &amp; Live Rolling Estimate
                </h2>
              </div>
              ${statusPill}
            </div>

            <!-- Key KPI Strip -->
            <div class="grid grid-cols-3 gap-2.5 mb-3">
              <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
                <div class="text-[11px] font-bold text-slate-500">Fall G5 Official (09/01/26)</div>
                <div class="text-lg sm:text-xl font-extrabold text-slate-900">940L <span class="text-xs font-bold text-emerald-600">(+140L)</span></div>
              </div>
              <div class="rounded-xl bg-indigo-50/70 border border-indigo-200 p-2.5">
                <div class="text-[11px] font-bold text-indigo-700">Live V2 Rolling Est.</div>
                <div class="text-lg sm:text-xl font-extrabold text-indigo-950">
                  ${rollingLexile}L
                  <span class="text-xs font-bold text-indigo-600">&plusmn;${sem}L (${deltaFrom940 >= 0 ? '+' : ''}${deltaFrom940}L)</span>
                </div>
              </div>
              <div class="rounded-xl bg-emerald-50/70 border border-emerald-200 p-2.5">
                <div class="text-[11px] font-bold text-emerald-800">Dickerson AC Target</div>
                <div class="text-lg sm:text-xl font-extrabold text-emerald-900">
                  1075L+
                  <span class="text-xs font-bold text-emerald-700">(${gapTo1075 === 0 ? 'Met!' : gapTo1075 + 'L gap'})</span>
                </div>
              </div>
            </div>

            <!-- Interactive SVG Trajectory Chart -->
            <div class="w-full overflow-x-auto bg-slate-50/60 rounded-xl border border-slate-100 p-2">
              <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full h-auto select-none">
                <!-- Horizontal reference lines -->
                <line x1="${padL}" y1="${y1075}" x2="${svgW - padR}" y2="${y1075}" stroke="#059669" stroke-width="2" stroke-dasharray="6,4" />
                <text x="${padL + 4}" y="${y1075 - 5}" fill="#065f46" font-size="10" font-weight="800">
                  🎯 1075L Dickerson MS 6th Grade AC Cutoff
                </text>

                <line x1="${padL}" y1="${y940}" x2="${svgW - padR}" y2="${y940}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" />
                <text x="${padL + 4}" y="${y940 - 4}" fill="#64748b" font-size="9" font-weight="600">
                  940L Fall G5 Official Baseline
                </text>

                <!-- Y-axis labels -->
                <text x="${padL - 6}" y="${yForLex(1100) + 3}" text-anchor="end" fill="#64748b" font-size="9" font-weight="600">1100L</text>
                <text x="${padL - 6}" y="${yForLex(1000) + 3}" text-anchor="end" fill="#64748b" font-size="9" font-weight="600">1000L</text>
                <text x="${padL - 6}" y="${yForLex(900) + 3}" text-anchor="end" fill="#64748b" font-size="9" font-weight="600">900L</text>
                <text x="${padL - 6}" y="${yForLex(800) + 3}" text-anchor="end" fill="#64748b" font-size="9" font-weight="600">800L</text>

                <!-- SEM Uncertainty Pill on Live Point -->
                <rect
                  x="${livePt.x - 10}"
                  y="${semTopY}"
                  width="20"
                  height="${Math.max(6, semBotY - semTopY)}"
                  rx="6"
                  fill="rgba(79, 70, 229, 0.16)"
                  stroke="rgba(79, 70, 229, 0.35)"
                />

                <!-- Official 5-test path -->
                <path d="${officialPath}" fill="none" stroke="#334155" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" />

                <!-- Live V2 Rolling Estimate dashed connector -->
                <path d="${liveSegmentPath}" fill="none" stroke="#4f46e5" stroke-width="2.75" stroke-dasharray="5,4" stroke-linecap="round" />

                <!-- Data Nodes & Labels -->
                ${coords
                  .map((c, idx) => {
                    const isBreakout940 = idx === 4;
                    const isLive = !c.isOfficial;
                    const dotColor = isLive ? '#4f46e5' : isBreakout940 ? '#059669' : '#334155';
                    const radius = isLive || isBreakout940 ? 6 : 4.5;
                    return `
                      <g>
                        <circle cx="${c.x}" cy="${c.y}" r="${radius}" fill="${dotColor}" stroke="#ffffff" stroke-width="2" />
                        <text x="${c.x}" y="${c.y - 10}" text-anchor="middle" fill="${dotColor}" font-size="10" font-weight="800">
                          ${c.lexile}L
                        </text>
                        <text x="${c.x}" y="${svgH - 22}" text-anchor="middle" fill="#334155" font-size="9" font-weight="700">
                          ${escapeHtml(c.label)}
                        </text>
                        <text x="${c.x}" y="${svgH - 10}" text-anchor="middle" fill="#64748b" font-size="8" font-weight="600">
                          ${escapeHtml(c.shortWindow)}
                        </text>
                      </g>
                    `;
                  })
                  .join('')}
              </svg>
            </div>
          </div>

          <div class="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
            <span><strong>Official History:</strong> 835L (03/19/25) &rarr; 840L (09/04/25) &rarr; 830L (12/17/25) &rarr; 800L (03/18/26) &rarr; <strong>940L (09/01/26)</strong></span>
          </div>
        </div>
      `;
    },

    /**
     * ROW 1, CARD 2: Traffic-Light Skill Mastery Matrix
     */
    renderTrafficLightMatrixCard(prog, curr) {
      const domains =
        Array.isArray(prog.domainMasteryList) && prog.domainMasteryList.length
          ? prog.domainMasteryList
          : Object.values(prog.domainMastery || {});

      const rowsHtml = domains
        .map((d) => {
          const dId = d.domainId || d.id;
          const label = DOMAIN_SHORT_LABELS[dId] || d.shortName || dId;
          const pct = Number(d.masteryPct) || 0;
          const litPct = Number(d.literaryPct) || pct;
          const infoPct = Number(d.informationalPct) || pct;
          const isQueued = prog.queuedDomainId === dId;

          let badgeHtml = '';
          if (pct >= 85) {
            badgeHtml = `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-extrabold">🟢 Mastered (${pct}%)</span>`;
          } else if (pct >= 65) {
            badgeHtml = `<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-extrabold">🟡 Developing (${pct}%)</span>`;
          } else {
            badgeHtml = `<span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-extrabold">🔴 Needs Practice (${pct}%)</span>`;
          }

          return `
            <div class="p-2.5 rounded-xl border ${isQueued ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200/80 bg-slate-50/60'} space-y-1.5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-extrabold text-slate-900">${escapeHtml(label)}</span>
                <div class="flex items-center gap-1.5">
                  ${badgeHtml}
                  <button
                    type="button"
                    onclick="window.ParentUI.queueDomainOrWorkout('${escapeHtml(dId)}', '${escapeHtml(label)}')"
                    class="px-2 py-0.5 rounded-md text-[11px] font-extrabold transition cursor-pointer ${
                      isQueued
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }"
                    title="Queue targeted practice in this domain for next session"
                  >
                    ${isQueued ? '✓ Queued' : '🎯 Queue Practice'}
                  </button>
                </div>
              </div>

              <!-- Literary vs Informational Split Bars -->
              <div class="grid grid-cols-2 gap-2 text-[11px]">
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-slate-600 w-12 shrink-0">📖 Lit:</span>
                  <div class="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full ${litPct >= 85 ? 'bg-emerald-500' : litPct >= 65 ? 'bg-amber-500' : 'bg-rose-500'}" style="width: ${litPct}%"></div>
                  </div>
                  <span class="font-extrabold text-slate-700 w-8 text-right">${litPct}%</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-slate-600 w-12 shrink-0">🔬 Info:</span>
                  <div class="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full ${infoPct >= 85 ? 'bg-emerald-500' : infoPct >= 65 ? 'bg-amber-500' : 'bg-rose-500'}" style="width: ${infoPct}%"></div>
                  </div>
                  <span class="font-extrabold text-slate-700 w-8 text-right">${infoPct}%</span>
                </div>
              </div>
            </div>
          `;
        })
        .join('');

      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between w-full">
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <div>
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                  2. Traffic-Light Skill Mastery Matrix
                </span>
                <h2 class="text-base sm:text-lg font-extrabold text-slate-900">
                  5 DRC BEACON Domains (Lit vs. Info)
                </h2>
              </div>
              <div class="text-[11px] font-bold text-slate-500">
                🟢 &ge;85% &bull; 🟡 65–84% &bull; 🔴 &lt;65%
              </div>
            </div>

            <div class="space-y-2">
              ${rowsHtml}
            </div>
          </div>

          <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>📖 Literary Overall: <strong>${prog.literaryAccuracyPct || 72}%</strong></span>
            <span>🔬 Informational Overall: <strong>${prog.informationalAccuracyPct || 68}%</strong></span>
          </div>
        </div>
      `;
    },

    /**
     * ROW 1, CARD 3: Top Actionable Weakness Alert
     */
    renderTopWeaknessAlertCard(prog, curr, workouts) {
      const tw = prog.topWeakness || {
        domainId: 'D4_SYNTAX',
        domainShortName: 'Sentence Surgery',
        domainParentLabel: 'Syntactic Decoding (Monster Sentences & Passive Voice)',
        masteryPct: 62,
        trapCode: 'TRAP_SYNTACTIC_REVERSAL',
        trapParentName: 'Syntactic / Causal Reversal',
        trapRemediation: 'Confuses the cause and effect or swaps the subject and receiver in a long sentence.',
        recommendedWorkoutId: 'w01_tier1_lit',
        recommendedWorkoutTitle: 'The Secret of the Brass Heron',
      };

      const targetWorkoutId = tw.recommendedWorkoutId || tw.domainId || 'D4_SYNTAX';
      const isQueued =
        prog.queuedWorkoutId === tw.recommendedWorkoutId || prog.queuedDomainId === tw.domainId;

      const sentence1 = `${tw.domainParentLabel || tw.domainShortName} is currently Lucas's #1 priority bottleneck at ${tw.masteryPct}% mastery, driven primarily by the "${tw.trapParentName}" distractor pattern.`;
      const sentence2 = `${tw.trapRemediation} Targeted practice on multi-clause actor/action tracking and verbatim line verification will directly unlock the next +40L–60L gain toward 1075L.`;

      const queuedWorkoutObj = prog.queuedWorkoutId
        ? workouts.find((w) => w.workoutId === prog.queuedWorkoutId)
        : null;

      return `
        <div class="bg-gradient-to-br from-rose-950 via-slate-900 to-indigo-950 text-white rounded-2xl border border-rose-800/60 p-5 shadow-md flex flex-col justify-between w-full">
          <div class="space-y-3.5">
            <div class="flex items-center justify-between gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/40 text-rose-200 text-[11px] font-extrabold uppercase tracking-wider">
                🚨 3. Top Weakness Alert
              </span>
              <span class="text-xs font-extrabold text-rose-300">
                ${tw.masteryPct}% Mastery
              </span>
            </div>

            <div>
              <div class="text-xs font-bold text-rose-300 uppercase tracking-wide">
                #1 Priority Domain
              </div>
              <h2 class="text-base sm:text-lg font-extrabold text-white leading-snug mt-0.5">
                ${escapeHtml(tw.domainParentLabel || tw.domainShortName)}
              </h2>
            </div>

            <div class="rounded-xl bg-white/10 border border-white/15 p-3 space-y-1">
              <div class="text-[11px] font-extrabold text-amber-300 uppercase">
                🪤 #1 Distractor Trap Vulnerability
              </div>
              <div class="text-xs sm:text-sm font-bold text-white">
                ${escapeHtml(tw.trapParentName)}
              </div>
            </div>

            <!-- 2-Sentence Executive Cognitive Bottleneck Explanation -->
            <p class="text-xs text-slate-200 leading-relaxed">
              ${escapeHtml(sentence1)} ${escapeHtml(sentence2)}
            </p>
          </div>

          <div class="pt-4 mt-3 border-t border-white/10 space-y-2">
            ${
              queuedWorkoutObj
                ? `<div class="text-[11px] font-bold text-emerald-300">✅ Queued Next: #${queuedWorkoutObj.workoutNumber} ${escapeHtml(queuedWorkoutObj.title)}</div>`
                : `<div class="text-[11px] text-indigo-200">Recommended Next: <strong>${escapeHtml(tw.recommendedWorkoutTitle || 'Targeted Workout')}</strong></div>`
            }
            <button
              type="button"
              onclick="window.ParentUI.queueDomainOrWorkout('${escapeHtml(targetWorkoutId)}', '${escapeHtml(tw.recommendedWorkoutTitle || tw.domainShortName)}')"
              class="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 ${
                isQueued
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }"
            >
              <span>${isQueued ? '✅ Targeted Workout Queued Next' : '🎯 Queue Targeted Workout Next'}</span>
            </button>
          </div>
        </div>
      `;
    },

    /**
     * ROW 2, CARD 1: Distractor Trap Vulnerability Breakdown (5 BEACON Trap Archetypes)
     */
    renderDistractorTrapCard(prog, curr) {
      const trapCounts = prog.trapCounts || {};
      const totalTraps = Math.max(
        1,
        Object.values(trapCounts).reduce((acc, v) => acc + (Number(v) || 0), 0)
      );

      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between w-full">
          <div>
            <div class="mb-3">
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                Diagnostic Deep-Dive &bull; Psychometric Traps
              </span>
              <h3 class="text-base font-extrabold text-slate-900">
                Distractor Trap Vulnerability Profile
              </h3>
            </div>

            <div class="space-y-3">
              ${TRAP_DISPLAY_ORDER.map((t) => {
                const count = Number(trapCounts[t.code]) || 0;
                const barPct = count > 0 ? Math.min(100, Math.round((count / totalTraps) * 100)) : 8;
                const barColor =
                  count >= 3 ? 'bg-rose-500' : count >= 1 ? 'bg-amber-500' : 'bg-slate-300';

                return `
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-extrabold text-slate-800">
                        ${escapeHtml(t.shortLabel)}
                        <span class="text-[11px] font-semibold text-slate-500">(${escapeHtml(t.kidName)})</span>
                      </span>
                      <span class="font-extrabold ${count > 0 ? 'text-rose-700' : 'text-slate-500'}">
                        ${count} ${count === 1 ? 'trigger' : 'triggers'}
                      </span>
                    </div>
                    <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full ${barColor} rounded-full transition-all duration-500" style="width: ${barPct}%"></div>
                    </div>
                    <p class="text-[11px] text-slate-500 leading-tight">
                      ${escapeHtml(t.remediation)}
                    </p>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    },

    /**
     * ROW 2, CARD 2: Pacing & EBSR Paired Proof Telemetry
     */
    renderPacingAndEbsrCard(prog) {
      const pacing = prog.pacingStats || prog.pacingMetrics || {};
      const avgSec = Number(prog.avgSecondsPerItem || pacing.avgSecondsPerItem || 0);
      const impulsiveCount = Number(prog.impulsiveCount || pacing.impulsiveCount || 0);
      const hesitationCount = Number(prog.hesitationCount || pacing.hesitationCount || 0);
      const optimalCount = Number(pacing.optimalCount || 0);

      const ebsr = prog.ebsrStats || {
        bothCorrect: 0,
        partAOnly: 0,
        partBOnly: 0,
        bothWrong: 0,
        totalPairs: 0,
        linkAccuracyPct: 64,
      };

      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between w-full">
          <div class="space-y-4">
            <div>
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                Behavioral &amp; Paired Evidence Telemetry
              </span>
              <h3 class="text-base font-extrabold text-slate-900">
                Pacing Strip &amp; EBSR Part A &rarr; Part B Accuracy
              </h3>
            </div>

            <!-- Pacing KPI Grid -->
            <div class="grid grid-cols-3 gap-2.5">
              <div class="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                <div class="text-[11px] font-bold text-slate-500">Avg Pace / Item</div>
                <div class="text-lg font-extrabold text-slate-900 mt-0.5">
                  ${avgSec > 0 ? `${avgSec}s` : '34.0s'}
                </div>
                <div class="text-[10px] font-semibold text-emerald-700">Target: 25–75s</div>
              </div>

              <div class="rounded-xl ${impulsiveCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'} border p-3 text-center">
                <div class="text-[11px] font-bold text-amber-800">⚡ Impulsive (&lt;8s)</div>
                <div class="text-lg font-extrabold text-amber-900 mt-0.5">${impulsiveCount}</div>
                <div class="text-[10px] font-semibold text-amber-700">${impulsiveCount === 0 ? 'Clean pacing' : 'Rushed clicks'}</div>
              </div>

              <div class="rounded-xl ${hesitationCount > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'} border p-3 text-center">
                <div class="text-[11px] font-bold text-indigo-800">🐢 Hesitation (&gt;90s)</div>
                <div class="text-lg font-extrabold text-indigo-900 mt-0.5">${hesitationCount}</div>
                <div class="text-[10px] font-semibold text-indigo-700">Dense syntax stalls</div>
              </div>
            </div>

            <!-- EBSR Paired Evidence Breakdown -->
            <div class="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold text-slate-800">
                  🔗 EBSR Part A + Part B Joint Proof Accuracy
                </span>
                <span class="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-extrabold text-xs">
                  ${ebsr.linkAccuracyPct || 64}%
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="bg-white rounded-lg p-2 border border-slate-200/80 flex items-center justify-between">
                  <span class="font-semibold text-slate-600">✅ Both Correct:</span>
                  <span class="font-extrabold text-emerald-700">${ebsr.bothCorrect || 0}</span>
                </div>
                <div class="bg-white rounded-lg p-2 border border-slate-200/80 flex items-center justify-between">
                  <span class="font-semibold text-slate-600" title="Guessed Part A claim without finding verbatim Part B quote">⚠️ Part A Only:</span>
                  <span class="font-extrabold text-amber-700">${ebsr.partAOnly || 0}</span>
                </div>
                <div class="bg-white rounded-lg p-2 border border-slate-200/80 flex items-center justify-between">
                  <span class="font-semibold text-slate-600">🔍 Part B Only:</span>
                  <span class="font-extrabold text-indigo-700">${ebsr.partBOnly || 0}</span>
                </div>
                <div class="bg-white rounded-lg p-2 border border-slate-200/80 flex items-center justify-between">
                  <span class="font-semibold text-slate-600">❌ Both Missed:</span>
                  <span class="font-extrabold text-rose-700">${ebsr.bothWrong || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
            <strong>Diagnostic Note:</strong> DRC BEACON heavily weights 2-part EBSR items. Eliminating "Part A Only" (intuition without line proof) is the fastest path to 1075L+.
          </div>
        </div>
      `;
    },

    /**
     * ROW 2, CARD 3: Dickerson Middle School 6th Grade AC Placement Readiness Card
     */
    renderDickersonACReadinessCard(prog) {
      const officialLexile = 940;
      const rollingLexile = Number(prog.estimatedLexile) || 940;
      const cutoff = 1075;
      const gap = Math.max(0, cutoff - rollingLexile);
      const pctToCutoff = Math.min(100, Math.max(10, Math.round(((rollingLexile - 800) / (1150 - 800)) * 100)));
      const cutoffMarkerPct = Math.round(((1075 - 800) / (1150 - 800)) * 100);

      const courses = [
        { name: '6th Grade AC ELA', req: 'BEACON Lexile ≥ 1075L' },
        { name: '6th Grade AC Reading', req: 'BEACON Lexile ≥ 1075L' },
        { name: '6th Grade AC Social Studies', req: 'BEACON Lexile ≥ 1075L' },
        { name: '6th Grade AC Science', req: 'BEACON Lexile ≥ 1075L' },
      ];

      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between w-full">
          <div class="space-y-3.5">
            <div class="flex items-start justify-between gap-2">
              <div>
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                  Cobb County Advanced Content Track
                </span>
                <h3 class="text-base font-extrabold text-slate-900">
                  Dickerson MS 6th Grade AC Placement Tracker
                </h3>
              </div>
              <span class="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-xs font-extrabold">
                Goal: 1075L+
              </span>
            </div>

            <!-- Progress Gauge from 800L -> 940L -> 1075L -> 1150L -->
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-slate-600">Fall G5 Official: <strong>${officialLexile}L</strong></span>
                <span class="text-indigo-700">V2 Rolling: <strong>${rollingLexile}L</strong></span>
                <span class="text-emerald-700">Cutoff: <strong>1075L</strong></span>
              </div>

              <div class="relative w-full h-3.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500 ${
                    rollingLexile >= 1075
                      ? 'bg-emerald-500'
                      : rollingLexile >= 980
                      ? 'bg-indigo-600'
                      : 'bg-amber-500'
                  }"
                  style="width: ${pctToCutoff}%"
                ></div>
                <div
                  class="absolute top-0 bottom-0 w-0.5 bg-emerald-900"
                  style="left: ${cutoffMarkerPct}%"
                  title="1075L Dickerson AC Cutoff"
                ></div>
              </div>

              <div class="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>800L (Spring G4)</span>
                <span>940L (Fall G5)</span>
                <span class="text-emerald-800 font-extrabold">🎯 1075L AC Gate</span>
                <span>1150L</span>
              </div>
            </div>

            <!-- 4 Core AC Subjects Qualification Table -->
            <div class="space-y-1.5">
              ${courses
                .map((c) => {
                  let badge = '';
                  if (rollingLexile >= 1075) {
                    badge = `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">🟢 Qualified (${rollingLexile}L)</span>`;
                  } else if (rollingLexile >= 980) {
                    badge = `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-extrabold">🟡 Approaching (-${gap}L)</span>`;
                  } else {
                    badge = `<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[11px] font-extrabold">🔴 -${gap}L to Cutoff</span>`;
                  }

                  return `
                    <div class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                      <div>
                        <span class="font-extrabold text-slate-800">${escapeHtml(c.name)}</span>
                        <span class="text-[11px] text-slate-500 ml-1">(${escapeHtml(c.req)})</span>
                      </div>
                      ${badge}
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>

          <div class="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
            <span><strong>Remaining G5 Windows:</strong> Winter (12/2026) &amp; Spring (03/2027)</span>
            <span class="font-bold text-indigo-700">${gap === 0 ? 'Cutoff Exceeded!' : `${gap}L to lock in AC`}</span>
          </div>
        </div>
      `;
    },

    /**
     * ROW 3, PART A: Complete 24-Workout Curriculum Matrix Browser
     */
    renderCurriculumBrowser(workouts, prog) {
      const filtered = (window.V2Engine && typeof window.V2Engine.getWorkoutsByFilter === 'function')
        ? window.V2Engine.getWorkoutsByFilter(this.filters)
        : workouts;

      const trialHistory = Array.isArray(prog.trialHistory) ? prog.trialHistory : [];

      return `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
            <div>
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                Complete V2 Assessment Bank (Tiers 0–4)
              </span>
              <h3 class="text-lg font-extrabold text-slate-900">
                Daily Precision Workout Curriculum Matrix (${filtered.length} / ${workouts.length} Workouts)
              </h3>
            </div>

            <!-- Filter Bar -->
            <div class="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter by Tier"
                onchange="window.ParentUI.setFilter('tier', this.value)"
                class="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
              >
                <option value="ALL" ${this.filters.tier === 'ALL' ? 'selected' : ''}>All Tiers (0–4)</option>
                <option value="0" ${this.filters.tier === '0' ? 'selected' : ''}>Tier 0: Scaffold (850L–920L)</option>
                <option value="1" ${this.filters.tier === '1' ? 'selected' : ''}>Tier 1: Consolidation (940L–980L)</option>
                <option value="2" ${this.filters.tier === '2' ? 'selected' : ''}>Tier 2: Bridge (980L–1030L)</option>
                <option value="3" ${this.filters.tier === '3' ? 'selected' : ''}>Tier 3: Dickerson AC Gate (1030L–1085L)</option>
                <option value="4" ${this.filters.tier === '4' ? 'selected' : ''}>Tier 4: Mastery Buffer (1085L–1150L)</option>
              </select>

              <select
                aria-label="Filter by Genre"
                onchange="window.ParentUI.setFilter('genre', this.value)"
                class="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
              >
                <option value="ALL" ${this.filters.genre === 'ALL' ? 'selected' : ''}>All Genres</option>
                <option value="Literary" ${this.filters.genre === 'Literary' ? 'selected' : ''}>📖 Literary (45%)</option>
                <option value="Informational" ${this.filters.genre === 'Informational' ? 'selected' : ''}>🔬 Informational (55%)</option>
              </select>

              <select
                aria-label="Filter by Domain"
                onchange="window.ParentUI.setFilter('domain', this.value)"
                class="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
              >
                <option value="ALL" ${this.filters.domain === 'ALL' ? 'selected' : ''}>All 5 BEACON Domains</option>
                <option value="D1_KEY_IDEAS" ${this.filters.domain === 'D1_KEY_IDEAS' ? 'selected' : ''}>D1: Key Ideas &amp; Inference</option>
                <option value="D2_CRAFT_STRUCTURE" ${this.filters.domain === 'D2_CRAFT_STRUCTURE' ? 'selected' : ''}>D2: Vocab &amp; Text Structure</option>
                <option value="D3_INTEGRATION" ${this.filters.domain === 'D3_INTEGRATION' ? 'selected' : ''}>D3: Claims &amp; Synthesis</option>
                <option value="D4_SYNTAX" ${this.filters.domain === 'D4_SYNTAX' ? 'selected' : ''}>D4: Sentence Surgery [Syntax]</option>
                <option value="D5_EBSR" ${this.filters.domain === 'D5_EBSR' ? 'selected' : ''}>D5: Paired Proof [EBSR]</option>
              </select>
            </div>
          </div>

          <div class="overflow-x-auto max-h-96">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-100/90 text-slate-600 uppercase text-[11px] font-extrabold sticky top-0 z-10">
                <tr>
                  <th class="py-3 px-4">#</th>
                  <th class="py-3 px-4">Workout Title &amp; Sub-Genre</th>
                  <th class="py-3 px-3">Tier</th>
                  <th class="py-3 px-3">Genre</th>
                  <th class="py-3 px-3">Lexile / FKGL</th>
                  <th class="py-3 px-3">Focus Domain &amp; GSE</th>
                  <th class="py-3 px-3">Status &amp; Best Score</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200/70">
                ${filtered
                  .map((w) => {
                    const attempts = trialHistory.filter((t) => t.workoutId === w.workoutId);
                    const isCompleted = attempts.length > 0;
                    const isQueued = prog.queuedWorkoutId === w.workoutId;
                    let bestFirst = 0;
                    let bestTotal = 6;
                    attempts.forEach((a) => {
                      const c = Number(a.firstTryCorrectCount) || 0;
                      if (c >= bestFirst) {
                        bestFirst = c;
                        bestTotal = Number(a.questionsAttempted) || 6;
                      }
                    });

                    return `
                      <tr class="hover:bg-slate-50/90 transition ${isQueued ? 'bg-indigo-50/50' : ''}">
                        <td class="py-3 px-4 font-extrabold text-slate-700">#${w.workoutNumber || 1}</td>
                        <td class="py-3 px-4">
                          <div class="font-extrabold text-slate-900 text-xs sm:text-sm">${escapeHtml(w.title)}</div>
                          <div class="text-[11px] text-slate-500">${escapeHtml(w.subGenre || '')}</div>
                        </td>
                        <td class="py-3 px-3">
                          <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                            Tier ${w.tier !== undefined ? w.tier : 1}
                          </span>
                        </td>
                        <td class="py-3 px-3">
                          <span class="px-2 py-0.5 rounded font-bold ${
                            w.genre === 'Literary'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }">
                            ${w.genre === 'Literary' ? '📖 Literary' : '🔬 Informational'}
                          </span>
                        </td>
                        <td class="py-3 px-3 font-bold text-slate-800">
                          <div>${w.targetLexile}L <span class="text-[11px] text-slate-500">(${escapeHtml(w.lexileBand || '')})</span></div>
                          <div class="text-[11px] text-slate-500">FKGL ${w.fkgl}</div>
                        </td>
                        <td class="py-3 px-3">
                          <div class="font-bold text-slate-800">${escapeHtml(DOMAIN_SHORT_LABELS[w.focusDomain] || w.focusDomain)}</div>
                          <div class="text-[11px] font-semibold text-indigo-600">${escapeHtml(w.focusStandard || '')}</div>
                        </td>
                        <td class="py-3 px-3">
                          ${
                            isQueued
                              ? `<span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold">🎯 Queued Next</span>`
                              : isCompleted
                              ? `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">✅ Best: ${bestFirst}/${bestTotal} (${Math.round((bestFirst / bestTotal) * 100)}%)</span>`
                              : `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">⚪ Unattempted</span>`
                          }
                        </td>
                        <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onclick="window.ParentUI.queueDomainOrWorkout('${escapeHtml(w.workoutId)}', '${escapeHtml(w.title)}')"
                            class="px-2.5 py-1 rounded-lg border text-xs font-extrabold transition cursor-pointer ${
                              isQueued
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200'
                            }"
                          >
                            ${isQueued ? '✓ Queued' : 'Queue Next'}
                          </button>
                          <button
                            type="button"
                            onclick="window.ParentUI.launchWorkoutNow('${escapeHtml(w.workoutId)}')"
                            class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition cursor-pointer"
                          >
                            Launch Now
                          </button>
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    setFilter(key, val) {
      this.filters[key] = val;
      this.renderDashboard();
    },

    /**
     * ROW 3, PART B: Append-Only Trial Log & Item Inspector Trigger
     */
    renderTrialHistoryLog(prog, workouts) {
      const trials = Array.isArray(prog.trialHistory) ? prog.trialHistory.slice().reverse() : [];

      return `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
            <div>
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                Append-Only Psychometric Telemetry
              </span>
              <h3 class="text-lg font-extrabold text-slate-900">
                Longitudinal Practice Trial Log &amp; Item-Level Inspector (${trials.length} Recorded Sessions)
              </h3>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-100/90 text-slate-600 uppercase text-[11px] font-extrabold">
                <tr>
                  <th class="py-3 px-4">Date / Time</th>
                  <th class="py-3 px-4">Workout &amp; Genre</th>
                  <th class="py-3 px-3">Lexile / FKGL</th>
                  <th class="py-3 px-3">1st-Try Score</th>
                  <th class="py-3 px-3">Final Score</th>
                  <th class="py-3 px-3">Time &amp; Pacing</th>
                  <th class="py-3 px-3">Traps Triggered</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200/70">
                ${trials
                  .map((t) => {
                    const tid = t.trialId || t.sessionId || '';
                    const qTotal = Number(t.questionsAttempted) || 6;
                    const firstC = Number(t.firstTryCorrectCount) || 0;
                    const firstPct = Math.round((firstC / qTotal) * 100);
                    const finalC =
                      t.retryCorrectCount !== undefined ? Number(t.retryCorrectCount) : firstC;
                    const finalPct = Math.round((finalC / qTotal) * 100);
                    const items = Array.isArray(t.itemAttempts) ? t.itemAttempts : t.items || [];
                    const traps = items
                      .filter((it) => !it.firstTryCorrect && (it.trapType || it.distractorTrapSelected))
                      .map((it) => it.trapType || it.distractorTrapSelected);

                    return `
                      <tr class="hover:bg-slate-50 transition">
                        <td class="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">
                          ${escapeHtml(formatDateTime(t.timestampISO || t.completedAt))}
                        </td>
                        <td class="py-3 px-4">
                          <div class="font-extrabold text-slate-900">${escapeHtml(t.title || t.workoutTitle || t.workoutId)}</div>
                          <div class="text-[11px] text-slate-500">${escapeHtml(t.genre || 'Informational')} &bull; Tier ${t.tier !== undefined ? t.tier : 1}</div>
                        </td>
                        <td class="py-3 px-3 font-bold text-slate-800">
                          ${t.targetLexile || 960}L <span class="text-slate-500 font-normal">(FK ${t.fkgl || 6.3})</span>
                        </td>
                        <td class="py-3 px-3">
                          <span class="px-2 py-0.5 rounded-md font-extrabold ${
                            firstPct >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : firstPct >= 65
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }">
                            ${firstC}/${qTotal} (${firstPct}%)
                          </span>
                        </td>
                        <td class="py-3 px-3 font-bold text-slate-800">
                          ${finalC}/${qTotal} (${finalPct}%)
                        </td>
                        <td class="py-3 px-3 text-slate-700">
                          <div class="font-bold">${t.totalDurationSeconds || 120}s (${t.avgSecondsPerItem || 20}s/q)</div>
                          <div class="text-[11px]">
                            ${t.impulsiveCount > 0 ? `<span class="text-amber-700 font-bold">⚡ ${t.impulsiveCount} Rush</span> ` : ''}
                            ${t.hesitationCount > 0 ? `<span class="text-indigo-700 font-bold">🐢 ${t.hesitationCount} Slow</span>` : ''}
                            ${!t.impulsiveCount && !t.hesitationCount ? `<span class="text-emerald-700 font-semibold">🎯 Optimal Pace</span>` : ''}
                          </div>
                        </td>
                        <td class="py-3 px-3">
                          ${
                            traps.length === 0
                              ? `<span class="text-emerald-700 font-bold">✨ Zero Traps</span>`
                              : traps
                                  .map(
                                    (tr) =>
                                      `<span class="inline-block px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold mr-1 mb-1">${escapeHtml(
                                        tr.replace('TRAP_', '')
                                      )}</span>`
                                  )
                                  .join('')
                          }
                        </td>
                        <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onclick="window.ParentUI.openTrialInspector('${escapeHtml(tid)}')"
                            class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs transition cursor-pointer"
                          >
                            🔍 Inspect Items
                          </button>
                          <button
                            type="button"
                            onclick="window.ParentUI.handleDeleteTrial('${escapeHtml(tid)}')"
                            class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs transition cursor-pointer"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}

                <!-- Pinned Official Fall G5 BEACON Anchor Row -->
                <tr class="bg-slate-50/90">
                  <td class="py-3 px-4 font-extrabold text-slate-800">Sep 01, 2026</td>
                  <td class="py-3 px-4">
                    <div class="font-extrabold text-slate-900">🏛️ Official DRC BEACON Fall Grade 5 Assessment</div>
                    <div class="text-[11px] text-slate-500">Nickajack Elementary School &bull; Cobb County School District</div>
                  </td>
                  <td class="py-3 px-3 font-extrabold text-emerald-800">940L Official</td>
                  <td class="py-3 px-3">
                    <span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold">+140L Breakout</span>
                  </td>
                  <td class="py-3 px-3 font-bold text-slate-600">850L–990L Band</td>
                  <td class="py-3 px-3 text-slate-500">Official CAT</td>
                  <td class="py-3 px-3 text-slate-500">Baseline Anchor</td>
                  <td class="py-3 px-4 text-right">
                    <span class="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-extrabold text-[11px]">📌 Official Anchor</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    /**
     * Item Inspector Drawer / Modal for any selected trial
     */
    renderTrialInspectorModal(prog, workouts) {
      if (!this.inspectedTrialId) return '';
      const trials = Array.isArray(prog.trialHistory) ? prog.trialHistory : [];
      const trial = trials.find(
        (t) => t.trialId === this.inspectedTrialId || t.sessionId === this.inspectedTrialId
      );
      if (!trial) return '';

      const workoutObj = workouts.find((w) => w.workoutId === trial.workoutId) || null;
      const questions = (workoutObj && workoutObj.questions) || [];
      const items = Array.isArray(trial.itemAttempts) ? trial.itemAttempts : trial.items || [];

      return `
        <div class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            <!-- Modal Header -->
            <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div>
                <div class="text-xs font-extrabold text-indigo-300 uppercase tracking-wider">
                  🔍 Item-by-Item Psychometric Audit
                </div>
                <h3 class="text-lg sm:text-xl font-extrabold">
                  ${escapeHtml(trial.title || trial.workoutTitle || trial.workoutId)} (${trial.targetLexile || 960}L &bull; FKGL ${trial.fkgl || 6.3})
                </h3>
              </div>
              <button
                type="button"
                onclick="window.ParentUI.closeTrialInspector()"
                class="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold cursor-pointer"
              >
                ✕ Close Inspector
              </button>
            </div>

            <!-- Modal Body: Question Audit Cards -->
            <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
              ${items
                .map((it, idx) => {
                  const qDef = questions[idx] || {};
                  const stem = it.stem || it.prompt || qDef.prompt || `Question ${idx + 1}`;
                  const provingSent = it.provingSentenceText || qDef.provingSentenceText || '';
                  const parentExp =
                    it.parentExplanation ||
                    qDef.parentExplanation ||
                    it.childTip ||
                    qDef.childTip ||
                    'Verified against passage evidence.';
                  const firstChoice = it.selectedOptionId || it.firstTrySelectedLetter || it.firstTryChoice || '—';
                  const finalChoice = it.retrySelectedOptionId || it.retrySelectedLetter || it.finalChoice || firstChoice;
                  const correctChoice = it.correctOptionId || it.correctLetter || it.correctChoice || '—';
                  const firstOk = Boolean(it.firstTryCorrect);
                  const trap = it.trapType || it.distractorTrapSelected || null;

                  return `
                    <div class="bg-white rounded-2xl border ${
                      firstOk ? 'border-emerald-200' : 'border-rose-200'
                    } p-4 sm:p-5 shadow-2xs space-y-3">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="px-2.5 py-0.5 rounded-md font-extrabold text-xs ${
                            firstOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }">
                            Q${idx + 1}: ${firstOk ? '✅ 1st-Try Correct' : '❌ Missed 1st Try'}
                          </span>
                          <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-xs">
                            ${escapeHtml(it.standard || qDef.standard || 'ELAGSE5')} &bull; DOK ${it.dok || qDef.dok || 2}
                          </span>
                          <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-xs">
                            ${escapeHtml(DOMAIN_SHORT_LABELS[it.domain] || it.domain || '')}
                          </span>
                        </div>
                        <span class="text-xs font-bold text-slate-500">
                          ⏱️ ${it.timeSpentSeconds || 20}s
                          ${it.impulsiveFlag ? '• ⚡ Impulsive (<8s)' : ''}
                          ${it.hesitationFlag ? '• 🐢 Hesitation (>90s)' : ''}
                        </span>
                      </div>

                      <div class="text-sm font-bold text-slate-900 whitespace-pre-line">
                        ${escapeHtml(stem)}
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div class="p-2.5 rounded-xl border ${
                          firstOk ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                        }">
                          <div class="font-extrabold uppercase text-[10px] opacity-75">1st Choice</div>
                          <div class="font-extrabold text-sm mt-0.5">
                            Choice ${escapeHtml(firstChoice)} ${firstOk ? '✅' : '❌'}
                          </div>
                          ${
                            trap
                              ? `<div class="mt-1 inline-block px-1.5 py-0.5 rounded bg-rose-200/70 text-rose-950 text-[10px] font-extrabold">🪤 ${escapeHtml(trap)}</div>`
                              : ''
                          }
                        </div>

                        <div class="p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-800">
                          <div class="font-extrabold uppercase text-[10px] opacity-75">Final / Retry Choice</div>
                          <div class="font-extrabold text-sm mt-0.5">
                            Choice ${escapeHtml(finalChoice)} ${it.retryCorrect ? '✅' : ''}
                          </div>
                        </div>

                        <div class="p-2.5 rounded-xl border bg-emerald-50/60 border-emerald-200 text-emerald-950">
                          <div class="font-extrabold uppercase text-[10px] opacity-75">Correct Answer Key</div>
                          <div class="font-extrabold text-sm mt-0.5">
                            Choice ${escapeHtml(correctChoice)}
                          </div>
                        </div>
                      </div>

                      ${
                        provingSent
                          ? `
                          <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                            <div class="font-extrabold text-emerald-800 uppercase text-[10px]">
                              📖 Verbatim Proving Sentence in Passage (Paragraph ${it.provingParagraph || qDef.provingParagraph || 1})
                            </div>
                            <div class="font-serif italic text-emerald-950 font-medium">
                              "${escapeHtml(provingSent)}"
                            </div>
                          </div>
                        `
                          : ''
                      }

                      <div class="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-slate-800">
                        <span class="font-extrabold text-indigo-900">🧠 Diagnostic Explanation: </span>
                        <span>${escapeHtml(parentExp)}</span>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        </div>
      `;
    },

    openTrialInspector(trialId) {
      this.inspectedTrialId = trialId;
      this.renderDashboard();
    },

    closeTrialInspector() {
      this.inspectedTrialId = null;
      this.renderDashboard();
    },

    /**
     * Queue a targeted domain or specific workout for Lucas's next session
     */
    async queueDomainOrWorkout(idOrDomain, label) {
      if (window.V2Engine && typeof window.V2Engine.queueWorkoutForNextSession === 'function') {
        const chosen = await window.V2Engine.queueWorkoutForNextSession(idOrDomain);
        const title = (chosen && chosen.title) || label || idOrDomain;
        if (window.showV2Toast) {
          window.showV2Toast(`Queued "${title}" for next practice session!`, 'emerald');
        }
        this.renderDashboard();
      }
    },

    /**
     * Switch to Student View and immediately launch the selected workout
     */
    launchWorkoutNow(workoutId) {
      if (typeof window.switchAppMode === 'function') {
        window.switchAppMode('student');
      }
      if (window.StudentUI && typeof window.StudentUI.startWorkout === 'function') {
        window.StudentUI.startWorkout(workoutId);
      }
    },

    /**
     * Delete a trial from history and refresh dashboard
     */
    async handleDeleteTrial(trialId) {
      if (!trialId) return;
      if (window.V2Engine && typeof window.V2Engine.deleteTrial === 'function') {
        await window.V2Engine.deleteTrial(trialId);
        if (this.inspectedTrialId === trialId) {
          this.inspectedTrialId = null;
        }
        if (window.showV2Toast) {
          window.showV2Toast('Trial removed and longitudinal metrics recalculated.', 'amber');
        }
        this.renderDashboard();
      }
    },

    /**
     * Reset progress back to 940L Fall G5 official BEACON baseline
     */
    async confirmResetProgress() {
      if (window.V2Engine && typeof window.V2Engine.resetProgress === 'function') {
        await window.V2Engine.resetProgress();
        this.inspectedTrialId = null;
        if (window.showV2Toast) {
          window.showV2Toast('Reset to 940L Fall G5 Official BEACON Baseline.', 'rose');
        }
        this.renderDashboard();
      }
    },
  };

  window.addEventListener('v2:ready', () => {
    ParentUI.renderDashboard();
  });

  window.addEventListener('v2:stateUpdated', () => {
    ParentUI.renderDashboard();
  });

  window.ParentUI = ParentUI;
})();
