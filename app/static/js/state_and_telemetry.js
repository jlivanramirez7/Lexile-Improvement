/**
 * V2 Client State, Psychometric Telemetry, & Adaptive Curriculum Engine
 * DRC BEACON Reading Improvement Platform (5th Grade -> Dickerson MS 1075L+ AC Track)
 *
 * Exposes:
 *   - window.V2State
 *   - window.V2Engine
 *   - window.recalculateMetricsFromTrials
 */
(function () {
  "use strict";

  const OFFICIAL_BEACON_HISTORY = [
    {
      date: "2025-03-19",
      displayDate: "03/19/2025",
      grade: 3,
      window: "Spring G3",
      lexile: 835,
      quantile: 500,
      bookRange: "750L-870L"
    },
    {
      date: "2025-09-04",
      displayDate: "09/04/2025",
      grade: 4,
      window: "Fall G4",
      lexile: 840,
      quantile: 515,
      bookRange: "760L-880L"
    },
    {
      date: "2025-12-17",
      displayDate: "12/17/2025",
      grade: 4,
      window: "Winter G4",
      lexile: 830,
      quantile: 760,
      bookRange: "750L-860L"
    },
    {
      date: "2026-03-18",
      displayDate: "03/18/2026",
      grade: 4,
      window: "Spring G4",
      lexile: 800,
      quantile: 700,
      bookRange: "710L-830L"
    },
    {
      date: "2026-09-01",
      displayDate: "09/01/2026",
      grade: 5,
      window: "Fall G5",
      lexile: 940,
      quantile: null,
      bookRange: "850L-990L"
    }
  ];

  const DEFAULT_CURRICULUM = {
    studentProfile: {
      studentId: "lucas",
      studentName: "Lucas Ramirez",
      school: "Nickajack Elementary",
      district: "Cobb County School District",
      targetMiddleSchool: "Dickerson Middle School",
      currentGrade: 5,
      currentOfficialLexile: 940,
      currentOfficialQuantile: 700,
      targetACLexile: 1075,
      targetStretchLexile: 1150,
      targetACQuantile: 950,
      officialBeaconHistory: OFFICIAL_BEACON_HISTORY
    },
    tiers: [
      {
        tier: 0,
        name: "Foundation Scaffold",
        lexileBand: "850L-920L",
        fkglBand: "5.2-6.0",
        description: "Targeted confidence & concept reinforcement when a domain score drops below 60%."
      },
      {
        tier: 1,
        name: "Fall 5th Consolidation",
        lexileBand: "940L-980L",
        fkglBand: "5.8-6.6",
        description: "Locks in Lucas's 940L Fall 5th-grade baseline across 350-500 word Literary & Informational texts."
      },
      {
        tier: 2,
        name: "Upper 5th Stretch Bridge",
        lexileBand: "980L-1030L",
        fkglBand: "6.2-7.0",
        description: "Crosses the 1000L threshold with denser Tier 2 vocabulary and multi-clause sentences."
      },
      {
        tier: 3,
        name: "Dickerson AC Qualification Gate",
        lexileBand: "1030L-1085L",
        fkglBand: "6.5-7.4",
        description: "Builds mastery at and above Cobb County's 1075L 6th Grade Advanced Content cutoff."
      },
      {
        tier: 4,
        name: "Advanced Mastery Buffer",
        lexileBand: "1085L-1150L",
        fkglBand: "6.8-7.8",
        description: "6th/7th-grade analytical rigor so a 1075L+ Spring BEACON score is achieved with safety margin."
      }
    ],
    domains: [
      {
        id: "D1_KEY_IDEAS",
        shortName: "Key Ideas & Inference",
        parentLabel: "Key Ideas, Summary & Implicit Inference",
        weight: 1.25,
        standards: ["ELAGSE5RL1", "ELAGSE5RL2", "ELAGSE5RL3", "ELAGSE5RI1", "ELAGSE5RI2", "ELAGSE5RI3"],
        subSkills: [
          { id: "1A_CENTRAL_IDEA", name: "Theme & Central Idea" },
          { id: "1B_SUMMARY", name: "Objective Summary vs. Minor Detail" },
          { id: "1C_INFERENCE", name: "Implicit Character & Event Inference" }
        ]
      },
      {
        id: "D2_CRAFT_STRUCTURE",
        shortName: "Vocab & Text Structure",
        parentLabel: "Tier 2 Vocabulary, Morphology & Text Structure",
        weight: 1.30,
        standards: ["ELAGSE5RL4", "ELAGSE5RL5", "ELAGSE5RL6", "ELAGSE5RI4", "ELAGSE5RI5", "ELAGSE5RI6", "ELAGSE5L4"],
        subSkills: [
          { id: "2A_TIER2_VOCAB", name: "Contextual Academic Vocab & Roots" },
          { id: "2B_FIGURATIVE", name: "Figurative Language & Tone" },
          { id: "2C_TEXT_STRUCTURE", name: "Chronology, Cause/Effect & Problem/Solution" },
          { id: "2D_POV_PURPOSE", name: "Point of View & Author Purpose" }
        ]
      },
      {
        id: "D3_INTEGRATION",
        shortName: "Claims & Synthesis",
        parentLabel: "Author's Claims, Reasons & Cross-Paragraph Synthesis",
        weight: 1.15,
        standards: ["ELAGSE5RL7", "ELAGSE5RL9", "ELAGSE5RI7", "ELAGSE5RI8", "ELAGSE5RI9"],
        subSkills: [
          { id: "3A_AUTHOR_CLAIM", name: "Evaluating Author's Claims & Reasons" },
          { id: "3B_SYNTHESIS", name: "Multi-Paragraph & Cause-Chain Synthesis" }
        ]
      },
      {
        id: "D4_SYNTAX",
        shortName: "Sentence Surgery",
        parentLabel: "Syntactic Decoding (Monster Sentences & Passive Voice)",
        weight: 1.35,
        standards: ["ELAGSE5L1", "ELAGSE5L3"],
        subSkills: [
          { id: "4A_PASSIVE_ACTOR", name: "Passive Voice Subject/Actor Tracking" },
          { id: "4B_NESTED_CLAUSE", name: "Nested Clauses & Appositive Stripping" },
          { id: "4C_PRONOUN_REF", name: "Distal Pronoun & Referent Tracking" }
        ]
      },
      {
        id: "D5_EBSR",
        shortName: "Paired Proof (EBSR)",
        parentLabel: "Evidence-Based Selected Response (Part A + Part B Proof)",
        weight: 1.40,
        standards: ["ELAGSE5RL1", "ELAGSE5RI1"],
        subSkills: [
          { id: "5A_JOINT_PROOF", name: "Linking Part A Claim to Part B Verbatim Quote" },
          { id: "5B_PROOF_DISCRIMINATION", name: "Defeating Right-Quote / Wrong-Claim Traps" }
        ]
      }
    ],
    trapArchetypes: {
      TRAP_WORD_MATCH: {
        code: "TRAP_WORD_MATCH",
        kidName: "Copy-Paste Trap",
        parentName: "Verbatim Word-Match Illusion",
        remediation: "Repeats exact words from the passage, but flips who did the action or changes the meaning."
      },
      TRAP_TOO_NARROW: {
        code: "TRAP_TOO_NARROW",
        kidName: "Tiny Detail Trap",
        parentName: "True Detail / Too Narrow for Main Idea",
        remediation: "States a fact from one sentence that does not cover the whole passage or paragraph."
      },
      TRAP_EXTREME: {
        code: "TRAP_EXTREME",
        kidName: "Danger Word Trap",
        parentName: "Extreme / Absolute Qualifier Trap",
        remediation: "Uses extreme words like 'always', 'never', 'completely', or 'only' that go beyond the text."
      },
      TRAP_OUTSIDE_INFO: {
        code: "TRAP_OUTSIDE_INFO",
        kidName: "Outside Fact Trap",
        parentName: "Unsupported Outside-Knowledge Inference",
        remediation: "Sounds smart in real life, but there is zero sentence in the passage that proves it."
      },
      TRAP_SYNTACTIC_REVERSAL: {
        code: "TRAP_SYNTACTIC_REVERSAL",
        kidName: "Flipped Action Trap",
        parentName: "Syntactic / Causal Reversal",
        remediation: "Confuses the cause and effect or swaps the subject and receiver in a long sentence."
      }
    }
  };

  const DOMAIN_BASELINE_PRIORS = {
    D1_KEY_IDEAS: 78,
    D2_CRAFT_STRUCTURE: 72,
    D3_INTEGRATION: 68,
    D4_SYNTAX: 62,
    D5_EBSR: 64
  };

  const DOMAIN_DEFAULT_TRAP = {
    D1_KEY_IDEAS: "TRAP_TOO_NARROW",
    D2_CRAFT_STRUCTURE: "TRAP_WORD_MATCH",
    D3_INTEGRATION: "TRAP_OUTSIDE_INFO",
    D4_SYNTAX: "TRAP_SYNTACTIC_REVERSAL",
    D5_EBSR: "TRAP_WORD_MATCH"
  };

  const LEGACY_TRAP_MAP = {
    passive_subject_confusion: "TRAP_SYNTACTIC_REVERSAL",
    outside_knowledge: "TRAP_OUTSIDE_INFO",
    unsupported_inference: "TRAP_OUTSIDE_INFO",
    verbatim_word_trap: "TRAP_WORD_MATCH",
    vocabulary_misinterpretation: "TRAP_WORD_MATCH",
    vocabulary_context_slip: "TRAP_WORD_MATCH",
    too_narrow_detail: "TRAP_TOO_NARROW",
    extreme_qualifier: "TRAP_EXTREME"
  };

  function getStorageKey(studentId) {
    const cleanId = String(studentId || "lucas").toLowerCase().replace(/\s+/g, "_");
    return `beacon_v2_progress_${cleanId}`;
  }

  function computeDomainStatus(masteryPct) {
    if (masteryPct >= 85) return "MASTERED";
    if (masteryPct >= 65) return "DEVELOPING";
    return "NEEDS_PRACTICE";
  }

  function normalizeTrapCode(rawTrap) {
    if (!rawTrap) return null;
    if (DEFAULT_CURRICULUM.trapArchetypes[rawTrap]) return rawTrap;
    return LEGACY_TRAP_MAP[rawTrap] || rawTrap;
  }

  function createFallbackWorkout() {
    return {
      workoutId: "w01_tier1_info_fallback",
      workoutNumber: 1,
      title: "Signals Across the Red Planet",
      tier: 1,
      lexileBand: "940L-980L",
      targetLexile: 960,
      fkgl: 6.3,
      genre: "Informational",
      subGenre: "Space & Engineering",
      focusDomain: "D4_SYNTAX",
      focusStandard: "ELAGSE5L1",
      estimatedMinutes: 8,
      passage: {
        title: "Signals Across the Red Planet",
        text: "Deep inside Jezero Crater on Mars, the Perseverance rover travels across the dry rocky floor. Every afternoon, the robot must send science files back to Earth through orbiting satellites. However, giant dust storms often block radio beams and cause sudden delays.\n\nTo prevent signal loss, mission engineers build smart tools that pack each data file before it leaves the red planet. The data packets, filled with soil tests and battery records, were carefully scrutinized by flight controllers to spot any sudden heat spikes.\n\nWhen a storm grows too thick, the rover stores its camera photos inside a shielded memory bank. Once the sky clears above the crater rim, high-speed antennas transmit the saved images to receivers in California.\n\nBecause every command takes fourteen minutes to cross space, the rover cannot wait for human drivers when it approaches a steep cliff. Instead, onboard navigation software studies shadow patterns and steers the six aluminum wheels around dangerous boulders automatically.",
        wordCount: 162,
        paragraphCount: 4,
        monsterSentence: {
          verbatimSentence: "The data packets, filled with soil tests and battery records, were carefully scrutinized by flight controllers to spot any sudden heat spikes.",
          actorChunk: "flight controllers",
          actionChunk: "carefully scrutinized",
          receiverChunk: "The data packets",
          activeRewrite: "Flight controllers carefully scrutinized the data packets to spot any sudden heat spikes."
        },
        tier2Words: [
          { word: "scrutinized", definition: "examined very closely for small details" },
          { word: "orbiting", definition: "circling around a planet in space" },
          { word: "transmit", definition: "send a signal from one place to another" }
        ]
      },
      questions: []
    };
  }

  /**
   * Deduplicates trialHistory by trialId/sessionId AND collapses accidental double-click
   * twin submissions (identical workoutId, duration, and scores within 120 seconds).
   */
  function deduplicateTrialHistory(trials) {
    if (!Array.isArray(trials)) return [];
    const seenIds = new Set();
    const result = [];
    for (let i = 0; i < trials.length; i++) {
      const t = trials[i];
      if (!t || typeof t !== "object") continue;
      const tid = t.trialId || t.sessionId || "";
      if (tid && seenIds.has(tid)) {
        continue;
      }
      const wId = t.workoutId || "";
      const dur = Number(t.totalDurationSeconds || t.timeSpentSeconds || 0);
      const fScore = Number(t.firstTryCorrectCount !== undefined ? t.firstTryCorrectCount : (t.firstTryScore || 0));
      const rScore = Number(t.retryCorrectCount !== undefined ? t.retryCorrectCount : (t.finalCorrectCount || fScore));
      const tsMs = Date.parse(t.timestampISO || t.completedAt || "") || 0;

      const isTwin = result.some(function (prev) {
        const prevWId = prev.workoutId || "";
        const prevDur = Number(prev.totalDurationSeconds || prev.timeSpentSeconds || 0);
        const prevFScore = Number(prev.firstTryCorrectCount !== undefined ? prev.firstTryCorrectCount : (prev.firstTryScore || 0));
        const prevRScore = Number(prev.retryCorrectCount !== undefined ? prev.retryCorrectCount : (prev.finalCorrectCount || prevFScore));
        const prevTsMs = Date.parse(prev.timestampISO || prev.completedAt || "") || 0;
        if (wId && wId === prevWId && Math.abs(dur - prevDur) < 0.2 && fScore === prevFScore && rScore === prevRScore) {
          if (tsMs > 0 && prevTsMs > 0 && Math.abs(tsMs - prevTsMs) <= 120000) {
            return true;
          }
        }
        return false;
      });
      if (isTwin) {
        continue;
      }
      if (tid) seenIds.add(tid);
      result.push(t);
    }
    return result;
  }

  /**
   * Core Recalculation Engine:
   * Anchors at Lucas's 5-test official DRC BEACON history (835L -> 840L -> 830L -> 800L -> 940L on 09/01/2026),
   * seeds all 5 domains with 4-item priors (78%, 72%, 68%, 62%, 64%), and blends in all recorded itemAttempts
   * from progress.trialHistory using recency weighting.
   */
  function recalculateMetricsFromTrials(progress, curriculum, workoutsOverride) {
    const curr = curriculum || (window.V2State && window.V2State.curriculum) || DEFAULT_CURRICULUM;
    const workouts = workoutsOverride || (window.V2State && window.V2State.workouts) || [];
    const profile = curr.studentProfile || DEFAULT_CURRICULUM.studentProfile;
    const domainsCfg = (curr.domains && curr.domains.length ? curr.domains : DEFAULT_CURRICULUM.domains);
    const trapArchetypes = curr.trapArchetypes || DEFAULT_CURRICULUM.trapArchetypes;

    const prog = progress && typeof progress === "object" ? progress : {};
    const cleanId = String(prog.studentId || (window.V2State && window.V2State.studentId) || "lucas")
      .toLowerCase()
      .replace(/\s+/g, "_");
    const isEvelyn = cleanId.includes("evelyn");
    const studentName = isEvelyn ? "Evelyn Mietling" : (profile.studentName || "Lucas Ramirez");

    prog.studentId = cleanId;
    prog.studentName = studentName;
    prog.grade = profile.currentGrade || 5;
    prog.school = profile.school || "Nickajack Elementary";
    prog.targetMiddleSchool = profile.targetMiddleSchool || "Dickerson Middle School";
    prog.baselineLexile = profile.currentOfficialLexile || 940;
    prog.baselineDate = "09/01/2026";
    prog.targetACLexile = profile.targetACLexile || 1075;
    prog.targetStretchLexile = profile.targetStretchLexile || 1150;
    prog.officialBeaconHistory = Array.isArray(profile.officialBeaconHistory) && profile.officialBeaconHistory.length
      ? profile.officialBeaconHistory
      : OFFICIAL_BEACON_HISTORY;

    if (!Array.isArray(prog.trialHistory)) {
      prog.trialHistory = [];
    } else {
      prog.trialHistory = deduplicateTrialHistory(prog.trialHistory);
    }

    const domainAttempts = {
      D1_KEY_IDEAS: [],
      D2_CRAFT_STRUCTURE: [],
      D3_INTEGRATION: [],
      D4_SYNTAX: [],
      D5_EBSR: []
    };
    const subSkillAttempts = {};
    const domainTrapCounts = {
      D1_KEY_IDEAS: { TRAP_WORD_MATCH: 0, TRAP_TOO_NARROW: 0, TRAP_EXTREME: 0, TRAP_OUTSIDE_INFO: 0, TRAP_SYNTACTIC_REVERSAL: 0 },
      D2_CRAFT_STRUCTURE: { TRAP_WORD_MATCH: 0, TRAP_TOO_NARROW: 0, TRAP_EXTREME: 0, TRAP_OUTSIDE_INFO: 0, TRAP_SYNTACTIC_REVERSAL: 0 },
      D3_INTEGRATION: { TRAP_WORD_MATCH: 0, TRAP_TOO_NARROW: 0, TRAP_EXTREME: 0, TRAP_OUTSIDE_INFO: 0, TRAP_SYNTACTIC_REVERSAL: 0 },
      D4_SYNTAX: { TRAP_WORD_MATCH: 0, TRAP_TOO_NARROW: 0, TRAP_EXTREME: 0, TRAP_OUTSIDE_INFO: 0, TRAP_SYNTACTIC_REVERSAL: 0 },
      D5_EBSR: { TRAP_WORD_MATCH: 0, TRAP_TOO_NARROW: 0, TRAP_EXTREME: 0, TRAP_OUTSIDE_INFO: 0, TRAP_SYNTACTIC_REVERSAL: 0 }
    };

    const trapCounts = {
      TRAP_WORD_MATCH: 0,
      TRAP_TOO_NARROW: 0,
      TRAP_EXTREME: 0,
      TRAP_OUTSIDE_INFO: 0,
      TRAP_SYNTACTIC_REVERSAL: 0
    };

    const ebsrStats = {
      bothCorrect: 0,
      partAOnly: 0,
      partBOnly: 0,
      bothWrong: 0,
      totalPairs: 0,
      linkAccuracyPct: 64
    };

    let totalItemsAttempted = 0;
    let totalFirstTryCorrect = 0;
    let totalRetryCorrect = 0;
    let totalSecondsSpent = 0;
    let impulsiveCount = 0;
    let hesitationCount = 0;
    let optimalCount = 0;

    const completedWorkoutIds = [];
    const domainLastPracticed = {
      D1_KEY_IDEAS: null,
      D2_CRAFT_STRUCTURE: null,
      D3_INTEGRATION: null,
      D4_SYNTAX: null,
      D5_EBSR: null
    };

    prog.trialHistory.forEach(function (trial) {
      if (!trial || typeof trial !== "object") return;
      if (trial.workoutId && !completedWorkoutIds.includes(trial.workoutId)) {
        completedWorkoutIds.push(trial.workoutId);
      }

      const tGenre = trial.genre || "Informational";
      const tLexile = Number(trial.targetLexile) || 960;
      const tIso = trial.timestampISO || trial.completedAt || null;
      const rawItems = Array.isArray(trial.itemAttempts)
        ? trial.itemAttempts
        : (Array.isArray(trial.items) ? trial.items : []);
      trial.itemAttempts = rawItems;
      trial.items = rawItems;

      let ebsrPartAItem = null;
      let ebsrPartBItem = null;
      const d5ItemsInTrial = [];

      rawItems.forEach(function (item, idx) {
        if (!item || typeof item !== "object") return;
        let dId = item.domain || item.domainId || trial.focusDomain || "D1_KEY_IDEAS";
        if (!DOMAIN_BASELINE_PRIORS[dId]) {
          dId = "D1_KEY_IDEAS";
        }

        const firstCorrect = item.firstTryCorrect !== undefined
          ? Boolean(item.firstTryCorrect)
          : Boolean(item.isCorrect);
        const retryCorrect = item.retryCorrect !== undefined
          ? Boolean(item.retryCorrect)
          : (firstCorrect ? true : Boolean(item.secondTryCorrect));
        const sec = Number(item.timeSpentSeconds !== undefined ? item.timeSpentSeconds : (item.secondsSpent !== undefined ? item.secondsSpent : 30));
        const safeSec = Number.isFinite(sec) && sec >= 0 ? sec : 30;
        const dok = Number(item.dok || item.dokLevel || 2);
        const subId = item.subSkill || item.subSkillId || null;
        const itemType = item.itemType || "STANDARD";

        const isImpulsive = Boolean(item.impulsiveFlag || item.impulsivityFlag || (safeSec > 0 && safeSec < 8));
        const isHesitation = Boolean(item.hesitationFlag || safeSec > 90);

        totalItemsAttempted += 1;
        if (firstCorrect) totalFirstTryCorrect += 1;
        if (retryCorrect) totalRetryCorrect += 1;
        totalSecondsSpent += safeSec;

        if (isImpulsive) {
          impulsiveCount += 1;
        } else if (isHesitation) {
          hesitationCount += 1;
        } else {
          optimalCount += 1;
        }

        if (!firstCorrect) {
          const trap = normalizeTrapCode(item.trapType || item.distractorTrapSelected);
          if (trap && trapCounts[trap] !== undefined) {
            trapCounts[trap] += 1;
            domainTrapCounts[dId][trap] = (domainTrapCounts[dId][trap] || 0) + 1;
          }
        }

        const attemptRec = {
          domain: dId,
          subSkill: subId,
          genre: item.genre || tGenre,
          targetLexile: tLexile,
          dok: dok,
          firstTryCorrect: firstCorrect,
          retryCorrect: retryCorrect,
          score: firstCorrect ? 1.0 : 0.0,
          timestampISO: tIso
        };

        domainAttempts[dId].push(attemptRec);
        if (tIso) {
          domainLastPracticed[dId] = tIso;
        }
        if (subId) {
          if (!subSkillAttempts[subId]) subSkillAttempts[subId] = [];
          subSkillAttempts[subId].push(attemptRec);
        }

        if (itemType === "EBSR_PART_A" || item.isEbsrPartA) {
          ebsrPartAItem = item;
        } else if (itemType === "EBSR_PART_B" || item.isEbsrPartB || idx === 5) {
          ebsrPartBItem = item;
        }
        if (dId === "D5_EBSR") {
          d5ItemsInTrial.push(item);
        }
      });

      if (!ebsrPartAItem && d5ItemsInTrial.length >= 2) {
        ebsrPartAItem = d5ItemsInTrial[0];
        ebsrPartBItem = d5ItemsInTrial[1];
      } else if (!ebsrPartAItem && ebsrPartBItem && rawItems.length >= 2) {
        ebsrPartAItem = rawItems[rawItems.length - 2];
      }

      if (ebsrPartAItem && ebsrPartBItem) {
        const aOk = ebsrPartAItem.firstTryCorrect !== undefined ? Boolean(ebsrPartAItem.firstTryCorrect) : Boolean(ebsrPartAItem.isCorrect);
        const bOk = ebsrPartBItem.firstTryCorrect !== undefined ? Boolean(ebsrPartBItem.firstTryCorrect) : Boolean(ebsrPartBItem.isCorrect);
        ebsrStats.totalPairs += 1;
        if (aOk && bOk) ebsrStats.bothCorrect += 1;
        else if (aOk && !bOk) ebsrStats.partAOnly += 1;
        else if (!aOk && bOk) ebsrStats.partBOnly += 1;
        else ebsrStats.bothWrong += 1;
      } else if (d5ItemsInTrial.length === 1) {
        const onlyOk = d5ItemsInTrial[0].firstTryCorrect !== undefined ? Boolean(d5ItemsInTrial[0].firstTryCorrect) : Boolean(d5ItemsInTrial[0].isCorrect);
        ebsrStats.totalPairs += 1;
        if (onlyOk) ebsrStats.bothCorrect += 1;
        else ebsrStats.bothWrong += 1;
      }
    });

    // Compute Domain Mastery & Literary/Informational split
    const domainMastery = {};
    const domainMasteryList = [];

    let totalLitWeight = 0;
    let totalLitScore = 0;
    let totalInfoWeight = 0;
    let totalInfoScore = 0;
    let totalLitRecAttempted = 0;
    let totalLitRecCorrect = 0;
    let totalInfoRecAttempted = 0;
    let totalInfoRecCorrect = 0;

    domainsCfg.forEach(function (dCfg) {
      const dId = dCfg.id;
      const basePct = Number(DOMAIN_BASELINE_PRIORS[dId] || 70);
      const weight = Number(dCfg.weight || 1.25);
      const records = domainAttempts[dId] || [];
      const nRec = records.length;

      // Prior weight equivalent to 4 baseline items
      const priorW = 4.0;
      const priorS = priorW * (basePct / 100.0);

      let recWSum = 0;
      let recSSum = 0;

      const litPriorPct = Math.min(98, basePct + 2);
      const infoPriorPct = Math.max(40, basePct - 2);
      let litW = 2.0;
      let litS = litW * (litPriorPct / 100.0);
      let infoW = 2.0;
      let infoS = infoW * (infoPriorPct / 100.0);

      let litRecAttempted = 0;
      let litRecCorrect = 0;
      let infoRecAttempted = 0;
      let infoRecCorrect = 0;

      records.forEach(function (rec, idx) {
        const age = (nRec - 1) - idx;
        const wRecency = 1.25 * Math.pow(0.92, age);
        const wDok = rec.dok === 1 ? 0.9 : (rec.dok >= 3 ? 1.15 : 1.0);
        const wLex = rec.targetLexile >= 1030 ? 1.15 : (rec.targetLexile >= 980 ? 1.05 : 1.0);
        const wItem = wRecency * wDok * wLex;
        const sItem = Number(rec.score || 0);

        recWSum += wItem;
        recSSum += wItem * sItem;

        if (rec.genre === "Literary") {
          litW += wItem;
          litS += wItem * sItem;
          litRecAttempted += 1;
          if (sItem >= 0.99) litRecCorrect += 1;
        } else {
          infoW += wItem;
          infoS += wItem * sItem;
          infoRecAttempted += 1;
          if (sItem >= 0.99) infoRecCorrect += 1;
        }
      });

      const blendedPct = Math.max(0, Math.min(100, Math.round(((priorS + recSSum) / (priorW + recWSum)) * 100)));
      const litPct = Math.max(0, Math.min(100, Math.round((litS / litW) * 100)));
      const infoPct = Math.max(0, Math.min(100, Math.round((infoS / infoW) * 100)));

      totalLitWeight += litW;
      totalLitScore += litS;
      totalInfoWeight += infoW;
      totalInfoScore += infoS;
      totalLitRecAttempted += litRecAttempted;
      totalLitRecCorrect += litRecCorrect;
      totalInfoRecAttempted += infoRecAttempted;
      totalInfoRecCorrect += infoRecCorrect;

      const status = computeDomainStatus(blendedPct);
      const priorityDeficitScore = Number(((100 - blendedPct) * weight).toFixed(1));

      const subSkillsMap = {};
      (dCfg.subSkills || []).forEach(function (subCfg) {
        const sId = subCfg.id;
        const sRecs = subSkillAttempts[sId] || [];
        const sPriorW = 2.0;
        const sPriorS = sPriorW * (basePct / 100.0);
        let sWSum = 0;
        let sSSum = 0;
        sRecs.forEach(function (sRec, rIdx) {
          const sAge = (sRecs.length - 1) - rIdx;
          const wSub = 1.25 * Math.pow(0.92, sAge);
          sWSum += wSub;
          sSSum += wSub * Number(sRec.score || 0);
        });
        const subPct = sRecs.length
          ? Math.max(0, Math.min(100, Math.round(((sPriorS + sSSum) / (sPriorW + sWSum)) * 100)))
          : blendedPct;
        subSkillsMap[sId] = {
          id: sId,
          name: subCfg.name,
          masteryPct: subPct,
          attempted: sRecs.length,
          correct: sRecs.filter(function (r) { return r.score >= 0.99; }).length,
          status: computeDomainStatus(subPct)
        };
      });

      const recCorrectCount = records.filter(function (r) { return r.score >= 0.99; }).length;
      const dObj = {
        domainId: dId,
        id: dId,
        shortName: dCfg.shortName || dId,
        parentLabel: dCfg.parentLabel || dId,
        weight: weight,
        standards: dCfg.standards || [],
        baselinePct: basePct,
        masteryPct: blendedPct,
        firstTryPct: blendedPct,
        literaryPct: litPct,
        informationalPct: infoPct,
        literaryAttempted: litRecAttempted,
        literaryCorrect: litRecCorrect,
        informationalAttempted: infoRecAttempted,
        informationalCorrect: infoRecCorrect,
        priorWeight: 4,
        attempted: 4 + nRec,
        correct: Number((priorS + recCorrectCount).toFixed(1)),
        recordedAttempts: nRec,
        recordedCorrect: recCorrectCount,
        status: status,
        priorityDeficitScore: priorityDeficitScore,
        lastPracticedISO: domainLastPracticed[dId],
        subSkills: subSkillsMap
      };

      domainMastery[dId] = dObj;
      domainMasteryList.push(dObj);
    });

    if (ebsrStats.totalPairs > 0) {
      const pairRate = (ebsrStats.bothCorrect / ebsrStats.totalPairs) * 100;
      ebsrStats.linkAccuracyPct = Math.round((64 * 2 + pairRate * ebsrStats.totalPairs) / (2 + ebsrStats.totalPairs));
    } else {
      ebsrStats.linkAccuracyPct = domainMastery.D5_EBSR ? domainMastery.D5_EBSR.masteryPct : 64;
    }

    const overallLitPct = Math.round((totalLitScore / Math.max(1, totalLitWeight)) * 100);
    const overallInfoPct = Math.round((totalInfoScore / Math.max(1, totalInfoWeight)) * 100);

    // Rolling Estimated Lexile & SEM anchored at Lucas's 940L Fall G5 BEACON report
    const baselineLexile = 940;
    let estimatedLexile = 940;
    let estimatedSEM = 25;

    if (prog.trialHistory.length > 0) {
      const nTrials = prog.trialHistory.length;
      const anchorWeight = Math.max(1.5, 3.8 * Math.pow(0.85, nTrials));
      let lexWSum = anchorWeight;
      let lexValSum = anchorWeight * baselineLexile;
      let masteryBonus = 0;

      prog.trialHistory.forEach(function (trial, idx) {
        const age = (nTrials - 1) - idx;
        const wT = 1.25 * Math.pow(0.90, age);
        const tLex = Number(trial.targetLexile) || 960;
        const items = Array.isArray(trial.itemAttempts) ? trial.itemAttempts : [];
        let acc = 0.75;
        if (items.length > 0) {
          const cCnt = items.filter(function (it) {
            return it.firstTryCorrect !== undefined ? Boolean(it.firstTryCorrect) : Boolean(it.isCorrect);
          }).length;
          acc = cCnt / items.length;
        } else if (trial.firstTryAccuracyPct !== undefined) {
          acc = Number(trial.firstTryAccuracyPct) / 100.0;
        }

        const effLex = Math.max(baselineLexile, tLex);
        const perfLex = acc >= 0.50
          ? effLex + (acc - 0.68) * 145
          : baselineLexile - (0.68 - acc) * 85;

        lexWSum += wT;
        lexValSum += wT * perfLex;

        if (acc >= 0.80) masteryBonus += 4.5;
        else if (acc >= 0.66) masteryBonus += 2.0;
      });

      const rawEst = (lexValSum / lexWSum) + Math.min(45, masteryBonus);
      estimatedLexile = Math.round(rawEst / 5) * 5;
      estimatedLexile = Math.max(850, Math.min(1180, estimatedLexile));
      estimatedSEM = Math.max(12, Math.round(25 - Math.min(13, Math.sqrt(Math.max(1, totalItemsAttempted)) * 2.2)));
    }

    let currentTier = 1;
    if (estimatedLexile >= 1085) currentTier = 4;
    else if (estimatedLexile >= 1030) currentTier = 3;
    else if (estimatedLexile >= 980) currentTier = 2;

    let acQualificationStatus = "NEEDS_ACCELERATION";
    if (estimatedLexile >= 1075) acQualificationStatus = "QUALIFIED";
    else if (estimatedLexile >= 980) acQualificationStatus = "ON_TRACK";

    // Rank domains by priorityDeficitScore descending to identify topWeakness
    const sortedDomains = domainMasteryList.slice().sort(function (a, b) {
      if (b.priorityDeficitScore !== a.priorityDeficitScore) {
        return b.priorityDeficitScore - a.priorityDeficitScore;
      }
      return a.masteryPct - b.masteryPct;
    });

    const topDom = sortedDomains[0] || {
      domainId: "D4_SYNTAX",
      shortName: "Sentence Surgery",
      parentLabel: "Syntactic Decoding (Monster Sentences & Passive Voice)",
      masteryPct: 62,
      status: "NEEDS_PRACTICE",
      priorityDeficitScore: 51.3
    };

    const topDId = topDom.domainId;
    const dTraps = domainTrapCounts[topDId] || {};
    let bestTrapCode = null;
    let bestTrapCnt = 0;

    Object.keys(dTraps).forEach(function (tCode) {
      if (dTraps[tCode] > bestTrapCnt) {
        bestTrapCnt = dTraps[tCode];
        bestTrapCode = tCode;
      }
    });

    if (!bestTrapCode) {
      Object.keys(trapCounts).forEach(function (tCode) {
        if (trapCounts[tCode] > bestTrapCnt) {
          bestTrapCnt = trapCounts[tCode];
          bestTrapCode = tCode;
        }
      });
    }

    if (!bestTrapCode) {
      bestTrapCode = DOMAIN_DEFAULT_TRAP[topDId] || "TRAP_SYNTACTIC_REVERSAL";
    }

    const trapMeta = trapArchetypes[bestTrapCode] || DEFAULT_CURRICULUM.trapArchetypes[bestTrapCode] || {
      code: bestTrapCode,
      kidName: "Flipped Action Trap",
      parentName: "Syntactic / Causal Reversal",
      remediation: "Confuses the cause and effect or swaps the subject and receiver in a long sentence."
    };

    let recWorkoutId = "w01_tier1_info";
    let recWorkoutTitle = "Targeted Precision Workout";
    if (workouts && workouts.length > 0) {
      const targetLex = estimatedLexile + 25;
      const sortByLexDist = function (a, b) {
        const distA = Math.abs((Number(a.targetLexile) || 960) - targetLex);
        const distB = Math.abs((Number(b.targetLexile) || 960) - targetLex);
        if (distA !== distB) return distA - distB;
        return (Number(a.workoutNumber) || 0) - (Number(b.workoutNumber) || 0);
      };
      const uncompletedInDom = workouts.filter(function (w) {
        return w.focusDomain === topDId && !completedWorkoutIds.includes(w.workoutId);
      }).sort(sortByLexDist);
      const anyInDom = workouts.filter(function (w) {
        return w.focusDomain === topDId;
      }).sort(sortByLexDist);
      const chosenW = (uncompletedInDom[0] || anyInDom[0] || workouts[0]);
      if (chosenW) {
        recWorkoutId = chosenW.workoutId;
        recWorkoutTitle = chosenW.title;
      }
    }

    const firstName = studentName.split(" ")[0];
    const topWeakness = {
      domainId: topDId,
      domainShortName: topDom.shortName,
      domainParentLabel: topDom.parentLabel,
      masteryPct: topDom.masteryPct,
      status: topDom.status,
      priorityDeficitScore: topDom.priorityDeficitScore,
      trapCode: bestTrapCode,
      topTrapCode: bestTrapCode,
      trapKidName: trapMeta.kidName,
      trapParentName: trapMeta.parentName,
      trapCount: bestTrapCnt,
      trapRemediation: trapMeta.remediation,
      headline: `${topDom.parentLabel} (${topDom.masteryPct}% Mastery)`,
      parentSummary: `${topDom.parentLabel} is currently ${firstName}'s #1 priority focus area at ${topDom.masteryPct}% mastery (Priority Deficit Score: ${topDom.priorityDeficitScore}). Primary vulnerability: ${trapMeta.parentName} — ${trapMeta.remediation}`,
      recommendedWorkoutId: recWorkoutId,
      recommendedWorkoutTitle: recWorkoutTitle
    };

    const avgSec = totalItemsAttempted > 0
      ? Number((totalSecondsSpent / totalItemsAttempted).toFixed(1))
      : 0;

    const pacingStats = {
      totalItemsAttempted: totalItemsAttempted,
      totalSecondsSpent: Number(totalSecondsSpent.toFixed(1)),
      avgSecondsPerItem: avgSec,
      impulsiveCount: impulsiveCount,
      hesitationCount: hesitationCount,
      optimalCount: optimalCount
    };

    const xpVal = Number.isFinite(Number(prog.xp)) ? Number(prog.xp) : 450;
    const levelNum = Math.max(1, Math.floor(xpVal / 100) + 1);

    prog.estimatedLexile = estimatedLexile;
    prog.estimatedSEM = estimatedSEM;
    prog.lexileDelta = estimatedLexile - 940;
    prog.gapToAC = Math.max(0, 1075 - estimatedLexile);
    prog.acQualificationStatus = acQualificationStatus;
    prog.currentTier = currentTier;
    prog.xp = xpVal;
    prog.level = levelNum;
    prog.levelTitle = `Level ${levelNum}`;
    prog.levelProgressPct = xpVal % 100;
    prog.streakDays = Number.isFinite(Number(prog.streakDays)) ? Number(prog.streakDays) : 5;
    prog.lastPracticeDate = prog.lastPracticeDate || "2026-10-04";
    prog.queuedWorkoutId = prog.queuedWorkoutId || null;
    prog.queuedDomainId = prog.queuedDomainId || null;
    prog.completedWorkoutIds = completedWorkoutIds;
    prog.domainMastery = domainMastery;
    prog.domainMasteryList = domainMasteryList;
    prog.literaryAccuracyPct = overallLitPct;
    prog.informationalAccuracyPct = overallInfoPct;
    prog.genreStats = {
      Literary: {
        attempted: totalLitRecAttempted,
        correct: totalLitRecCorrect,
        accuracyPct: overallLitPct
      },
      Informational: {
        attempted: totalInfoRecAttempted,
        correct: totalInfoRecCorrect,
        accuracyPct: overallInfoPct
      }
    };
    prog.trapCounts = trapCounts;
    prog.ebsrStats = ebsrStats;
    prog.pacingStats = pacingStats;
    prog.pacingMetrics = pacingStats;
    prog.avgSecondsPerItem = avgSec;
    prog.impulsiveCount = impulsiveCount;
    prog.hesitationCount = hesitationCount;
    prog.totalItemsAttempted = totalItemsAttempted;
    prog.totalFirstTryCorrect = totalFirstTryCorrect;
    prog.totalRetryCorrect = totalRetryCorrect;
    prog.overallFirstTryPct = totalItemsAttempted > 0
      ? Math.round((totalFirstTryCorrect / totalItemsAttempted) * 100)
      : 69;
    prog.topWeakness = topWeakness;

    return prog;
  }

  function buildDefaultProgress(studentId) {
    const cleanId = String(studentId || "lucas").toLowerCase().replace(/\s+/g, "_");
    const seed = {
      studentId: cleanId,
      studentName: cleanId.includes("evelyn") ? "Evelyn Mietling" : "Lucas Ramirez",
      xp: 450,
      streakDays: 5,
      lastPracticeDate: "2026-10-04",
      queuedWorkoutId: null,
      queuedDomainId: null,
      completedWorkoutIds: [],
      trialHistory: []
    };
    return recalculateMetricsFromTrials(seed, DEFAULT_CURRICULUM, []);
  }

  // ============================================================================
  // GLOBAL V2 STATE
  // ============================================================================
  const initialStudentId = (function () {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("student_id")) return params.get("student_id").toLowerCase();
      const saved = localStorage.getItem("beacon_v2_student_id");
      if (saved) return saved.toLowerCase();
    } catch (_) {}
    return "lucas";
  })();

  window.V2State = {
    studentId: initialStudentId,
    viewMode: "student",
    curriculum: DEFAULT_CURRICULUM,
    workouts: [],
    progress: buildDefaultProgress(initialStudentId),
    initialized: false
  };

  function cacheProgressLocally(progress) {
    if (!progress) return;
    try {
      const key = getStorageKey(progress.studentId || window.V2State.studentId);
      localStorage.setItem(key, JSON.stringify(progress));
    } catch (e) {
      console.warn("V2State localStorage write warning:", e);
    }
  }

  function readCachedProgressLocally(studentId) {
    try {
      const key = getStorageKey(studentId);
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("V2State localStorage read warning:", e);
    }
    return null;
  }

  function emitStateUpdate(eventName, detailObj) {
    try {
      window.dispatchEvent(new CustomEvent(eventName || "v2:stateUpdated", {
        detail: detailObj || window.V2State
      }));
    } catch (_) {}
  }

  // ============================================================================
  // PUBLIC V2 ENGINE API
  // ============================================================================
  window.V2Engine = {
    recalculateMetricsFromTrials: recalculateMetricsFromTrials,

    getDefaultProgress: buildDefaultProgress,

    async init() {
      const studentId = window.V2State.studentId || "lucas";
      let currData = DEFAULT_CURRICULUM;
      let workoutsList = [];
      let progData = readCachedProgressLocally(studentId);

      const results = await Promise.allSettled([
        fetch("/api/v2/curriculum").then(function (r) { return r.ok ? r.json() : DEFAULT_CURRICULUM; }),
        fetch("/api/v2/workouts").then(function (r) { return r.ok ? r.json() : { workouts: [] }; }),
        fetch(`/api/v2/progress?student_id=${encodeURIComponent(studentId)}`).then(function (r) { return r.ok ? r.json() : null; })
      ]);

      if (results[0].status === "fulfilled" && results[0].value && results[0].value.domains) {
        currData = results[0].value;
      }
      if (results[1].status === "fulfilled" && results[1].value && Array.isArray(results[1].value.workouts)) {
        workoutsList = results[1].value.workouts.slice().sort(function (a, b) {
          return (Number(a.workoutNumber) || 999) - (Number(b.workoutNumber) || 999);
        });
      }
      if (results[2].status === "fulfilled" && results[2].value && results[2].value.studentId) {
        const serverProg = results[2].value;
        const serverTrials = Array.isArray(serverProg.trialHistory) ? serverProg.trialHistory.length : 0;
        const localTrials = progData && Array.isArray(progData.trialHistory) ? progData.trialHistory.length : 0;
        progData = (localTrials > serverTrials) ? progData : serverProg;
      }

      if (!progData) {
        progData = buildDefaultProgress(studentId);
      }

      window.V2State.curriculum = currData;
      window.V2State.workouts = workoutsList;
      window.V2State.progress = recalculateMetricsFromTrials(progData, currData, workoutsList);
      window.V2State.initialized = true;

      cacheProgressLocally(window.V2State.progress);
      emitStateUpdate("v2:ready", window.V2State);
      emitStateUpdate("v2:stateUpdated", window.V2State);
      return window.V2State;
    },

    getWorkoutById(workoutId) {
      const list = window.V2State.workouts || [];
      return list.find(function (w) { return w.workoutId === workoutId; }) || null;
    },

    getDomainMeta(domainId) {
      const domains = (window.V2State.curriculum && window.V2State.curriculum.domains) || DEFAULT_CURRICULUM.domains;
      return domains.find(function (d) { return d.id === domainId; }) || domains[0];
    },

    getTrapMeta(trapCode) {
      const norm = normalizeTrapCode(trapCode);
      const traps = (window.V2State.curriculum && window.V2State.curriculum.trapArchetypes) || DEFAULT_CURRICULUM.trapArchetypes;
      return traps[norm] || DEFAULT_CURRICULUM.trapArchetypes.TRAP_WORD_MATCH;
    },

    /**
     * Selects Today's Recommended 10-Minute Precision Workout:
     * 1. Honors explicit parent queue (queuedWorkoutId or queuedDomainId).
     * 2. Otherwise ranks all 5 domains by Priority Deficit Score (Pd) descending
     *    and picks the highest-ROI uncompleted workout near Lucas's target challenge Lexile.
     */
    getRecommendedTodayWorkout() {
      const workouts = window.V2State.workouts || [];
      if (!workouts.length) {
        return createFallbackWorkout();
      }

      const prog = window.V2State.progress || buildDefaultProgress(window.V2State.studentId);
      const completed = Array.isArray(prog.completedWorkoutIds) ? prog.completedWorkoutIds : [];
      const targetLexile = (Number(prog.estimatedLexile) || 940) + 25;

      // 1. Explicit queued workout ID
      if (prog.queuedWorkoutId) {
        const queuedW = workouts.find(function (w) { return w.workoutId === prog.queuedWorkoutId; });
        if (queuedW) return queuedW;
      }

      // 2. Explicit queued domain ID
      if (prog.queuedDomainId) {
        const domainPool = workouts.filter(function (w) {
          return w.focusDomain === prog.queuedDomainId && !completed.includes(w.workoutId);
        });
        const fallbackDomainPool = workouts.filter(function (w) {
          return w.focusDomain === prog.queuedDomainId;
        });
        const candidates = domainPool.length ? domainPool : fallbackDomainPool;
        if (candidates.length) {
          candidates.sort(function (a, b) {
            return Math.abs((a.targetLexile || 960) - targetLexile) - Math.abs((b.targetLexile || 960) - targetLexile);
          });
          return candidates[0];
        }
      }

      // 3. Adaptive Priority Deficit Score (Pd) selection
      const domainList = Array.isArray(prog.domainMasteryList) && prog.domainMasteryList.length
        ? prog.domainMasteryList.slice()
        : Object.values(prog.domainMastery || {});

      domainList.sort(function (a, b) {
        if (b.priorityDeficitScore !== a.priorityDeficitScore) {
          return b.priorityDeficitScore - a.priorityDeficitScore;
        }
        return a.masteryPct - b.masteryPct;
      });

      const uncompleted = workouts.filter(function (w) {
        return !completed.includes(w.workoutId);
      });
      const pool = uncompleted.length ? uncompleted : workouts;

      // Check if top deficit domain is critically low (<60%) and Tier 0 scaffold exists
      const topDomain = domainList[0];
      if (topDomain && topDomain.masteryPct < 60) {
        const scaffolds = pool.filter(function (w) {
          return Number(w.tier) === 0 && (w.focusDomain === topDomain.domainId || true);
        });
        if (scaffolds.length) return scaffolds[0];
      }

      for (let i = 0; i < domainList.length; i++) {
        const dId = domainList[i].domainId;
        const matching = pool.filter(function (w) { return w.focusDomain === dId; });
        if (matching.length) {
          matching.sort(function (a, b) {
            const distA = Math.abs((Number(a.targetLexile) || 960) - targetLexile);
            const distB = Math.abs((Number(b.targetLexile) || 960) - targetLexile);
            if (distA !== distB) return distA - distB;
            return (Number(a.workoutNumber) || 0) - (Number(b.workoutNumber) || 0);
          });
          return matching[0];
        }
      }

      const byLexile = pool.slice().sort(function (a, b) {
        return Math.abs((Number(a.targetLexile) || 960) - targetLexile) - Math.abs((Number(b.targetLexile) || 960) - targetLexile);
      });
      return byLexile[0] || workouts[0];
    },

    /**
     * Returns 3 curated workout options for the child launchpad:
     *   { storyQuest, discoveryLab, speedBoost }
     *   - storyQuest: 1 Literary workout
     *   - discoveryLab: 1 Informational workout
     *   - speedBoost: 1 workout targeting the highest deficit domain
     */
    getAdventureCards() {
      const workouts = window.V2State.workouts || [];
      if (!workouts.length) {
        const fb = createFallbackWorkout();
        return {
          storyQuest: Object.assign({}, fb, { genre: "Literary", cardLabel: "Story Quest", cardIcon: "📖" }),
          discoveryLab: Object.assign({}, fb, { genre: "Informational", cardLabel: "Discovery Lab", cardIcon: "🔬" }),
          speedBoost: Object.assign({}, fb, { cardLabel: "Speed Boost", cardIcon: "⚡" })
        };
      }

      const prog = window.V2State.progress || buildDefaultProgress(window.V2State.studentId);
      const completed = Array.isArray(prog.completedWorkoutIds) ? prog.completedWorkoutIds : [];
      const targetLexile = (Number(prog.estimatedLexile) || 940) + 25;
      const topDomainId = (prog.topWeakness && prog.topWeakness.domainId) || "D4_SYNTAX";

      const pickBest = function (predicate, usedIds) {
        const uncomp = workouts.filter(function (w) {
          return predicate(w) && !completed.includes(w.workoutId) && !usedIds.has(w.workoutId);
        });
        const anyUnused = workouts.filter(function (w) {
          return predicate(w) && !usedIds.has(w.workoutId);
        });
        const anyMatch = workouts.filter(predicate);
        const candidates = uncomp.length ? uncomp : (anyUnused.length ? anyUnused : (anyMatch.length ? anyMatch : workouts));
        const sorted = candidates.slice().sort(function (a, b) {
          const distA = Math.abs((Number(a.targetLexile) || 960) - targetLexile);
          const distB = Math.abs((Number(b.targetLexile) || 960) - targetLexile);
          if (distA !== distB) return distA - distB;
          return (Number(a.workoutNumber) || 0) - (Number(b.workoutNumber) || 0);
        });
        return sorted[0] || workouts[0];
      };

      const used = new Set();
      // Reserve Today's Hero Card workout so the 3 Adventure Cards below are always distinct quests
      const todayW = this.getRecommendedTodayWorkout();
      if (todayW && todayW.workoutId) {
        used.add(todayW.workoutId);
      }

      const storyW = pickBest(function (w) { return w.genre === "Literary"; }, used);
      if (storyW) used.add(storyW.workoutId);

      const discoveryW = pickBest(function (w) { return w.genre === "Informational"; }, used);
      if (discoveryW) used.add(discoveryW.workoutId);

      const speedW = pickBest(function (w) { return w.focusDomain === topDomainId; }, used);

      return {
        storyQuest: Object.assign({}, storyW, { cardLabel: "Story Quest", cardIcon: "📖" }),
        discoveryLab: Object.assign({}, discoveryW, { cardLabel: "Discovery Lab", cardIcon: "🔬" }),
        speedBoost: Object.assign({}, speedW, { cardLabel: "Speed Boost", cardIcon: "⚡" })
      };
    },

    /**
     * Filters workouts by optional criteria:
     *   { genre, tier, domain, focusDomain, completed, minLexile, maxLexile, search }
     */
    getWorkoutsByFilter(filterObj) {
      const workouts = (window.V2State.workouts || []).slice();
      if (!filterObj || typeof filterObj !== "object") {
        return workouts;
      }
      const prog = window.V2State.progress || {};
      const completed = Array.isArray(prog.completedWorkoutIds) ? prog.completedWorkoutIds : [];

      return workouts.filter(function (w) {
        if (filterObj.genre && filterObj.genre !== "ALL" && w.genre !== filterObj.genre) {
          return false;
        }
        if (filterObj.tier !== undefined && filterObj.tier !== null && filterObj.tier !== "ALL" && filterObj.tier !== "") {
          if (Number(w.tier) !== Number(filterObj.tier)) return false;
        }
        const domFilter = filterObj.domain || filterObj.focusDomain;
        if (domFilter && domFilter !== "ALL") {
          if (w.focusDomain !== domFilter) return false;
        }
        if (filterObj.completed === true && !completed.includes(w.workoutId)) {
          return false;
        }
        if (filterObj.completed === false && completed.includes(w.workoutId)) {
          return false;
        }
        if (filterObj.minLexile !== undefined && Number(w.targetLexile) < Number(filterObj.minLexile)) {
          return false;
        }
        if (filterObj.maxLexile !== undefined && Number(w.targetLexile) > Number(filterObj.maxLexile)) {
          return false;
        }
        if (filterObj.search) {
          const q = String(filterObj.search).toLowerCase();
          const hay = `${w.title || ""} ${w.subGenre || ""} ${w.focusStandard || ""} ${w.workoutId || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    },

    /**
     * Records a completed daily workout trial, recalculates all V2 metrics,
     * persists to localStorage and POST /api/v2/trial, and returns { trial, progress }.
     */
    async recordCompletedTrial(trialPayload) {
      if (!trialPayload || typeof trialPayload !== "object") {
        throw new Error("recordCompletedTrial requires a trialPayload object");
      }

      const studentId = window.V2State.studentId || "lucas";
      const prog = window.V2State.progress || buildDefaultProgress(studentId);
      const nowIso = new Date().toISOString();
      const trialId = trialPayload.trialId || trialPayload.sessionId || `trial_${Date.now()}_${studentId}`;

      const rawItems = Array.isArray(trialPayload.itemAttempts)
        ? trialPayload.itemAttempts
        : (Array.isArray(trialPayload.items) ? trialPayload.items : []);

      let firstCorrectCount = 0;
      let retryCorrectCount = 0;
      let totalSeconds = 0;
      let impCount = 0;
      let hesCount = 0;

      const normalizedItems = rawItems.map(function (it, idx) {
        const firstOk = it.firstTryCorrect !== undefined ? Boolean(it.firstTryCorrect) : Boolean(it.isCorrect);
        const retryOk = it.retryCorrect !== undefined ? Boolean(it.retryCorrect) : (firstOk ? true : Boolean(it.secondTryCorrect));
        const sec = Number(it.timeSpentSeconds !== undefined ? it.timeSpentSeconds : (it.secondsSpent !== undefined ? it.secondsSpent : 28));
        const safeSec = Number.isFinite(sec) && sec >= 0 ? Number(sec.toFixed(1)) : 28;
        const impFlag = Boolean(it.impulsiveFlag || it.impulsivityFlag || (safeSec > 0 && safeSec < 8));
        const hesFlag = Boolean(it.hesitationFlag || safeSec > 90);
        const trap = firstOk ? null : normalizeTrapCode(it.trapType || it.distractorTrapSelected);

        if (firstOk) firstCorrectCount += 1;
        if (retryOk) retryCorrectCount += 1;
        totalSeconds += safeSec;
        if (impFlag) impCount += 1;
        if (hesFlag) hesCount += 1;

        return {
          questionId: it.questionId || it.itemId || `q${idx + 1}`,
          itemId: it.itemId || it.questionId || `q${idx + 1}`,
          questionIndex: it.questionIndex !== undefined ? it.questionIndex : idx,
          stem: it.stem || "",
          domain: it.domain || it.domainId || trialPayload.focusDomain || "D1_KEY_IDEAS",
          subSkill: it.subSkill || it.subSkillId || null,
          standard: it.standard || it.standardCode || "ELAGSE5RI1",
          dok: Number(it.dok || it.dokLevel || 2),
          itemType: it.itemType || (idx === 5 ? "EBSR_PART_B" : (idx === 4 ? "EBSR_PART_A" : "STANDARD")),
          isCorrect: firstOk,
          firstTryCorrect: firstOk,
          retryCorrect: retryOk,
          attemptsCount: firstOk ? 1 : 2,
          selectedOptionId: it.selectedOptionId || it.firstTrySelectedLetter || null,
          retrySelectedOptionId: it.retrySelectedOptionId || it.retrySelectedLetter || null,
          correctOptionId: it.correctOptionId || it.correctLetter || null,
          trapType: trap,
          distractorTrapSelected: trap,
          timeSpentSeconds: safeSec,
          impulsiveFlag: impFlag,
          hesitationFlag: hesFlag,
          verifiedSentenceClicked: Boolean(it.verifiedSentenceClicked || it.clickToProveSuccess),
          eliminatedOptions: Array.isArray(it.eliminatedOptions) ? it.eliminatedOptions : []
        };
      });

      const qCount = normalizedItems.length || Number(trialPayload.questionsAttempted) || 6;
      if (normalizedItems.length === 0 && trialPayload.firstTryCorrectCount !== undefined) {
        firstCorrectCount = Number(trialPayload.firstTryCorrectCount);
        retryCorrectCount = Number(trialPayload.retryCorrectCount !== undefined ? trialPayload.retryCorrectCount : firstCorrectCount);
      }

      const firstPct = qCount > 0 ? Number(((firstCorrectCount / qCount) * 100).toFixed(1)) : 0;
      const retryPct = qCount > 0 ? Number(((retryCorrectCount / qCount) * 100).toFixed(1)) : 100;
      const avgSec = qCount > 0 ? Number((totalSeconds / qCount).toFixed(1)) : 0;
      const xpEarned = Number(trialPayload.xpEarned) || ((firstCorrectCount * 15) + Math.max(0, retryCorrectCount - firstCorrectCount) * 8 + 20 + (impCount === 0 ? 10 : 0));

      const trialRecord = {
        trialId: trialId,
        sessionId: trialId,
        studentId: studentId,
        workoutId: trialPayload.workoutId || "w01_tier1_info",
        workoutNumber: Number(trialPayload.workoutNumber) || 1,
        title: trialPayload.title || trialPayload.workoutTitle || "Daily Precision Workout",
        workoutTitle: trialPayload.workoutTitle || trialPayload.title || "Daily Precision Workout",
        genre: trialPayload.genre || "Informational",
        tier: trialPayload.tier !== undefined ? Number(trialPayload.tier) : 1,
        targetLexile: Number(trialPayload.targetLexile) || 960,
        lexileBand: trialPayload.lexileBand || "940L-980L",
        fkgl: Number(trialPayload.fkgl) || 6.3,
        focusDomain: trialPayload.focusDomain || "D4_SYNTAX",
        timestampISO: trialPayload.timestampISO || trialPayload.completedAt || nowIso,
        completedAt: trialPayload.completedAt || trialPayload.timestampISO || nowIso,
        questionsAttempted: qCount,
        firstTryCorrectCount: firstCorrectCount,
        firstTryAccuracyPct: firstPct,
        retryCorrectCount: retryCorrectCount,
        retryAccuracyPct: retryPct,
        totalDurationSeconds: Number(totalSeconds.toFixed(1)),
        avgSecondsPerItem: avgSec,
        impulsiveCount: impCount,
        hesitationCount: hesCount,
        xpEarned: xpEarned,
        sentenceSurgeryCompleted: Boolean(trialPayload.sentenceSurgeryCompleted),
        itemAttempts: normalizedItems,
        items: normalizedItems
      };

      if (!Array.isArray(prog.trialHistory)) prog.trialHistory = [];
      const existingIdx = prog.trialHistory.findIndex(function (t) {
        return t && (t.trialId === trialId || t.sessionId === trialId);
      });
      if (existingIdx !== -1) {
        prog.trialHistory[existingIdx] = trialRecord;
      } else {
        const beforeLen = prog.trialHistory.length;
        prog.trialHistory = deduplicateTrialHistory(prog.trialHistory.concat([trialRecord]));
        if (prog.trialHistory.length > beforeLen) {
          prog.xp = (Number(prog.xp) || 450) + xpEarned;
        }
      }

      const todayStr = nowIso.slice(0, 10);
      if (prog.lastPracticeDate !== todayStr) {
        prog.streakDays = (Number(prog.streakDays) || 5) + 1;
        prog.lastPracticeDate = todayStr;
      }

      if (prog.queuedWorkoutId === trialRecord.workoutId || prog.queuedDomainId === trialRecord.focusDomain) {
        prog.queuedWorkoutId = null;
        prog.queuedDomainId = null;
      }

      recalculateMetricsFromTrials(prog, window.V2State.curriculum, window.V2State.workouts);
      trialRecord.rollingLexileEstimateAfter = prog.estimatedLexile;
      window.V2State.progress = prog;
      cacheProgressLocally(prog);

      try {
        const res = await fetch(`/api/v2/trial?student_id=${encodeURIComponent(studentId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: studentId, trial: trialRecord })
        });
        if (res.ok) {
          const body = await res.json();
          if (body && body.data) {
            window.V2State.progress = recalculateMetricsFromTrials(body.data, window.V2State.curriculum, window.V2State.workouts);
            cacheProgressLocally(window.V2State.progress);
          }
        }
      } catch (e) {
        console.warn("Offline fallback during recordCompletedTrial:", e);
      }

      emitStateUpdate("v2:trialRecorded", { trial: trialRecord, progress: window.V2State.progress });
      emitStateUpdate("v2:stateUpdated", window.V2State);
      return { trial: trialRecord, progress: window.V2State.progress };
    },

    /**
     * Queues a specific workoutId or focusDomain for the child's next session
     * (used by Parent Dashboard 1-click "Queue Targeted Practice").
     */
    async queueWorkoutForNextSession(workoutIdOrDomainId) {
      const studentId = window.V2State.studentId || "lucas";
      const prog = window.V2State.progress || buildDefaultProgress(studentId);
      const workouts = window.V2State.workouts || [];
      const target = String(workoutIdOrDomainId || "").trim();

      let chosenWorkout = null;
      if (DOMAIN_BASELINE_PRIORS[target]) {
        prog.queuedDomainId = target;
        const completed = Array.isArray(prog.completedWorkoutIds) ? prog.completedWorkoutIds : [];
        const targetLex = (Number(prog.estimatedLexile) || 940) + 25;
        const sortByLex = function (a, b) {
          const distA = Math.abs((Number(a.targetLexile) || 960) - targetLex);
          const distB = Math.abs((Number(b.targetLexile) || 960) - targetLex);
          if (distA !== distB) return distA - distB;
          return (Number(a.workoutNumber) || 0) - (Number(b.workoutNumber) || 0);
        };
        const uncompleted = workouts.filter(function (w) {
          return w.focusDomain === target && !completed.includes(w.workoutId);
        }).sort(sortByLex);
        const anyInDomain = workouts.filter(function (w) { return w.focusDomain === target; }).sort(sortByLex);
        chosenWorkout = uncompleted[0] || anyInDomain[0] || null;
        prog.queuedWorkoutId = chosenWorkout ? chosenWorkout.workoutId : null;
      } else {
        chosenWorkout = workouts.find(function (w) { return w.workoutId === target; }) || null;
        prog.queuedWorkoutId = target || null;
        prog.queuedDomainId = chosenWorkout ? chosenWorkout.focusDomain : null;
      }

      window.V2State.progress = recalculateMetricsFromTrials(prog, window.V2State.curriculum, workouts);
      cacheProgressLocally(window.V2State.progress);

      try {
        const res = await fetch(`/api/v2/queue?student_id=${encodeURIComponent(studentId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: studentId,
            target: target,
            workoutId: window.V2State.progress.queuedWorkoutId,
            domainId: window.V2State.progress.queuedDomainId
          })
        });
        if (res.ok) {
          const body = await res.json();
          if (body && body.data) {
            window.V2State.progress = recalculateMetricsFromTrials(body.data, window.V2State.curriculum, workouts);
            cacheProgressLocally(window.V2State.progress);
          }
        }
      } catch (e) {
        console.warn("Offline fallback during queueWorkoutForNextSession:", e);
      }

      emitStateUpdate("v2:stateUpdated", window.V2State);
      return chosenWorkout || this.getRecommendedTodayWorkout();
    },

    /**
     * Deletes a specific trial by trialId and recalculates all progress metrics.
     */
    async deleteTrial(trialId) {
      const studentId = window.V2State.studentId || "lucas";
      const prog = window.V2State.progress || buildDefaultProgress(studentId);
      if (Array.isArray(prog.trialHistory)) {
        let removedOne = false;
        prog.trialHistory = prog.trialHistory.filter(function (t) {
          if (!removedOne && (t.trialId === trialId || t.sessionId === trialId)) {
            removedOne = true;
            return false;
          }
          return true;
        });
      }

      window.V2State.progress = recalculateMetricsFromTrials(prog, window.V2State.curriculum, window.V2State.workouts);
      cacheProgressLocally(window.V2State.progress);

      try {
        const res = await fetch(`/api/v2/trial/${encodeURIComponent(trialId)}?student_id=${encodeURIComponent(studentId)}`, {
          method: "DELETE"
        });
        if (res.ok) {
          const body = await res.json();
          if (body && body.data) {
            window.V2State.progress = recalculateMetricsFromTrials(body.data, window.V2State.curriculum, window.V2State.workouts);
            cacheProgressLocally(window.V2State.progress);
          }
        }
      } catch (e) {
        console.warn("Offline fallback during deleteTrial:", e);
      }

      emitStateUpdate("v2:stateUpdated", window.V2State);
      return window.V2State.progress;
    },

    /**
     * Resets progress back to Lucas's clean 940L Fall G5 official BEACON baseline.
     */
    async resetProgress() {
      const studentId = window.V2State.studentId || "lucas";
      let fresh = buildDefaultProgress(studentId);
      fresh = recalculateMetricsFromTrials(fresh, window.V2State.curriculum, window.V2State.workouts);
      window.V2State.progress = fresh;
      cacheProgressLocally(fresh);

      try {
        const res = await fetch(`/api/v2/reset?student_id=${encodeURIComponent(studentId)}`, {
          method: "POST"
        });
        if (res.ok) {
          const body = await res.json();
          if (body && body.data) {
            window.V2State.progress = recalculateMetricsFromTrials(body.data, window.V2State.curriculum, window.V2State.workouts);
            cacheProgressLocally(window.V2State.progress);
          }
        }
      } catch (e) {
        console.warn("Offline fallback during resetProgress:", e);
      }

      emitStateUpdate("v2:stateUpdated", window.V2State);
      return window.V2State.progress;
    },

    /**
     * Switches active student ("lucas" or "evelyn_mietling") and reloads V2 progress.
     */
    async switchStudent(studentId) {
      const cleanId = String(studentId || "lucas").toLowerCase().replace(/\s+/g, "_");
      window.V2State.studentId = cleanId;
      try {
        localStorage.setItem("beacon_v2_student_id", cleanId);
      } catch (_) {}

      let progData = readCachedProgressLocally(cleanId);
      try {
        const res = await fetch(`/api/v2/progress?student_id=${encodeURIComponent(cleanId)}`);
        if (res.ok) {
          progData = await res.json();
        }
      } catch (e) {
        console.warn("Offline fallback during switchStudent:", e);
      }

      if (!progData) {
        progData = buildDefaultProgress(cleanId);
      }

      window.V2State.progress = recalculateMetricsFromTrials(progData, window.V2State.curriculum, window.V2State.workouts);
      cacheProgressLocally(window.V2State.progress);
      emitStateUpdate("v2:stateUpdated", window.V2State);
      return window.V2State.progress;
    },

    setViewMode(mode) {
      window.V2State.viewMode = mode === "parent" ? "parent" : "student";
      emitStateUpdate("v2:viewModeChanged", window.V2State);
      emitStateUpdate("v2:stateUpdated", window.V2State);
      return window.V2State.viewMode;
    },

    async saveProgress(progressOverride) {
      const studentId = window.V2State.studentId || "lucas";
      const prog = progressOverride || window.V2State.progress || buildDefaultProgress(studentId);
      window.V2State.progress = recalculateMetricsFromTrials(prog, window.V2State.curriculum, window.V2State.workouts);
      cacheProgressLocally(window.V2State.progress);

      try {
        const res = await fetch(`/api/v2/progress?student_id=${encodeURIComponent(studentId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(window.V2State.progress)
        });
        if (res.ok) {
          const body = await res.json();
          if (body && body.data) {
            window.V2State.progress = recalculateMetricsFromTrials(body.data, window.V2State.curriculum, window.V2State.workouts);
            cacheProgressLocally(window.V2State.progress);
          }
        }
      } catch (e) {
        console.warn("Offline fallback during saveProgress:", e);
      }
      emitStateUpdate("v2:stateUpdated", window.V2State);
      return window.V2State.progress;
    }
  };

  window.recalculateMetricsFromTrials = recalculateMetricsFromTrials;
})();
