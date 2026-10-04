/**
 * ============================================================================
 * V2 Student Experience UI (window.StudentUI)
 * Strictly enforces Gate 3:
 *  - 1 to 3 words max per button/badge/pill inside #student-view
 *  - ZERO psychometric jargon (no Lexile, DOK, Pillar, SEM, ELAGSE, EBSR, etc.)
 *  - 3-Screen Minimalist Child Flow:
 *      Screen 1: Daily Launchpad (Hero Card + 3 Adventure Cards + All Quests Drawer)
 *      Screen 2: DRC INSIGHT Split-Screen Reader & Practice Workspace
 *      Screen 3: Celebration Card
 * ============================================================================
 */

(function () {
  'use strict';

  const BANNED_JARGON_REGEX = /\b(dok|pillar|sem|lexile|quantile|nominalization|psychometric|ebsr|elagse\w*|metacognitive|subordinate\s+clause|appositive|fkgl|distractor\s+trap)\b/gi;

  function sanitizeChildText(str) {
    if (!str) return '';
    return String(str).replace(BANNED_JARGON_REGEX, '').replace(/\s{2,}/g, ' ').trim();
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeWs(str) {
    return String(str || '').replace(/\s+/g, ' ').trim();
  }

  function splitIntoSentences(paragraphText) {
    const cleaned = paragraphText.replace(/\b(Mr|Mrs|Ms|Dr|St|Mt|Jr|Sr|vs|etc)\./g, '$1<PRD>');
    const rawParts = cleaned.split(/(?<=[.!?])\s+/);
    return rawParts
      .map((s) => s.replace(/<PRD>/g, '.').trim())
      .filter((s) => s.length > 0);
  }

  const StudentUI = {
    activeSubject: 'reading', // 'reading' | 'math'
    currentScreen: 'launchpad', // 'launchpad' | 'workspace' | 'celebration'
    allQuestsOpen: false,
    fontSizes: [16, 18, 20],
    fontSizeIdx: 1, // default 18px
    tools: {
      highlight: false,
      lineGuide: false,
      surgery: false,
    },
    lineGuideY: 140,
    activeVocabIdx: null,
    activeSurgeryFocus: 'all', // 'all' | 'who' | 'action' | 'what' | 'simple'
    session: null,
    lastTrialResult: null,

    setSubject(subject) {
      this.activeSubject = subject === 'math' ? 'math' : 'reading';
      this.session = null;
      this.activeVocabIdx = null;
      this.renderLaunchpad();
    },

    normalizeMathWorkout(raw, idx) {
      if (!raw) return null;
      if (raw.isMath && raw.workoutId) return raw;
      const cleanTitle = String(raw.title || 'Math Quest')
        .replace(/^🎯\s*Diagnostic Focus Workout\s*\d*:\s*/i, '')
        .replace(/^Math Mission\s*\d*:\s*/i, '')
        .trim();
      const para1 = raw.scenario || raw.description || 'Solve each problem step by step and check your units.';
      const para2 = raw.strategyTip
        ? `Math Strategy Clue: ${raw.strategyTip}`
        : 'Tip: Estimate first so you can cross out choices that are too big or too small!';
      const questions = (raw.questions || []).map((q, qIdx) => {
        const opts = (q.options || []).map((o, oIdx) => {
          const letter = o.letter || o.id || ['A', 'B', 'C', 'D'][oIdx] || 'A';
          const isCorr = Boolean(o.isCorrect || o.errorType === 'correct' || q.correctIndex === oIdx);
          return {
            id: letter,
            text: o.text || '',
            isCorrect: isCorr,
            trapType: isCorr ? null : (o.errorType || 'computational_error'),
          };
        });
        return {
          questionId: q.id || `${raw.id}_q${qIdx + 1}`,
          questionNumber: qIdx + 1,
          itemType: 'MATH_PROBLEM',
          domain: q.domain || 'NF',
          standard: q.standard || raw.gradeLevel || '5.NF',
          dok: q.dokLevel || q.dok || 2,
          requireClickToProve: false,
          prompt: q.question || q.prompt || '',
          options: opts,
          provingParagraph: 1,
          provingSentenceText: para1,
          childTip: q.explanation || 'Great step-by-step math thinking!',
          parentExplanation: q.explanation || '',
        };
      });

      return {
        workoutId: raw.id || `math_${idx + 1}`,
        workoutNumber: idx + 1,
        title: cleanTitle,
        subject: 'math',
        isMath: true,
        tier: 2,
        targetLexile: 950,
        fkgl: 6.0,
        genre: 'Math',
        subGenre: raw.category || 'Problem Solving',
        focusDomain: (questions[0] && questions[0].domain) || 'NF',
        focusStandard: raw.gradeLevel || 'GSE 5th Math',
        estimatedMinutes: 10,
        passage: {
          title: cleanTitle,
          text: `${para1}\n\n${para2}`,
          tier2Words: [],
        },
        questions: questions,
      };
    },

    /**
     * Refresh top navigation bar student indicators (streak, level, student selector)
     */
    refreshHeader() {
      const state = window.V2State || {};
      const prog = state.progress || {};
      const streakDays = prog.streakDays || prog.streak || 3;
      const xp = typeof prog.xp === 'number' ? prog.xp : 450;
      const levelNum = Math.max(1, Math.floor(xp / 200) + 1);
      const levelProgressPct = Math.min(100, Math.round(((xp % 200) / 200) * 100));

      const streakEl = document.getElementById('nav-streak-text');
      if (streakEl) {
        streakEl.textContent = `${streakDays} Days`;
      }

      const levelLabel = document.getElementById('nav-level-label');
      if (levelLabel) {
        levelLabel.textContent = `Level ${levelNum}`;
      }

      const levelBar = document.getElementById('nav-level-progress');
      if (levelBar) {
        levelBar.style.width = `${Math.max(12, levelProgressPct)}%`;
      }

      const xpLabel = document.getElementById('nav-xp-label');
      if (xpLabel) {
        xpLabel.textContent = `${xp} XP`;
      }

      const selectEl = document.getElementById('nav-student-select');
      if (selectEl && prog.studentId) {
        selectEl.value = prog.studentId;
      }
    },

    /**
     * Map workout completion & star ratings from V2State.progress
     */
    getWorkoutStatus(workoutId) {
      const prog = (window.V2State && window.V2State.progress) || {};
      const trials = Array.isArray(prog.trialHistory) ? prog.trialHistory : [];
      const matching = trials.filter((t) => t && t.workoutId === workoutId);
      if (matching.length === 0) {
        return { completed: false, stars: 0, bestFirstTry: 0, total: 6 };
      }
      let bestFirstTry = 0;
      let total = 6;
      matching.forEach((t) => {
        const s = typeof t.firstTryCorrectCount === 'number' ? t.firstTryCorrectCount : (t.firstTryScore || 0);
        const tot = t.questionsAttempted || t.totalQuestions || 6;
        if (s >= bestFirstTry) {
          bestFirstTry = s;
          total = tot;
        }
      });
      const pct = total > 0 ? bestFirstTry / total : 0;
      const stars = pct >= 0.8 ? 3 : pct >= 0.5 ? 2 : 1;
      return { completed: true, stars, bestFirstTry, total };
    },

    /**
     * SCREEN 1 — Daily Launchpad (Reading or Math)
     */
    renderLaunchpad() {
      this.currentScreen = 'launchpad';
      this.refreshHeader();

      if (this.activeSubject === 'math') {
        this.renderMathLaunchpad();
        return;
      }

      const root = document.getElementById('student-root');
      if (!root) return;

      const state = window.V2State || {};
      const workouts = Array.isArray(state.workouts) ? state.workouts : [];
      const engine = window.V2Engine || {};

      const recommended =
        (typeof engine.getRecommendedTodayWorkout === 'function' && engine.getRecommendedTodayWorkout()) ||
        workouts[0] ||
        null;

      const adventures =
        (typeof engine.getAdventureCards === 'function' && engine.getAdventureCards()) || {
          storyQuest: workouts.find((w) => w.genre === 'Literary') || workouts[0],
          discoveryLab: workouts.find((w) => w.genre === 'Informational') || workouts[1] || workouts[0],
          speedBoost: workouts.find((w) => w.focusDomain === 'D4_SYNTAX' || w.focusDomain === 'D5_EBSR') || workouts[2] || workouts[0],
        };

      if (!recommended) {
        root.innerHTML = `
          <div class="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
            <div class="text-5xl mb-4">📚</div>
            <p class="text-lg font-bold text-slate-700 mb-4">Quests are getting ready!</p>
          </div>
        `;
        return;
      }

      const isLiterary = recommended.genre === 'Literary';
      const heroGenreBadge = isLiterary ? '📖 Story' : '🔬 Discovery';
      const heroMinutes = recommended.estimatedMinutes || 10;
      const isQueued = state.progress && state.progress.queuedWorkoutId === recommended.workoutId;

      const storyQuest = adventures.storyQuest || workouts[0];
      const discoveryLab = adventures.discoveryLab || workouts[1] || workouts[0];
      const speedBoost = adventures.speedBoost || workouts[2] || workouts[0];

      const completedCount = workouts.filter((w) => this.getWorkoutStatus(w.workoutId).completed).length;

      root.innerHTML = `
        <div class="space-y-8 pb-10">
          <!-- HERO CARD: Recommended Today Workout -->
          <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white p-6 sm:p-10 shadow-xl border border-indigo-800/60">
            <div class="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none"></div>
            <div class="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div class="space-y-4 max-w-2xl">
                <div class="flex flex-wrap items-center gap-2.5">
                  <span class="badge inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs sm:text-sm font-extrabold">
                    ${isQueued ? '🎯 Next Quest' : '⭐ Today'}
                  </span>
                  <span class="badge inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 text-white text-xs sm:text-sm font-bold">
                    ${heroGenreBadge}
                  </span>
                  <span class="badge inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-200 text-xs sm:text-sm font-bold">
                    ⏱️ ${heroMinutes} Min
                  </span>
                </div>

                <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  ${escapeHtml(sanitizeChildText(recommended.title))}
                </h1>

                <p class="text-indigo-200 text-sm sm:text-base font-medium">
                  Read closely, spot hidden clues, and unlock 3 stars!
                </p>
              </div>

              <div class="flex-shrink-0">
                <button
                  type="button"
                  onclick="window.StudentUI.startWorkout('${escapeHtml(recommended.workoutId)}')"
                  class="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-lg sm:text-xl shadow-lg hover:shadow-amber-400/25 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  <span>▶️ Start Today</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 3 ADVENTURE CARDS -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            ${this.renderAdventureCard(storyQuest, '📖 Story Quest', 'from-rose-500 to-orange-500', 'bg-rose-50 text-rose-700 border-rose-200')}
            ${this.renderAdventureCard(discoveryLab, '🔬 Discovery Lab', 'from-sky-500 to-indigo-600', 'bg-sky-50 text-sky-700 border-sky-200')}
            ${this.renderAdventureCard(speedBoost, '⚡ Skill Boost', 'from-emerald-500 to-teal-600', 'bg-emerald-50 text-emerald-700 border-emerald-200')}
          </div>

          <!-- COLLAPSIBLE ALL QUESTS DRAWER -->
          <div class="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div class="p-4 sm:p-5 flex items-center justify-between bg-slate-50/70">
              <button
                type="button"
                onclick="window.StudentUI.toggleAllQuestsDrawer()"
                class="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-sm sm:text-base border border-slate-200 shadow-2xs transition cursor-pointer"
              >
                <span>📚 All Quests (${workouts.length})</span>
              </button>

              <div class="flex items-center gap-2">
                <span class="badge inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold">
                  ✅ ${completedCount}/${workouts.length}
                </span>
              </div>
            </div>

            <div id="all-quests-drawer-body" class="${this.allQuestsOpen ? '' : 'hidden'} p-4 sm:p-6 border-t border-slate-200">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                ${workouts.map((w) => this.renderQuestDrawerItem(w)).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    },

    /**
     * SCREEN 1B — Math Launchpad (3 Targeted Focus Workouts + 20 Math Missions)
     */
    renderMathLaunchpad() {
      const root = document.getElementById('student-root');
      if (!root) return;

      const focusWorkouts = (window.LUCAS_TARGETED_WORKOUTS || []).map((w, i) =>
        this.normalizeMathWorkout(w, i)
      );
      const mathMissions = (window.MATH_MISSIONS_DATA || []).map((m, i) =>
        this.normalizeMathWorkout(m, i)
      );

      const heroMath = focusWorkouts[0] || mathMissions[0];
      if (!heroMath) {
        root.innerHTML = `
          <div class="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
            <div class="text-5xl mb-4">📐</div>
            <p class="text-lg font-bold text-slate-700">Math Quests Ready!</p>
          </div>
        `;
        return;
      }

      const completedMissions = mathMissions.filter((m) => this.getWorkoutStatus(m.workoutId).completed).length;

      root.innerHTML = `
        <div class="space-y-8 pb-10">
          <!-- MATH HERO CARD -->
          <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-indigo-950 text-white p-6 sm:p-10 shadow-xl border border-emerald-800/60">
            <div class="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div class="space-y-4 max-w-2xl">
                <div class="flex flex-wrap items-center gap-2.5">
                  <span class="badge inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs sm:text-sm font-extrabold">
                    🎯 Math Focus
                  </span>
                  <span class="badge inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 text-white text-xs sm:text-sm font-bold">
                    📐 Math Quest
                  </span>
                  <span class="badge inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-200 text-xs sm:text-sm font-bold">
                    ⏱️ 10 Min
                  </span>
                </div>

                <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  ${escapeHtml(sanitizeChildText(heroMath.title))}
                </h1>

                <p class="text-emerald-100 text-sm sm:text-base font-medium">
                  Solve step by step, check your work, and earn 3 stars!
                </p>
              </div>

              <div class="flex-shrink-0">
                <button
                  type="button"
                  onclick="window.StudentUI.startWorkout('${escapeHtml(heroMath.workoutId)}')"
                  class="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-lg sm:text-xl shadow-lg transition-all cursor-pointer"
                >
                  <span>▶️ Start Math</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 3 TARGETED FOCUS WORKOUT CARDS -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            ${this.renderAdventureCard(focusWorkouts[0] || mathMissions[0], '🎯 Fractions Bridge', 'from-emerald-500 to-teal-600', 'bg-emerald-50 text-emerald-700 border-emerald-200')}
            ${this.renderAdventureCard(focusWorkouts[1] || mathMissions[1], '⚡ Fraction Ops', 'from-sky-500 to-indigo-600', 'bg-sky-50 text-sky-700 border-sky-200')}
            ${this.renderAdventureCard(focusWorkouts[2] || mathMissions[2], '🧮 Number Power', 'from-amber-500 to-orange-600', 'bg-amber-50 text-amber-800 border-amber-200')}
          </div>

          <!-- ALL 20 MATH MISSIONS DRAWER -->
          <div class="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div class="p-4 sm:p-5 flex items-center justify-between bg-slate-50/70">
              <button
                type="button"
                onclick="window.StudentUI.toggleAllQuestsDrawer()"
                class="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-sm sm:text-base border border-slate-200 shadow-2xs transition cursor-pointer"
              >
                <span>📐 Math Quests (${mathMissions.length})</span>
              </button>

              <div class="flex items-center gap-2">
                <span class="badge inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold">
                  ✅ ${completedMissions}/${mathMissions.length}
                </span>
              </div>
            </div>

            <div id="all-quests-drawer-body" class="${this.allQuestsOpen ? '' : 'hidden'} p-4 sm:p-6 border-t border-slate-200">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                ${mathMissions.map((m) => this.renderQuestDrawerItem(m)).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    },

    renderAdventureCard(workout, badgeLabel, gradientClasses, pillClasses) {
      if (!workout) return '';
      const status = this.getWorkoutStatus(workout.workoutId);
      const starsHtml = status.completed
        ? '⭐'.repeat(status.stars) + '⚪'.repeat(Math.max(0, 3 - status.stars))
        : '⚪⚪⚪';

      return `
        <div class="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-5">
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-2">
              <span class="badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-extrabold ${pillClasses}">
                ${badgeLabel}
              </span>
              <span class="text-sm" title="Stars">${starsHtml}</span>
            </div>
            <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
              ${escapeHtml(sanitizeChildText(workout.title))}
            </h2>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-100">
            <span class="badge text-xs font-bold text-slate-500">
              ⏱️ ${workout.estimatedMinutes || 10} Min
            </span>
            <button
              type="button"
              onclick="window.StudentUI.startWorkout('${escapeHtml(workout.workoutId)}')"
              class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r ${gradientClasses} text-white font-extrabold text-sm shadow-xs hover:opacity-95 transition cursor-pointer"
            >
              <span>${status.completed ? '🔄 Replay' : '▶️ Play'}</span>
            </button>
          </div>
        </div>
      `;
    },

    renderQuestDrawerItem(workout) {
      const status = this.getWorkoutStatus(workout.workoutId);
      const isLit = workout.genre === 'Literary';
      const genreShort = workout.isMath ? '📐 Math' : isLit ? '📖 Story' : '🔬 Discovery';
      const starsStr = status.completed
        ? '⭐'.repeat(status.stars) + '⚪'.repeat(Math.max(0, 3 - status.stars))
        : '⚪⚪⚪';

      return `
        <div class="rounded-2xl border ${status.completed ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'} p-4 flex flex-col justify-between gap-3 hover:border-indigo-300 transition">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="badge text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                #${workout.workoutNumber || 1} ${genreShort}
              </span>
              <span class="text-xs font-bold">${status.completed ? '✅' : ''} ${starsStr}</span>
            </div>
            <div class="font-bold text-slate-900 text-sm sm:text-base line-clamp-1">
              ${escapeHtml(sanitizeChildText(workout.title))}
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-100">
            <span class="badge text-xs font-semibold text-slate-500">
              ⏱️ 10 Min
            </span>
            <button
              type="button"
              onclick="window.StudentUI.startWorkout('${escapeHtml(workout.workoutId)}')"
              class="px-3.5 py-1.5 rounded-lg ${status.completed ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} font-extrabold text-xs transition cursor-pointer"
            >
              ${status.completed ? '🔄 Replay' : '▶️ Play'}
            </button>
          </div>
        </div>
      `;
    },

    toggleAllQuestsDrawer() {
      this.allQuestsOpen = !this.allQuestsOpen;
      const body = document.getElementById('all-quests-drawer-body');
      if (body) {
        body.classList.toggle('hidden', !this.allQuestsOpen);
      }
    },

    /**
     * Start a workout session by workoutId or workout object (Reading or Math)
     */
    startWorkout(workoutIdOrObj) {
      const workouts = (window.V2State && window.V2State.workouts) || [];
      let workout = null;
      if (typeof workoutIdOrObj === 'object' && workoutIdOrObj !== null) {
        workout = workoutIdOrObj.isMath ? this.normalizeMathWorkout(workoutIdOrObj, 0) : workoutIdOrObj;
      } else {
        workout = workouts.find((w) => w.workoutId === workoutIdOrObj) || null;
        if (!workout) {
          const allMath = [
            ...(window.LUCAS_TARGETED_WORKOUTS || []),
            ...(window.MATH_MISSIONS_DATA || []),
            ...(window.FULL_LENGTH_MATH_ASSESSMENTS || []),
          ];
          const mathIdx = allMath.findIndex((m) => m && m.id === workoutIdOrObj);
          if (mathIdx !== -1) {
            workout = this.normalizeMathWorkout(allMath[mathIdx], mathIdx);
          }
        }
        if (!workout) {
          workout = workouts[0];
        }
      }
      if (!workout) return;

      const questions = Array.isArray(workout.questions) ? workout.questions : [];
      const now = Date.now();

      this.activeVocabIdx = null;
      this.activeSurgeryFocus = 'all';
      // Automatically open Sentence Surgery helper if Q1 is SENTENCE_SURGERY
      const q1 = questions[0] || {};
      this.tools.surgery = !workout.isMath && q1.itemType === 'SENTENCE_SURGERY';

      const studentId = (window.V2State && window.V2State.progress && window.V2State.progress.studentId) || (window.V2State && window.V2State.studentId) || 'lucas';

      this.session = {
        sessionId: `trial_${now}_${studentId}`,
        isSubmitting: false,
        workout: workout,
        startedAtMs: now,
        questionStartedAtMs: now,
        currentQuestionIdx: 0,
        highlightedSentences: new Set(),
        activeProofSentence: null,
        activeHintParagraph: null,
        itemStates: questions.map((q, idx) => {
          const needClickToProve = !workout.isMath && Boolean(q.requireClickToProve || idx === 2);
          return {
            questionIndex: idx,
            unlockedChoices: !needClickToProve,
            clickToProveRequired: needClickToProve,
            clickToProveSuccess: null,
            clickedSentenceText: null,
            selectedOptionId: null,
            firstChoice: null,
            finalChoice: null,
            firstTryCorrect: null,
            finalCorrect: null,
            firstTryTrap: null,
            attempts: 0, // 0, 1, or 2
            status: 'unanswered', // 'unanswered' | 'retry_pending' | 'resolved'
            eliminated: new Set(),
            timeSpentSeconds: 0,
          };
        }),
      };

      this.renderWorkspace();
    },

    /**
     * Update elapsed time for current question before switching or checking
     */
    recordActiveQuestionTime() {
      if (!this.session) return;
      const now = Date.now();
      const elapsedSec = Math.max(0.5, (now - this.session.questionStartedAtMs) / 1000);
      const qState = this.session.itemStates[this.session.currentQuestionIdx];
      if (qState && qState.status !== 'resolved') {
        qState.timeSpentSeconds = Math.round((qState.timeSpentSeconds + elapsedSec) * 10) / 10;
      }
      this.session.questionStartedAtMs = now;
    },

    /**
     * Friendly 2-word question badge (Zero psychometric jargon!)
     */
    getFriendlyQuestionBadge(q, idx) {
      const t = (q && q.itemType) || '';
      if (t === 'MATH_PROBLEM') return '📐 Math Step';
      if (t === 'SENTENCE_SURGERY' || idx === 0) return '✂️ Sentence Clue';
      if (t === 'VOCAB_CONTEXT' || idx === 1) return '🔤 Word Clue';
      if (t === 'EBSR_PART_A' || idx === 4) return '🧩 Part A';
      if (t === 'EBSR_PART_B' || idx === 5) return '🔍 Part B';
      if (q && q.requireClickToProve) return '👆 Find Proof';
      return '💡 Story Clue';
    },

    /**
     * SCREEN 2 — DRC INSIGHT Split-Screen Reader & Practice Workspace
     */
    renderWorkspace() {
      this.currentScreen = 'workspace';
      const root = document.getElementById('student-root');
      if (!root || !this.session) return;

      const { workout, currentQuestionIdx, itemStates } = this.session;
      const questions = workout.questions || [];
      const q = questions[currentQuestionIdx] || {};
      const qState = itemStates[currentQuestionIdx];
      const fontSizePx = this.fontSizes[this.fontSizeIdx] || 18;

      const showSurgeryBar = Boolean(
        this.tools.surgery || (currentQuestionIdx === 0 && q.itemType === 'SENTENCE_SURGERY')
      );

      const waitingForClickToProve = Boolean(
        qState && qState.clickToProveRequired && !qState.unlockedChoices && qState.status === 'unanswered'
      );

      const passageModeClasses = [
        this.tools.highlight ? 'highlighter-mode-active' : '',
        waitingForClickToProve ? 'click-to-prove-active' : '',
      ]
        .filter(Boolean)
        .join(' ');

      root.innerHTML = `
        <div id="drc-split-workspace" class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          <!-- LEFT PANE: DRC INSIGHT PASSAGE READER (7 cols on desktop) -->
          <div class="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col lg:h-[calc(100vh-7.25rem)]">
            
            <!-- Sticky DRC Toolbar (Strictly 1-2 words per button) -->
            <div class="sticky top-0 z-20 bg-slate-100/95 backdrop-blur border-b border-slate-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onclick="window.StudentUI.toggleTool('highlight')"
                  class="px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    this.tools.highlight
                      ? 'bg-amber-300 text-slate-950 border-amber-400 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }"
                >
                  🖍️ Highlight
                </button>

                <button
                  type="button"
                  onclick="window.StudentUI.toggleTool('lineGuide')"
                  class="px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    this.tools.lineGuide
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }"
                >
                  📏 Line Guide
                </button>

                <button
                  type="button"
                  onclick="window.StudentUI.toggleTool('surgery')"
                  class="px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    showSurgeryBar
                      ? 'bg-violet-600 text-white border-violet-700 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }"
                >
                  ✂️ Surgery
                </button>
              </div>

              <!-- Font Size Controls (A- / A+) -->
              <div class="flex items-center gap-1 bg-white rounded-xl p-0.5 border border-slate-200">
                <button
                  type="button"
                  onclick="window.StudentUI.changeFontSize(-1)"
                  class="px-2.5 py-1 rounded-lg text-xs font-extrabold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  ${this.fontSizeIdx === 0 ? 'disabled' : ''}
                >
                  A-
                </button>
                <button
                  type="button"
                  onclick="window.StudentUI.changeFontSize(1)"
                  class="px-2.5 py-1 rounded-lg text-xs font-extrabold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  ${this.fontSizeIdx === this.fontSizes.length - 1 ? 'disabled' : ''}
                >
                  A+
                </button>
              </div>
            </div>

            <!-- Interactive Sentence Surgery Bar (when Q1 or ✂️ Surgery active) -->
            ${showSurgeryBar ? this.renderSentenceSurgeryBar(workout.passage) : ''}

            <!-- Active Tier 2 Vocabulary Popover Card (when word clicked) -->
            ${this.activeVocabIdx !== null ? this.renderVocabPopover(workout.passage) : ''}

            <!-- Scrollable Passage Body -->
            <div
              id="drc-passage-container"
              onmousemove="window.StudentUI.handleLineGuideMove(event)"
              class="relative flex-1 overflow-y-auto px-5 sm:px-8 py-6 drc-passage-scroll font-serif text-slate-800 passage-font-${fontSizePx} ${passageModeClasses}"
            >
              ${
                this.tools.lineGuide
                  ? `<div id="drc-line-guide" class="drc-line-guide-bar" style="top: ${this.lineGuideY}px;"></div>`
                  : ''
              }

              <div class="mb-5 pb-3 border-b border-slate-100 font-sans">
                <span class="badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-extrabold mb-1">
                  ${workout.genre === 'Literary' ? '📖 Story' : '🔬 Discovery'}
                </span>
                <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900">
                  ${escapeHtml(sanitizeChildText((workout.passage && workout.passage.title) || workout.title))}
                </h2>
              </div>

              <div class="space-y-5">
                ${this.renderPassageParagraphs(workout.passage, showSurgeryBar)}
              </div>
            </div>
          </div>

          <!-- RIGHT PANE: QUESTION & DRC TOOLS (5 cols on desktop) -->
          <div class="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:h-[calc(100vh-7.25rem)] overflow-hidden">
            
            <!-- Top Progress Dots (1 to 6) + Exit Button -->
            <div class="bg-slate-100/95 border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 sm:gap-2">
                ${itemStates.map((st, idx) => this.renderProgressDot(st, idx, currentQuestionIdx)).join('')}
              </div>

              <button
                type="button"
                onclick="window.StudentUI.exitToHome()"
                class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-200/70 text-slate-700 border border-slate-200 text-xs font-extrabold transition cursor-pointer"
              >
                🏠 Home
              </button>
            </div>

            <!-- Question Body Scroll Area -->
            <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              
              <!-- Question Header Pill -->
              <div class="flex items-center justify-between gap-2">
                <span class="badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-extrabold">
                  ${this.getFriendlyQuestionBadge(q, currentQuestionIdx)}
                </span>
                <span class="text-xs font-extrabold text-slate-400">
                  ${currentQuestionIdx + 1} / ${questions.length}
                </span>
              </div>

              <!-- EBSR Part A -> Part B Bridge (Shown on Question 6) -->
              ${this.renderEbsrBridgeIfApplicable(q, currentQuestionIdx)}

              <!-- Question Stem -->
              <div class="text-slate-900 font-bold text-base sm:text-lg leading-relaxed whitespace-pre-line">
                ${escapeHtml(sanitizeChildText(q.prompt || q.stem || ''))}
              </div>

              <!-- Active Text Verification ("Click-to-Prove") Gate OR Option Cards -->
              ${
                waitingForClickToProve
                  ? this.renderClickToProvePrompt(q)
                  : this.renderOptionCards(q, qState)
              }

              <!-- 2-Attempt Micro-Feedback Card -->
              ${this.renderMicroFeedbackCard(q, qState)}
            </div>

            <!-- Bottom Navigation & Action Bar (Strictly 1-word buttons) -->
            <div class="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onclick="window.StudentUI.prevQuestion()"
                ${currentQuestionIdx === 0 ? 'disabled' : ''}
                class="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-extrabold text-sm transition cursor-pointer"
              >
                ◀ Back
              </button>

              <div class="flex items-center gap-2.5">
                ${
                  qState.status !== 'resolved' && qState.unlockedChoices
                    ? `
                    <button
                      type="button"
                      onclick="window.StudentUI.checkAnswer()"
                      ${!qState.selectedOptionId ? 'disabled' : ''}
                      class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold text-sm shadow-xs transition cursor-pointer"
                    >
                      ✓ Check
                    </button>
                  `
                    : ''
                }

                ${
                  currentQuestionIdx < questions.length - 1
                    ? `
                    <button
                      type="button"
                      onclick="window.StudentUI.nextQuestion()"
                      class="px-5 py-2.5 rounded-xl ${
                        qState.status === 'resolved'
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      } font-extrabold text-sm transition cursor-pointer"
                    >
                      Next ▶
                    </button>
                  `
                    : `
                    <button
                      type="button"
                      onclick="window.StudentUI.finishWorkout()"
                      class="px-6 py-2.5 rounded-xl ${
                        qState.status === 'resolved'
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      } font-extrabold text-sm transition cursor-pointer"
                    >
                      🏁 Finish
                    </button>
                  `
                }
              </div>
            </div>

          </div>
        </div>
      `;

      // If there is an active proof sentence to scroll to & pulse, scroll smoothly
      if (this.session.activeProofSentence) {
        setTimeout(() => {
          this.scrollToProofSentence();
        }, 60);
      } else if (this.session.activeHintParagraph) {
        setTimeout(() => {
          this.scrollToParagraph(this.session.activeHintParagraph);
        }, 60);
      }
    },

    /**
     * Render Interactive Sentence Surgery Bar for Monster Sentence
     */
    renderSentenceSurgeryBar(passage) {
      const ms = (passage && passage.monsterSentence) || null;
      if (!ms || !ms.verbatimSentence) return '';

      return `
        <div class="bg-violet-50/90 border-b border-violet-200 px-4 sm:px-6 py-3.5 space-y-2.5 font-sans">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-violet-700 text-white text-xs font-extrabold">
                ✂️ Surgery
              </span>
              <button
                type="button"
                onclick="window.StudentUI.setSurgeryFocus('who')"
                class="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-xs font-extrabold transition cursor-pointer"
              >
                🟢 WHO
              </button>
              <button
                type="button"
                onclick="window.StudentUI.setSurgeryFocus('action')"
                class="px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 text-xs font-extrabold transition cursor-pointer"
              >
                🔵 ACTION
              </button>
              <button
                type="button"
                onclick="window.StudentUI.setSurgeryFocus('what')"
                class="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-xs font-extrabold transition cursor-pointer"
              >
                🟣 WHAT
              </button>
              <button
                type="button"
                onclick="window.StudentUI.setSurgeryFocus('simple')"
                class="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-extrabold transition cursor-pointer"
              >
                ✨ Simple Way
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div class="p-2 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-950 ${this.activeSurgeryFocus === 'who' ? 'ring-2 ring-emerald-500' : ''}">
              <div class="font-extrabold text-[11px] uppercase tracking-wider text-emerald-800">🟢 WHO (Doer)</div>
              <div class="font-bold text-sm mt-0.5">${escapeHtml(sanitizeChildText(ms.actorChunk))}</div>
            </div>
            <div class="p-2 rounded-xl bg-blue-100/80 border border-blue-300 text-blue-950 ${this.activeSurgeryFocus === 'action' ? 'ring-2 ring-blue-500' : ''}">
              <div class="font-extrabold text-[11px] uppercase tracking-wider text-blue-800">🔵 ACTION</div>
              <div class="font-bold text-sm mt-0.5">${escapeHtml(sanitizeChildText(ms.actionChunk))}</div>
            </div>
            <div class="p-2 rounded-xl bg-purple-100/80 border border-purple-300 text-purple-950 ${this.activeSurgeryFocus === 'what' ? 'ring-2 ring-purple-500' : ''}">
              <div class="font-extrabold text-[11px] uppercase tracking-wider text-purple-800">🟣 WHAT (Receiver)</div>
              <div class="font-bold text-sm mt-0.5">${escapeHtml(sanitizeChildText(ms.receiverChunk))}</div>
            </div>
          </div>

          <div class="p-2.5 rounded-xl bg-white border border-violet-200 text-xs sm:text-sm text-slate-800 flex items-center gap-2">
            <span class="font-extrabold text-violet-700 shrink-0">✨ Simple Way:</span>
            <span class="font-bold text-slate-900">${escapeHtml(sanitizeChildText(ms.activeRewrite))}</span>
          </div>
        </div>
      `;
    },

    setSurgeryFocus(focusKey) {
      this.activeSurgeryFocus = focusKey;
      this.renderWorkspace();
    },

    /**
     * Render interactive Tier 2 Vocabulary Popover Card
     */
    renderVocabPopover(passage) {
      const words = (passage && passage.tier2Words) || [];
      const item = words[this.activeVocabIdx];
      if (!item) return '';

      return `
        <div class="bg-indigo-950 text-white px-5 py-3.5 border-b border-indigo-800 flex items-start justify-between gap-4 font-sans animate-fadeIn">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="badge px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[11px] font-extrabold">
                🔤 Word Clue
              </span>
              <span class="text-base font-extrabold text-amber-300">
                ${escapeHtml(item.word)}
              </span>
            </div>
            <p class="text-xs sm:text-sm text-indigo-100 font-medium">
              ${escapeHtml(sanitizeChildText(item.definition))}
            </p>
            ${
              item.rootHint
                ? `<p class="text-xs text-indigo-300 italic">🌱 Clue: ${escapeHtml(sanitizeChildText(item.rootHint))}</p>`
                : ''
            }
          </div>
          <button
            type="button"
            onclick="window.StudentUI.closeVocabPopover()"
            class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold shrink-0 cursor-pointer"
          >
            ✕ Close
          </button>
        </div>
      `;
    },

    closeVocabPopover() {
      this.activeVocabIdx = null;
      this.renderWorkspace();
    },

    /**
     * Render passage paragraphs with [1], [2], [3] badges, clickable sentences, and underlined Tier 2 words
     */
    renderPassageParagraphs(passage, showSurgeryBar) {
      if (!passage || !passage.text) return '';
      const rawParas = passage.text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      const tier2Words = Array.isArray(passage.tier2Words) ? passage.tier2Words : [];
      const monsterNorm =
        passage.monsterSentence && passage.monsterSentence.verbatimSentence
          ? normalizeWs(passage.monsterSentence.verbatimSentence)
          : '';
      const activeProofNorm = this.session.activeProofSentence
        ? normalizeWs(this.session.activeProofSentence)
        : '';

      return rawParas
        .map((paraText, pIdx) => {
          const paraNum = pIdx + 1;
          const cleanPara = paraText.replace(/^\[(?:Paragraph\s*)?\d+\]\s*/i, '');
          const sentences = splitIntoSentences(cleanPara);
          const isHintPara = this.session.activeHintParagraph === paraNum;

          const sentencesHtml = sentences
            .map((sentText, sIdx) => {
              const sentKey = `p${paraNum}_s${sIdx + 1}`;
              const normSent = normalizeWs(sentText);

              const isYellow = this.session.highlightedSentences.has(sentKey);
              const isProof =
                activeProofNorm &&
                (normSent.includes(activeProofNorm) || activeProofNorm.includes(normSent));
              const isMonster =
                showSurgeryBar &&
                monsterNorm &&
                (normSent.includes(monsterNorm) || monsterNorm.includes(normSent));

              const classes = [
                'passage-sentence',
                isYellow ? 'sentence-highlight-yellow' : '',
                isMonster ? 'sentence-monster-highlight' : '',
                isProof ? 'sentence-proof-pulse' : '',
              ]
                .filter(Boolean)
                .join(' ');

              const innerDecorated = this.decorateTier2Words(sentText, tier2Words);

              return `<span
                id="sent-${sentKey}"
                class="${classes}"
                data-para-num="${paraNum}"
                data-sent-key="${sentKey}"
                data-sentence-text="${escapeHtml(normSent)}"
                onclick="window.StudentUI.handleSentenceClick(${paraNum}, '${sentKey}', this, event)"
              >${innerDecorated}</span>`;
            })
            .join(' ');

          return `
            <p id="passage-para-${paraNum}" class="leading-relaxed ${isHintPara ? 'paragraph-hint-pulse' : ''}">
              <span class="drc-para-badge">[${paraNum}]</span>${sentencesHtml}
            </p>
          `;
        })
        .join('');
    },

    /**
     * Decorate Tier 2 vocabulary words inside a sentence with clickable spans
     */
    decorateTier2Words(sentenceText, tier2Words) {
      let safeHtml = escapeHtml(sentenceText);
      if (!tier2Words || tier2Words.length === 0) return safeHtml;

      tier2Words.forEach((item, idx) => {
        if (!item || !item.word) return;
        const wordEsc = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(${wordEsc})\\b`, 'i');
        safeHtml = safeHtml.replace(
          regex,
          `<span class="tier2-vocab-word" onclick="window.StudentUI.handleVocabClick(${idx}, event)" title="Tap for word meaning">$1</span>`
        );
      });

      return safeHtml;
    },

    handleVocabClick(vocabIdx, event) {
      if (event) event.stopPropagation();
      this.activeVocabIdx = vocabIdx;
      this.renderWorkspace();
    },

    /**
     * Handle clicking a sentence in the left passage pane:
     *  1. If current question is waiting on Click-to-Prove, unlocks choices & records if provingSentenceText matched!
     *  2. If Highlight tool is active, toggles yellow highlight on that sentence.
     */
    handleSentenceClick(paraNum, sentKey, el, event) {
      if (!this.session) return;
      const { workout, currentQuestionIdx, itemStates } = this.session;
      const q = (workout.questions || [])[currentQuestionIdx];
      const qState = itemStates[currentQuestionIdx];

      const clickedText = (el && el.getAttribute('data-sentence-text')) || '';

      // 1. Check Click-to-Prove mode
      if (qState && qState.clickToProveRequired && !qState.unlockedChoices && qState.status === 'unanswered') {
        const targetNorm = normalizeWs(q.provingSentenceText || '');
        const clickedNorm = normalizeWs(clickedText);
        const matchedExact = Boolean(
          targetNorm && (clickedNorm.includes(targetNorm) || targetNorm.includes(clickedNorm))
        );

        qState.unlockedChoices = true;
        qState.clickToProveSuccess = matchedExact;
        qState.clickedSentenceText = clickedNorm;
        this.session.highlightedSentences.add(sentKey);
        this.renderWorkspace();
        return;
      }

      // 2. Check Yellow Highlighter mode
      if (this.tools.highlight) {
        if (this.session.highlightedSentences.has(sentKey)) {
          this.session.highlightedSentences.delete(sentKey);
        } else {
          this.session.highlightedSentences.add(sentKey);
        }
        this.renderWorkspace();
      }
    },

    /**
     * Render progress dot (1 to 6)
     * Green = 1st-try correct, Amber = 2nd-try correct, Blue = active, Gray = upcoming
     */
    renderProgressDot(st, idx, currentIdx) {
      const isCurrent = idx === currentIdx;
      let colorClasses = 'bg-slate-200 text-slate-600 border-slate-300';

      if (st.status === 'resolved') {
        if (st.firstTryCorrect) {
          colorClasses = 'bg-emerald-500 text-white border-emerald-600';
        } else {
          colorClasses = 'bg-amber-400 text-slate-950 border-amber-500';
        }
      } else if (st.status === 'retry_pending') {
        colorClasses = 'bg-amber-300 text-slate-950 border-amber-500';
      } else if (isCurrent) {
        colorClasses = 'bg-blue-600 text-white border-blue-700';
      }

      const ringClass = isCurrent ? 'ring-2 ring-offset-1 ring-blue-500 scale-105' : ' opacity-90 hover:opacity-100';

      return `
        <button
          type="button"
          onclick="window.StudentUI.goToQuestion(${idx})"
          class="w-8 h-8 rounded-full border font-extrabold text-xs flex items-center justify-center transition cursor-pointer ${colorClasses} ${ringClass}"
        >
          ${idx + 1}
        </button>
      `;
    },

    /**
     * Render EBSR Part A -> Part B Bridge on Question 6
     */
    renderEbsrBridgeIfApplicable(q, currentIdx) {
      if (!this.session) return '';
      if (q.itemType !== 'EBSR_PART_B' && currentIdx !== 5) return '';

      const questions = this.session.workout.questions || [];
      const q5 = questions[4];
      const q5State = this.session.itemStates[4];
      if (!q5 || !q5State) return '';

      const chosenId = q5State.finalChoice || q5State.selectedOptionId || q5State.firstChoice;
      const chosenOpt = (q5.options || []).find((o) => o.id === chosenId);

      return `
        <div class="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-1">
          <div class="flex items-center gap-1.5">
            <span class="badge px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-extrabold">
              📌 Part A
            </span>
          </div>
          <p class="text-xs sm:text-sm font-bold text-emerald-950">
            ${
              chosenOpt
                ? `Your Q5 Answer: "${escapeHtml(sanitizeChildText(chosenOpt.text))}"`
                : 'Your Q5 Answer: Pick your answer in Question 5 first!'
            }
          </p>
        </div>
      `;
    },

    /**
     * Render Active Text Verification ("Click-to-Prove") Prompt before options unlock
     */
    renderClickToProvePrompt(q) {
      const targetPara = q.provingParagraph || 1;
      return `
        <div class="rounded-2xl bg-amber-50 border-2 border-dashed border-amber-300 p-5 text-center space-y-3">
          <div class="text-3xl">👆</div>
          <p class="text-sm sm:text-base font-extrabold text-amber-950">
            👆 Tap the proving sentence in Paragraph ${targetPara}!
          </p>
          <p class="text-xs text-amber-800 font-medium">
            Click the sentence in the story on the left to unlock the choices.
          </p>
          <div class="pt-1">
            <button
              type="button"
              onclick="window.StudentUI.unlockChoicesFallback()"
              class="px-4 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold transition cursor-pointer"
            >
              Show Choices
            </button>
          </div>
        </div>
      `;
    },

    unlockChoicesFallback() {
      if (!this.session) return;
      const qState = this.session.itemStates[this.session.currentQuestionIdx];
      if (qState) {
        qState.unlockedChoices = true;
        qState.clickToProveSuccess = false;
        this.renderWorkspace();
      }
    },

    /**
     * Render Option Cards (A, B, C, D) with 1-click [✕] eliminator button
     */
    renderOptionCards(q, qState) {
      const options = Array.isArray(q.options) ? q.options : [];
      const isResolved = qState.status === 'resolved';

      const clickToProveBanner =
        qState.clickToProveRequired && qState.clickToProveSuccess !== null
          ? `
          <div class="rounded-xl px-3.5 py-2 text-xs font-bold flex items-center gap-2 ${
            qState.clickToProveSuccess
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
          }">
            <span>${qState.clickToProveSuccess ? '🌟 You tapped the exact proof sentence!' : '🔓 Choices unlocked! Check Paragraph ' + (q.provingParagraph || 1) + ' closely.'}</span>
          </div>
        `
          : '';

      const cardsHtml = options
        .map((opt) => {
          const optId = opt.id || opt.letter || 'A';
          const isEliminated = qState.eliminated.has(optId);
          const isSelected = qState.selectedOptionId === optId;
          const isFirstWrong = qState.attempts >= 1 && qState.firstChoice === optId && !qState.firstTryCorrect;

          let cardStyle = 'border-slate-200 bg-white hover:border-indigo-300';
          let letterBadgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

          if (isResolved) {
            if (opt.isCorrect) {
              cardStyle = 'border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-500/20';
              letterBadgeStyle = 'bg-emerald-600 text-white border-emerald-600';
            } else if (isSelected || isFirstWrong) {
              cardStyle = 'border-rose-300 bg-rose-50/50 opacity-75';
              letterBadgeStyle = 'bg-rose-100 text-rose-700 border-rose-200';
            } else {
              cardStyle = 'border-slate-200 bg-slate-50/60 opacity-60';
            }
          } else if (isFirstWrong) {
            cardStyle = 'border-amber-300 bg-amber-50/40 drc-option-eliminated pointer-events-none';
            letterBadgeStyle = 'bg-amber-200 text-amber-900 border-amber-300';
          } else if (isSelected) {
            cardStyle = 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20';
            letterBadgeStyle = 'bg-indigo-600 text-white border-indigo-600';
          }

          return `
            <div
              onclick="window.StudentUI.selectOption('${escapeHtml(optId)}')"
              class="drc-option-card rounded-2xl border-2 p-3.5 sm:p-4 flex items-start justify-between gap-3 cursor-pointer ${cardStyle} ${
                isEliminated && !isResolved ? 'drc-option-eliminated' : ''
              }"
            >
              <div class="flex items-start gap-3 flex-1">
                <span class="w-7 h-7 rounded-lg border font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 ${letterBadgeStyle}">
                  ${escapeHtml(optId)}
                </span>
                <span class="drc-option-text text-sm sm:text-base font-medium text-slate-800 leading-snug">
                  ${escapeHtml(sanitizeChildText(opt.text))}
                </span>
              </div>

              ${
                !isResolved && !isFirstWrong
                  ? `
                  <button
                    type="button"
                    onclick="window.StudentUI.toggleEliminateOption('${escapeHtml(optId)}', event)"
                    title="Cross out choice"
                    class="opt-eliminator-btn w-7 h-7 rounded-lg border ${
                      isEliminated
                        ? 'bg-rose-100 text-rose-700 border-rose-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                    } text-xs font-extrabold flex items-center justify-center shrink-0 transition cursor-pointer"
                  >
                    ✕
                  </button>
                `
                  : ''
              }
            </div>
          `;
        })
        .join('');

      return `
        <div class="space-y-2.5">
          ${clickToProveBanner}
          ${cardsHtml}
        </div>
      `;
    },

    /**
     * Render 2-Attempt Micro-Feedback Card
     */
    renderMicroFeedbackCard(q, qState) {
      if (!qState || qState.status === 'unanswered') return '';

      const paraNum = q.provingParagraph || 1;

      if (qState.status === 'retry_pending') {
        return `
          <div class="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 space-y-1.5 animate-fadeIn">
            <div class="flex items-center gap-2">
              <span class="badge px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold">
                🟡 Try Again!
              </span>
            </div>
            <p class="text-sm font-extrabold text-amber-950">
              🟡 Try One More Time! Look closely at Paragraph ${paraNum}!
            </p>
          </div>
        `;
      }

      if (qState.status === 'resolved') {
        const isCorrect = qState.finalCorrect;
        const headerBadge = isCorrect ? '🟢 Nice Job!' : '💡 Key Clue';
        const boxClasses = isCorrect
          ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-950'
          : 'bg-indigo-50 border-2 border-indigo-300 text-indigo-950';
        const pillClasses = isCorrect
          ? 'bg-emerald-600 text-white'
          : 'bg-indigo-600 text-white';

        return `
          <div class="rounded-2xl ${boxClasses} p-4 space-y-1.5 animate-fadeIn">
            <div class="flex items-center justify-between gap-2">
              <span class="badge px-2.5 py-0.5 rounded-full ${pillClasses} text-xs font-extrabold">
                ${headerBadge}
              </span>
              <span class="text-xs font-bold opacity-80">
                Paragraph ${paraNum}
              </span>
            </div>
            <p class="text-sm font-bold leading-snug">
              ${escapeHtml(sanitizeChildText(q.childTip || 'Great reading! Check the highlighted sentence in the passage.'))}
            </p>
          </div>
        `;
      }

      return '';
    },

    selectOption(optId) {
      if (!this.session) return;
      const qState = this.session.itemStates[this.session.currentQuestionIdx];
      if (!qState || qState.status === 'resolved' || !qState.unlockedChoices) return;

      // Prevent re-selecting first wrong choice on retry
      if (qState.status === 'retry_pending' && qState.firstChoice === optId) return;

      // If option was eliminated, un-eliminate it on direct click
      if (qState.eliminated.has(optId)) {
        qState.eliminated.delete(optId);
      }

      qState.selectedOptionId = optId;
      this.renderWorkspace();
    },

    toggleEliminateOption(optId, event) {
      if (event) event.stopPropagation();
      if (!this.session) return;
      const qState = this.session.itemStates[this.session.currentQuestionIdx];
      if (!qState || qState.status === 'resolved') return;

      if (qState.eliminated.has(optId)) {
        qState.eliminated.delete(optId);
      } else {
        qState.eliminated.add(optId);
        if (qState.selectedOptionId === optId) {
          qState.selectedOptionId = null;
        }
      }
      this.renderWorkspace();
    },

    /**
     * Check Answer (2-Attempt Micro-Feedback Loop)
     */
    checkAnswer() {
      if (!this.session) return;
      this.recordActiveQuestionTime();

      const { workout, currentQuestionIdx, itemStates } = this.session;
      const q = (workout.questions || [])[currentQuestionIdx];
      const qState = itemStates[currentQuestionIdx];
      if (!q || !qState || !qState.selectedOptionId || qState.status === 'resolved') return;

      const chosenId = qState.selectedOptionId;
      const chosenOpt = (q.options || []).find((o) => (o.id || o.letter) === chosenId);
      const isCorrect = Boolean(chosenOpt && chosenOpt.isCorrect);

      if (qState.attempts === 0) {
        qState.attempts = 1;
        qState.firstChoice = chosenId;
        qState.firstTryCorrect = isCorrect;

        if (isCorrect) {
          qState.finalChoice = chosenId;
          qState.finalCorrect = true;
          qState.status = 'resolved';
          this.session.activeHintParagraph = null;
          this.session.activeProofSentence = q.provingSentenceText || null;
        } else {
          qState.firstTryTrap = (chosenOpt && chosenOpt.trapType) || 'TRAP_WORD_MATCH';
          qState.eliminated.add(chosenId);
          qState.selectedOptionId = null;
          qState.status = 'retry_pending';
          this.session.activeProofSentence = null;
          this.session.activeHintParagraph = q.provingParagraph || 1;
        }
      } else {
        // 2nd Attempt
        qState.attempts = 2;
        qState.finalChoice = chosenId;
        qState.finalCorrect = isCorrect;
        qState.status = 'resolved';
        this.session.activeHintParagraph = null;
        this.session.activeProofSentence = q.provingSentenceText || null;
      }

      this.renderWorkspace();
    },

    /**
     * Automatically scroll left passage pane to the proving sentence
     */
    scrollToProofSentence() {
      const container = document.getElementById('drc-passage-container');
      if (!container || typeof container.querySelector !== 'function') return;
      const pulseEl = container.querySelector('.sentence-proof-pulse');
      if (pulseEl && typeof pulseEl.scrollIntoView === 'function') {
        pulseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },

    scrollToParagraph(paraNum) {
      const paraEl = document.getElementById(`passage-para-${paraNum}`);
      if (paraEl && typeof paraEl.scrollIntoView === 'function') {
        paraEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },

    goToQuestion(idx) {
      if (!this.session) return;
      const questions = this.session.workout.questions || [];
      if (idx < 0 || idx >= questions.length) return;
      this.recordActiveQuestionTime();
      this.session.currentQuestionIdx = idx;

      const q = questions[idx];
      const qState = this.session.itemStates[idx];
      this.session.activeProofSentence = qState.status === 'resolved' ? q.provingSentenceText : null;
      this.session.activeHintParagraph = qState.status === 'retry_pending' ? q.provingParagraph : null;
      this.renderWorkspace();
    },

    nextQuestion() {
      if (!this.session) return;
      this.goToQuestion(this.session.currentQuestionIdx + 1);
    },

    prevQuestion() {
      if (!this.session) return;
      this.goToQuestion(this.session.currentQuestionIdx - 1);
    },

    toggleTool(toolName) {
      if (!Object.prototype.hasOwnProperty.call(this.tools, toolName)) return;
      this.tools[toolName] = !this.tools[toolName];
      this.renderWorkspace();
    },

    changeFontSize(delta) {
      const nextIdx = Math.min(this.fontSizes.length - 1, Math.max(0, this.fontSizeIdx + delta));
      if (nextIdx !== this.fontSizeIdx) {
        this.fontSizeIdx = nextIdx;
        this.renderWorkspace();
      }
    },

    handleLineGuideMove(event) {
      if (!this.tools.lineGuide) return;
      const container = document.getElementById('drc-passage-container');
      const bar = document.getElementById('drc-line-guide');
      if (!container || !bar) return;
      const rect = container.getBoundingClientRect();
      const relY = event.clientY - rect.top + container.scrollTop - 19;
      this.lineGuideY = Math.max(10, relY);
      bar.style.top = `${this.lineGuideY}px`;
    },

    /**
     * Finish the workout, build the telemetry trial payload, call V2Engine.recordCompletedTrial(),
     * and show Screen 3 (Celebration Card)
     */
    finishWorkout() {
      if (!this.session || this.session.isSubmitting) return;
      this.session.isSubmitting = true;
      this.recordActiveQuestionTime();

      const { workout, itemStates, startedAtMs } = this.session;
      const questions = workout.questions || [];

      // Auto-resolve any unanswered items if student clicked Finish early
      itemStates.forEach((st, idx) => {
        const q = questions[idx] || {};
        const opts = q.options || [];
        if (st.status !== 'resolved') {
          const pickedId = st.selectedOptionId || st.firstChoice || (opts[0] && opts[0].id) || 'A';
          const pickedOpt = opts.find((o) => (o.id || o.letter) === pickedId);
          const isCorr = Boolean(pickedOpt && pickedOpt.isCorrect);
          if (!st.firstChoice) {
            st.firstChoice = pickedId;
            st.firstTryCorrect = isCorr;
            if (!isCorr) {
              st.firstTryTrap = (pickedOpt && pickedOpt.trapType) || 'TRAP_WORD_MATCH';
            }
          }
          st.finalChoice = pickedId;
          st.finalCorrect = isCorr;
          st.status = 'resolved';
        }
      });

      const totalQuestions = questions.length || 6;
      const firstTryCorrectCount = itemStates.filter((s) => s.firstTryCorrect).length;
      const finalCorrectCount = itemStates.filter((s) => s.finalCorrect).length;
      const totalDurationSeconds = Math.max(
        6,
        Math.round(itemStates.reduce((acc, s) => acc + (s.timeSpentSeconds || 12), 0) * 10) / 10 ||
          Math.round((Date.now() - startedAtMs) / 1000)
      );

      const impulsiveCount = itemStates.filter((s) => s.timeSpentSeconds > 0 && s.timeSpentSeconds < 8).length;
      const hesitationCount = itemStates.filter((s) => s.timeSpentSeconds > 90).length;

      // EBSR Part A (index 4) + Part B (index 5) link telemetry
      const partAState = itemStates[4];
      const partBState = itemStates[5];
      const partACorr = Boolean(partAState && partAState.firstTryCorrect);
      const partBCorr = Boolean(partBState && partBState.firstTryCorrect);
      const ebsrBothCorrect = partACorr && partBCorr ? 1 : 0;
      const ebsrPartAOnly = partACorr && !partBCorr ? 1 : 0;
      const ebsrPartBOnly = !partACorr && partBCorr ? 1 : 0;
      const ebsrBothWrong = !partACorr && !partBCorr ? 1 : 0;

      const trapsTriggered = itemStates
        .map((s) => s.firstTryTrap)
        .filter(Boolean);

      const studentId = (window.V2State && window.V2State.progress && window.V2State.progress.studentId) || 'lucas';

      const itemsPayload = questions.map((q, idx) => {
        const st = itemStates[idx];
        const correctOpt = (q.options || []).find((o) => o.isCorrect) || { id: 'A', text: '' };
        return {
          questionId: q.questionId || `q${idx + 1}`,
          itemId: q.questionId || `q${idx + 1}`,
          questionNumber: idx + 1,
          questionIndex: idx,
          itemType: q.itemType || 'STANDARD',
          domain: q.domain || workout.focusDomain || 'D1_KEY_IDEAS',
          skillCategory: q.domain || workout.focusDomain || 'D1_KEY_IDEAS',
          subSkill: q.subSkill || '',
          standard: q.standard || workout.focusStandard || 'ELAGSE5RL1',
          standardCode: q.standard || workout.focusStandard || 'ELAGSE5RL1',
          dok: q.dok || 2,
          dokLevel: q.dok || 2,
          prompt: q.prompt || '',
          stem: q.prompt || '',
          selectedOptionId: st.firstChoice,
          firstTryChoice: st.firstChoice,
          firstTrySelectedLetter: st.firstChoice,
          retrySelectedOptionId: st.finalChoice,
          finalChoice: st.finalChoice,
          retrySelectedLetter: st.finalChoice,
          correctOptionId: correctOpt.id || 'A',
          correctChoice: correctOpt.id || 'A',
          correctLetter: correctOpt.id || 'A',
          correctText: correctOpt.text || '',
          isCorrect: Boolean(st.firstTryCorrect),
          firstTryCorrect: Boolean(st.firstTryCorrect),
          finalCorrect: Boolean(st.finalCorrect),
          retryCorrect: Boolean(st.finalCorrect),
          attemptsUsed: st.attempts || 1,
          trapType: st.firstTryTrap || null,
          trapTriggered: st.firstTryTrap || null,
          distractorTrapSelected: st.firstTryTrap || null,
          timeSpentSeconds: st.timeSpentSeconds || 15,
          impulsiveFlag: st.timeSpentSeconds > 0 && st.timeSpentSeconds < 8,
          impulsivityFlag: st.timeSpentSeconds > 0 && st.timeSpentSeconds < 8,
          hesitationFlag: st.timeSpentSeconds > 90,
          requireClickToProve: Boolean(q.requireClickToProve),
          clickToProveSuccess: st.clickToProveSuccess,
          verifiedSentenceClicked: Boolean(st.clickToProveSuccess),
          provingParagraph: q.provingParagraph || 1,
          provingSentenceText: q.provingSentenceText || '',
          childTip: q.childTip || '',
          parentExplanation: q.parentExplanation || '',
          eliminatedOptions: Array.from(st.eliminated || []),
        };
      });

      const fixedTrialId = this.session.sessionId || `trial_${startedAtMs}_${studentId}`;
      const completedIso = new Date().toISOString();

      const trialPayload = {
        trialId: fixedTrialId,
        sessionId: fixedTrialId,
        studentId: studentId,
        subject: workout.isMath ? 'math' : 'reading',
        workoutId: workout.workoutId,
        workoutNumber: workout.workoutNumber || 1,
        title: workout.title,
        workoutTitle: workout.title,
        tier: workout.tier !== undefined ? workout.tier : 1,
        genre: workout.genre || 'Literary',
        subGenre: workout.subGenre || '',
        targetLexile: workout.targetLexile || 960,
        lexileBand: workout.lexileBand || '940L-980L',
        fkgl: workout.fkgl || 6.2,
        focusDomain: workout.focusDomain || 'D1_KEY_IDEAS',
        focusStandard: workout.focusStandard || 'ELAGSE5RL1',
        timestampISO: completedIso,
        completedAt: completedIso,
        questionsAttempted: totalQuestions,
        totalQuestions: totalQuestions,
        firstTryCorrectCount: firstTryCorrectCount,
        firstTryScore: firstTryCorrectCount,
        firstTryAccuracyPct: Math.round((firstTryCorrectCount / totalQuestions) * 100),
        finalCorrectCount: finalCorrectCount,
        retryCorrectCount: finalCorrectCount,
        finalScore: finalCorrectCount,
        finalAccuracyPct: Math.round((finalCorrectCount / totalQuestions) * 100),
        retryAccuracyPct: Math.round((finalCorrectCount / totalQuestions) * 100),
        totalDurationSeconds: totalDurationSeconds,
        timeSpentSeconds: totalDurationSeconds,
        avgSecondsPerItem: Math.round((totalDurationSeconds / totalQuestions) * 10) / 10,
        impulsivityFlagsCount: impulsiveCount,
        impulsiveCount: impulsiveCount,
        hesitationFlagsCount: hesitationCount,
        hesitationCount: hesitationCount,
        ebsrBothCorrect: ebsrBothCorrect,
        ebsrPartAOnly: ebsrPartAOnly,
        ebsrPartBOnly: ebsrPartBOnly,
        ebsrBothWrong: ebsrBothWrong,
        trapsTriggered: trapsTriggered,
        sentenceSurgeryCompleted: Boolean(this.tools.surgery || (questions[0] && questions[0].itemType === 'SENTENCE_SURGERY')),
        itemAttempts: itemsPayload,
        items: itemsPayload,
      };

      this.lastTrialResult = trialPayload;
      this.renderCelebration(trialPayload);

      if (window.V2Engine && typeof window.V2Engine.recordCompletedTrial === 'function') {
        Promise.resolve(window.V2Engine.recordCompletedTrial(trialPayload)).finally(() => {
          if (this.currentScreen === 'celebration') {
            this.renderCelebration(trialPayload);
          }
        });
      }
    },

    /**
     * SCREEN 3 — Celebration Card
     */
    renderCelebration(trial) {
      this.currentScreen = 'celebration';
      this.refreshHeader();

      const root = document.getElementById('student-root');
      if (!root) return;

      const t = trial || this.lastTrialResult || {};
      const firstTry = typeof t.firstTryCorrectCount === 'number' ? t.firstTryCorrectCount : 5;
      const total = t.totalQuestions || 6;
      const pct = total > 0 ? firstTry / total : 0.85;
      const stars = pct >= 0.8 ? 3 : pct >= 0.5 ? 2 : 1;
      const starsVisual = '⭐'.repeat(stars) + '⚪'.repeat(Math.max(0, 3 - stars));
      const streakDays =
        (window.V2State && window.V2State.progress && (window.V2State.progress.streakDays || window.V2State.progress.streak)) || 5;

      root.innerHTML = `
        <div class="max-w-xl mx-auto my-8 bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 text-center shadow-xl space-y-6">
          <div class="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs sm:text-sm badge">
            🎉 Quest Complete
          </div>

          <div class="text-5xl sm:text-6xl tracking-widest py-2">
            ${starsVisual}
          </div>

          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">
            ${escapeHtml(sanitizeChildText(t.title || 'Awesome Reading!'))}
          </h2>

          <div class="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-2">
            <div class="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <div class="text-3xl font-extrabold text-emerald-700">${firstTry}/${total}</div>
              <div class="text-xs font-extrabold text-emerald-900 mt-1 badge">⭐ First Try</div>
            </div>
            <div class="rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <div class="text-3xl font-extrabold text-amber-700">🔥 ${streakDays}</div>
              <div class="text-xs font-extrabold text-amber-900 mt-1 badge">🔥 Day Streak</div>
            </div>
          </div>

          <div class="flex items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onclick="window.StudentUI.exitToHome()"
              class="px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base shadow-md transition cursor-pointer"
            >
              🏠 Home
            </button>
            <button
              type="button"
              onclick="window.StudentUI.startWorkout('${escapeHtml(t.workoutId || '')}')"
              class="px-7 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-extrabold text-base transition cursor-pointer"
            >
              🔄 Replay
            </button>
          </div>
        </div>
      `;
    },

    exitToHome() {
      this.session = null;
      this.activeVocabIdx = null;
      this.renderLaunchpad();
    },
  };

  window.addEventListener('v2:ready', () => {
    StudentUI.renderLaunchpad();
  });

  window.addEventListener('v2:stateUpdated', () => {
    StudentUI.refreshHeader();
    if (StudentUI.currentScreen === 'launchpad') {
      StudentUI.renderLaunchpad();
    }
  });

  window.StudentUI = StudentUI;
})();
