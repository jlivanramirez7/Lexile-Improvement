# V2 Specification: Easy-to-Track Parent Progress Telemetry & Minimalist Child-Friendly UI (Topics 6 & 7)

## 1. Executive Audit of V1 (`index.html` & `main.py`)

An audit of V1's frontend ([`app/static/index.html`](file:///usr/local/google/home/ivanramirez/.gemini/jetski/scratch/drc-beacon-ela-app/app/static/index.html)) and persistence schema ([`app/main.py`](file:///usr/local/google/home/ivanramirez/.gemini/jetski/scratch/drc-beacon-ela-app/app/main.py)) reveals two core architectural anti-patterns that V2 must eliminate:

| Area | V1 Implementation Flaw | V2 Corrective Mandate |
| :--- | :--- | :--- |
| **Child View Cognitive Load** | Exposes 20 daily mission cards + 10 CAT cards on one scrolling screen with dense descriptions, Lexile bands, and adult banners (*"DRC BEACON CAT Algorithm Simulation"*). | **1-Click Launchpad**: Single hero *"Today's Practice"* button, visual streak (`🔥`), clean level bar, and 2–3 word icon cards. |
| **Psychometric Jargon in Child UI** | Question badges show *"🎯 Pillar 3: Evidence-Based Extraction"*, *"🔬 DOK 2: Syntax Deconstruction"*, and mid-test CAT modals show *"Standard Error (SEM): Narrowing to ±15L"*. | **Zero Psychometric Jargon**: Banish all DOK, Pillar, Lexile, and SEM labels from the student screen; move 100% of diagnostics to the Parent Dashboard. |
| **Post-Answer Feedback Verbosity** | Displays *"⚠️ Distractor Trap Triggered! Diagnostic Misconception: Passive Voice Subject Confusion"* with 50+ word adult grammatical paragraphs. | **Visual Micro-Feedback**: Color badge + auto-highlighted proving sentence in the left passage + max 25-word child-friendly tip. |
| **Parent Dashboard Scatter** | Spreads 8+ verbose panels vertically; hardcodes a static *"835L from 3rd grade"* string; overwrites past attempts in `missionSubmissions[m.id]`; only tracks lifetime cumulative counters in `DEFAULT_PROGRESS`. | **3-Second Executive Scan + Append-Only Telemetry**: Official 5-test BEACON anchor (`835L → 940L`), Traffic-Light Skill Matrix, Top Weakness Alert card, and append-only session/item logs. |

---

## 2. Topic 6 — Easy-to-Track Parent Progress & Diagnostic Telemetry System

The V2 Parent Dashboard is designed around a **3-Second Executive Scan** at the top of the page, backed by an append-only item-level telemetry schema and a drill-down longitudinal log below.

### 2.1 At-a-Glance Executive Summary (3-Second Parent Scan)

The top viewport of the Parent Dashboard consists of **three high-signal visual blocks** with zero scrolling required:

#### A. Longitudinal Lexile Trajectory & Official BEACON Anchor Header
Displays Lucas's complete official Nickajack Elementary DRC BEACON history alongside his live V2 Rolling Estimated Lexile (weighted over the last 20–30 items / last 4 sessions) and the Dickerson Middle School Advanced Content (AC) qualifying line:

```text
[Official DRC BEACON Anchor History]                        [Live V2 Rolling Estimate]       [Dickerson AC Target]
835L (Fall '24) → 840L → 830L → 800L → 940L (09/01/2026)  ===>   1015L (±20L) [▲ +75L]    ===>   🎯 1075L+ Goal (60L to go)
```

- **Status Pill**: Automatically computes gap to `1075L`:
  - 🟢 **QUALIFIED RANGE** (`Rolling Estimate ≥ 1075L`)
  - 🟡 **ON TRACK / APPROACHING** (`980L – 1074L`)
  - 🔴 **NEEDS ACCELERATION** (`< 980L`)

#### B. Traffic-Light Skill Mastery Matrix
Replaces V1's synthetic "Three Pillars" with an instant **Traffic-Light Grid** across every Grade 5 DRC BEACON reading skill category, segmented by **Genre (Literary vs. Informational)** over a rolling 14-day / 4-session window (with lifetime toggle):

- 🟢 **Mastered (`≥ 85%` first-try accuracy)**
- 🟡 **Developing (`65% – 84%` first-try accuracy)**
- 🔴 **Needs Practice (`< 65%` first-try accuracy)**
- ⚪ **Untested (`< 3` items attempted)**

| BEACON Skill Category | Literary (Fiction / Poetry) | Informational (Science / History) | Combined Status |
| :--- | :---: | :---: | :---: |
| **1. Key Ideas & Explicit Details (DOK 1–2)** | 🟢 92% (11/12) | 🟢 88% (14/16) | 🟢 Mastered |
| **2. Theme, Central Idea & Summary (DOK 2–3)** | 🟢 86% (6/7) | 🟡 75% (6/8) | 🟡 Developing |
| **3. Contextual & Tier 2 Vocabulary (DOK 2)** | 🟢 90% (9/10) | 🟡 78% (7/9) | 🟡 Developing |
| **4. Complex Syntax & Passive Voice (DOK 2)** | 🟡 80% (4/5) | 🔴 60% (6/10) | 🔴 Needs Practice |
| **5. Text Structure & Author's Craft (DOK 2–3)** | 🟡 75% (6/8) | 🔴 56% (5/9) | 🔴 Needs Practice |
| **6. EBSR Paired Evidence (Part A + Part B Link)** | 🟡 71% (5/7) | 🔴 58% (7/12) | 🔴 Needs Practice |

#### C. Top "Actionable Weakness Alert" Card
An automated diagnostic banner that ranks all skills/traps with `≥ 4` recent attempts and surfaces the single highest-priority bottleneck in plain English, paired with a 1-click action:

> 🔴 **Actionable Weakness Alert**: **Informational Text Structure & EBSR Part B Proof Selection** — **58% accuracy** over the last 4 daily sessions (triggered *"Intuition Without Line Proof"* 4 times).
> **[ 🎯 Queue Targeted Next Practice ]**  **[ 🔍 View 5 Missed Questions ]**

---

### 2.2 Daily Practice & Trial Recording Schema

V2 replaces V1's destructive dictionary overwrite (`missionSubmissions[m.id]`) with an **append-only session and item telemetry log** in `app/main.py` (persisted to Firestore / local JSON). Every daily practice (5–6 items) and mock benchmark trial (15-item CAT) records the following exact schema:

```json
{
  "sessionId": "sess_20261004_173012_lucas",
  "studentId": "lucas",
  "sessionType": "daily_practice",
  "timestampISO": "2026-10-04T17:30:12Z",
  "passageIds": ["pass_info_mars_telemetry_01"],
  "genre": "Informational",
  "targetLexile": 1020,
  "fkgl": 6.4,
  "questionsAttempted": 5,
  "firstTryCorrectCount": 4,
  "firstTryAccuracyPct": 80.0,
  "retryCorrectCount": 5,
  "retryAccuracyPct": 100.0,
  "totalDurationSeconds": 195,
  "avgSecondsPerItem": 39.0,
  "impulsivityFlagsCount": 0,
  "hesitationFlagsCount": 1,
  "rollingLexileEstimateAfter": 1015,
  "items": [
    {
      "itemId": "item_m1_q4_partA",
      "passageId": "pass_info_mars_telemetry_01",
      "questionIndex": 3,
      "standardCode": "ELAGSE5RI1",
      "skillCategory": "ebsr_paired_evidence",
      "dokLevel": 3,
      "isEbsrPartA": true,
      "isEbsrPartB": false,
      "ebsrPairId": "pair_m1_q4_q5",
      "ebsrLinkSuccess": false,
      "firstTrySelectedLetter": "A",
      "retrySelectedLetter": "B",
      "correctLetter": "B",
      "firstTryCorrect": false,
      "retryCorrect": true,
      "timeSpentSeconds": 6.2,
      "impulsivityFlag": true,
      "hesitationFlag": false,
      "distractorTrapSelected": "outside_knowledge",
      "eliminatedOptions": ["D"],
      "highlightedSentenceIds": ["p3_s2"]
    }
  ]
}
```

#### Core Telemetry Rules & Thresholds
1. **First-Try vs. Retry Accuracy**:
   - In Daily Practice mode, if a child misses on the first try, they get 1 guided retry (`Amber Retry`).
   - **First-Try Accuracy** drives the Lexile estimator and Traffic-Light Matrix; **Retry Accuracy** measures learning responsiveness to micro-feedback.
2. **Pacing & Behavioral Flags**:
   - **Impulsivity Flag (`timeSpentSeconds < 8.0s`)**: Triggered when a student locks in an answer without reading the stem/evidence.
   - **Hesitation Flag (`timeSpentSeconds > 90.0s`)**: Triggered when a student stalls on dense syntax or competing distractors.
3. **EBSR Link Success (`ebsrLinkSuccess`)**:
   - Evaluated across paired items (`Part A` + `Part B`):
     - `BOTH_CORRECT` (`ebsrLinkSuccess = true`)
     - `PART_A_ONLY` (*"Intuition Without Proof"* — guessed claim, missed verbatim quote)
     - `PART_B_ONLY` (*"Quote Found, Claim Misread"*)
     - `BOTH_WRONG`
4. **Distractor Trap Taxonomy (`distractorTrapSelected`)**:
   - Standardized codes recorded on every incorrect first attempt:
     - `passive_subject_confusion` (inverted syntax / modifier confusion)
     - `outside_knowledge` (plausible real-world fact not in passage)
     - `verbatim_word_trap` (uses exact passage words to make a false claim)
     - `too_narrow_detail` (picks a minor detail instead of central idea)
     - `unsupported_inference` (leaps beyond explicit text evidence)
     - `vocabulary_context_slip` (picks common meaning instead of contextual meaning)

---

### 2.3 Longitudinal Trend & Trial Log (Parent Drill-Down)

Below the 3-Second Executive Summary, the Parent Dashboard provides a clean, unified **Longitudinal Practice & Benchmark Log** with two tabs (`📅 Daily Practice Log` and `🏆 Official & Mock Benchmark Trials`):

| Date / Time | Session Type | Passage Title & Genre | Target Difficulty | First-Try Score | Retry Score | Avg Pace & Flags | Est. Lexile | Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Oct 04, 5:30 PM** | 📅 Daily Practice | *Mars Rover Telemetry* (Info) | `1020L` (FK 6.4) | **4/5 (80%)** | 5/5 (100%) | `39s/q` • ⚡ 1 Rush | `1015L` | `[🔍 Inspect]` |
| **Oct 03, 4:15 PM** | 🏆 Mock CAT #2 | *3-Stage Adaptive Trial* (Mixed) | `920L → 1110L` | **13/15 (87%)** | — | `44s/q` • Clean | `1060L` | `[🔍 Inspect]` |
| **Sep 01, 2026** | 🏛️ **Official BEACON** | *Nickajack ES Fall Administration* | *Official CAT* | **Scaled: 940L** | — | *Official Anchor* | **`940L`** | `[📌 Baseline]` |

#### 1-Click Drill-Down Drawer (`[🔍 Inspect]`)
Clicking `[🔍 Inspect]` on any row opens a side-by-side **Parent Inspection Drawer** showing:
1. **Exact Passage Text** with the proving sentences highlighted and any sentences the student highlighted during practice.
2. **Question-by-Question Audit Cards**:
   - Question stem + Standard (`ELAGSE5RI1`) + DOK level (`DOK 3`).
   - **Student's 1st Choice** (e.g., `❌ Choice A — Triggered: Outside Knowledge Trap`) and **Retry Choice** (`✅ Choice B`).
   - **Correct Answer** with concise psychometric rationale.
   - **Item Telemetry Pill**: `⏱️ 6.2s (⚡ Impulsive Rush Flag)` + options crossed out by the student (`✂️ Eliminated: D`).

---

## 3. Topic 7 — Simple, Child-Friendly UI with Minimal Words

The V2 Student View is engineered for a 10-year-old 5th grader. It enforces low visual noise, zero adult test-prep anxiety, and tactile, game-like clarity while building authentic DRC INSIGHT test-taking habits.

### 3.1 Core Child UI Design Rules

1. **The "Zero-Fluff" Rule (1–3 Words Max per UI Control)**:
   - Outside of the **reading passage**, **question stem**, and **answer choices (A/B/C/D)**, every button, tab, and badge must contain **1 to 3 words maximum**, always paired with an intuitive icon.
   - *Examples*: `▶️ Start Today`, `🖍️ Highlight`, `A-` / `A+`, `◀ Back`, `✓ Check`, `Next ▶`, `💡 Hint`.
2. **Total Ban on Psychometric Jargon in the Child View**:
   - **NEVER display** in the child view: `Lexile`, `940L`, `1075L`, `FKGL`, `DOK 1/2/3`, `Pillar 1/2/3`, `Syntactic Deconstruction`, `Tier 2 Vocabulary`, `EBSR`, `SEM ±15L`, `Distractor Trap`, `Passive Voice Confusion`, or `Dickerson Middle School AC Criteria`.
   - ** NEVER show** the mid-test `cat-routing-modal` (*"Stage Routing in Progress... Narrowing SEM to ±15L"*). In adaptive trials, stage transitions happen seamlessly in `<200ms` with a simple `"✨ Part 2 of 3"` toast.
3. **Strict Mode Separation**:
   - The `📊 Parent` dashboard button is tucked discreetly into the top-right corner as a small icon-pill (`🔒 Parent`) so the child workspace remains 100% focused on reading.

---

### 3.2 Screen-by-Screen Minimalist Child Flow

#### Screen 1: Home / Daily Launchpad
Replaces V1's 30-card scrolling wall with a focused, single-screen launchpad:

```text
+-----------------------------------------------------------------------------------+
| ⚡ BEACON Reading                     🔥 5 Days   ⭐ Level 4 [██████░░]   🔒 Parent |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |  🚀 TODAY'S READING                                        ⏱️ ~5 Mins     |   |
|   |                                                                           |   |
|   |  🛰️ Secrets of the Mars Rover                                             |   |
|   |                                                                           |   |
|   |                     [ ▶️  START TODAY'S PRACTICE ]                        |   |
|   +---------------------------------------------------------------------------+   |
|                                                                                   |
|   More Adventures                                                                 |
|   +-----------------------+  +-----------------------+  +-----------------------+ |
|   | 🏰 Castle Stone       |  | 🏊‍♂️ Olympic Water      |  | 🏆 Full Challenge     | |
|   |    [ ▶️ Play ]        |  |    [ ▶️ Play ]        |  |    [ ▶️ Start ]       | |
|   +-----------------------+  +-----------------------+  +-----------------------+ |
+-----------------------------------------------------------------------------------+
```

- **Top Bar**: App icon + name (`⚡ BEACON Reading`), visual streak counter (`🔥 5 Days`), simple level progress bar (`⭐ Level 4`), and discreet `🔒 Parent` switch.
- **Primary Action**: One giant, high-contrast button (`▶️ Start Today's Practice`) pre-loaded with the adaptive engine's next recommended passage. **1 click from app open to reading.**
- **Secondary Cards**: Up to 3 clean icon cards with a 2–3 word title and a 1-word button (`▶️ Play` or `✓ Done`). No multi-line descriptions or Lexile tags.

---

#### Screen 2: Split-Screen Reading & Question View (Mirroring DRC INSIGHT)
Mirrors the official Georgia DRC INSIGHT split-screen layout so Lucas builds muscle memory for numbered paragraphs, text highlighting, and option elimination:

```text
+-----------------------------------------------------------------------------------+
| ✖ Exit                  🛰️ Secrets of the Mars Rover              🟢 🟢 🔵 ⚪ ⚪ |
+-----------------------------------------+-----------------------------------------+
| [🖍️ Highlight]  [🧹 Clear]   [A-] [A+]  | Question 3 of 5                         |
|-----------------------------------------|                                         |
|                                         | Why does the team pack each data file   |
| [1] Deep inside Jezero Crater on Mars,  | before sending it to Earth?             |
| the Perseverance rover travels across   |                                         |
| the dry ground. The robot must send     | +-------------------------------------+ |
| facts back to Earth through satellites. | | (A) To stop giant dust storms from  | |
| However, ==giant dust storms often===   | |     blocking the signal.        [✕] | |
| ==block radio beams and cause delays.== | +-------------------------------------+ |
| To fix this signal loss, the team       | +-------------------------------------+ |
| builds smart tools that pack each data  | | (B) To hide secret maps from other  | |
| file before it leaves the red planet.   | |     space teams.                [✕] | |
|                                         | +-------------------------------------+ |
| [2] The data packets, packed with soil  | +-------------------------------------+ |
| tests and battery records, were         | | (C) ~~To cool down the rover's~~    | |
| carefully scrutinized by flight         | |     ~~wheels on sharp rocks.~~  [↩] | |
| controllers to spot any anomalous       | +-------------------------------------+ |
| heat spikes...                          | +-------------------------------------+ |
|                                         | | (D) To change the color of radio    | |
|                                         | |     beams in space.             [✕] | |
|                                         | +-------------------------------------+ |
|                                         |                                         |
|                                         | [ ◀ Back ]     [ ✓ Check ]     [Next ▶] |
+-----------------------------------------+-----------------------------------------+
```

- **Clean Left Pane (Passage)**:
  - **Numbered Paragraphs**: Clean `[1]`, `[2]`, `[3]` badges inline at the start of each paragraph (instead of bracketed `[Paragraph 1]` text strings).
  - **1-Click Highlighter (`🖍️ Highlight`)**: Selecting text or clicking a sentence while `🖍️ Highlight` is active applies a soft yellow highlight—training the child to mark proof before answering.
  - **Typography Controls (`A-` / `A+`)**: Instant 3-step font scaling (`16px` / `18px` / `20px`) with generous `1.75` line height.
  - **Tap-for-Meaning Words**: Dotted-underline words open a 1-sentence kid-friendly definition popover (max 15 words).
- **Clean Right Pane (Question & Tools)**:
  - **Visual Progress Dots**: 5 clean dots in the top bar (`🟢` correct, `🟡` retry correct, `🔵` current, `⚪` upcoming).
  - **2-Part Question Link (Part B)**: When on a Part B evidence question, displays a compact header pill: `📌 Your Part A Pick: "[Selected Text]"` so the student never has to click `◀ Back` to remember their Part A answer.
  - **1-Click Option Eliminator (`[✕]`)**: Every A/B/C/D card has a small `[✕]` icon on the right. Clicking it dims the card (`opacity-40`) and strikes through the text—mirroring the DRC INSIGHT Striker/Eliminator tool.
  - **Minimalist Action Bar**: Only `◀ Back`, `✓ Check`, and `Next ▶`.

---

#### Screen 3: Concise Micro-Feedback Card & Auto-Highlighted Proof
In **Daily Practice Mode**, clicking `✓ Check` triggers immediate, low-friction visual feedback:

1. **State A — First-Try Correct (`🟢 Nice Job!`)**:
   - Option card turns **Emerald Green** (`✓`).
   - **Auto-Highlight Proof**: The exact proving sentence in the left passage pane automatically pulses and highlights in green (`#10b981/25`) and scrolls into view.
   - **Micro-Tip (Max 25 Words)**: A 1–2 sentence child-friendly confirmation.
     - *Example*: `"Spot on! Paragraph 1 shows that packing the data files stops giant dust storms from blocking the signal."` (18 words)
2. **State B — First-Try Incorrect (`🟡 Try One More Time!`)**:
   - Selected option dims with an amber border (`🟡 Not quite`), leaving the remaining 3 choices active for **1 retry**.
   - **Auto-Spotlight Paragraph**: Gently scrolls the left passage to the target paragraph (e.g., pulses `[2]`) and shows a 1-sentence hint (max 20 words):
     - *Example*: `"Look closely at Paragraph 2: Who is doing the action after the words 'scrutinized by'?"` (15 words)
3. **State C — Second-Try Resolved**:
   - Reveals the green correct answer, auto-highlights the exact proving sentence in the passage, and shows the concise `<25-word` explanation with a `Next ▶` button.

*(Note: In **Mock Benchmark Trial Mode**, immediate feedback and retries are disabled to mirror authentic DRC BEACON testing—clicking `Next ▶` records the answer silently and advances to the next item.)*
