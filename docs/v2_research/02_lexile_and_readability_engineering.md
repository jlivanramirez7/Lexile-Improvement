# Lexile Psychometrics, Multi-Metric Readability Assessment (Grades 5–7), and BEACON Passage Generation Engineering

## 1. Executive Audit of V1 Passage Calibration & Architectural Findings

An empirical audit of all **110 reading passages** in V1 ([`app/static/index.html`](file:///usr/local/google/home/ivanramirez/.gemini/jetski/scratch/drc-beacon-ela-app/app/static/index.html))—spanning `MISSIONS_DATA` (Missions 1–20), `ADAPTIVE_CAT_ELA_ASSESSMENTS` (10 CAT exams × 6 stages = 60 passages), and `FULL_LENGTH_ELA_ASSESSMENTS` (10 exams × 3 passages = 30 passages)—combined with git history analysis (`ecd77f17`, `0a5fc375`, `53245eea`, `5a2cd7f9`, `660b4ef1`) reveals key psychometric lessons for V2:

| V1 Corpus Segment | Passage Count | Target Lexile Range | Word Count (Min / Mean / Max) | Paragraphs | MLS (Min / Mean / Max) | ASW (Mean) | FKGL (Min / Mean / Max) | ARI (Mean) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Missions 1–20** (`MISSIONS_DATA`) | 20 | 940L – 1150L | 144 / 184.6 / 211 | 3 | 12.00 / 13.74 / 14.93 | 1.45 | **5.94 / 6.87 / 7.69** | 9.10 |
| **CAT Adaptive Stages** (`ADAPTIVE_CAT_ELA`) | 60 | 770L – 1180L | 125 / 164.8 / 201 | 3 | 8.27 / 11.45 / 15.20 | 1.48 | **4.45 / 6.13 / 7.32** | 7.85 |
| **Full-Length Exams** (`FULL_LENGTH_ELA`) | 30 | 842L – 1020L | 152 / 167.1 / 219 | 3 | 11.20 / 13.04 / 16.00 | 1.44 | **5.77 / 6.39 / 6.73** | 8.42 |
| **All V1 Passages Combined** | **110** | **770L – 1180L** | **125 / 169.0 / 219** | **3** | **8.27 / 12.30 / 16.00** | **1.46** | **4.45 / 6.34 / 7.69** | **8.23** |

### Key Findings from V1's Calibration History
1. **The Pre-Calibration "LLM Lexile Trap" (`0a5fc375`)**: Before commit `0a5fc375`, prompting an LLM for a "920L Mars Rover passage" produced graduate-level technical prose (*"Although high-frequency radio waves travel at the speed of light, signal propagation is frequently degraded by atmospheric dust storms that absorb electromagnetic radiation..."*) with **MLS = 21.67**, **ASW = 2.12** (20.8% polysyllabic words), and **FKGL = 17.88**.
2. **How V1 Solved FKGL Drift (`660b4ef1`)**: V1 constrained average syllables per word (**ASW = 1.36–1.54**) and mean sentence length (**MLS = 12.0–14.9 words**), while embedding **one deliberate 22–33 word "Monster Sentence"** in Paragraph 2 (combining passive voice + a participial/relative distractor clause) for Pillar 1 syntax testing, and **3–4 inline Tier 2 vocabulary words** (`showTier2(...)`) for Pillar 2 context-clue testing.
3. **V1 UI Formula ([`getFKGFromLexile`](file:///usr/local/google/home/ivanramirez/.gemini/jetski/scratch/drc-beacon-ela-app/app/static/index.html#L39298-L39305))**: V1 maps reported Lexile to a display FKG badge via a linear heuristic (`FKG = clamp(4.2, 8.8, (Lexile - 250) / 115 + 0.5)`), rather than computing true passage readability metrics dynamically.
4. **Three Structural Deficits in V1 That V2 Must Fix**:
   - **Passage Length Deficit**: All 110 V1 passages are micro-passages (**125–219 words**, 3 paragraphs). Authentic Grade 5–7 DRC BEACON passages are **350–550 words across 4–6 numbered paragraphs**, which is required to test multi-paragraph structural progression (`ELAGSE5RI5`/`RL5`) and cross-paragraph evidence synthesis.
   - **Syntactic Under-Length in CAT High Stages**: Several V1 CAT `1180L` passages achieved low FKGL by chopping sentences to **MLS 8.3–10.0 words**, which contradicts the syntactic axiom of the Lexile Framework.
   - **Genre Imbalance in Missions**: 19 of 20 V1 Missions are Informational Science/Technology; only 1 (`mission-2`) is Literary/Narrative. DRC BEACON requires an approximate **45% Literary / 55% Informational** balance.

---

## 2. Psychometric & Linguistic Anatomy of Target Lexile Bands (700L–1185L)

Under MetaMetrics' Lexile Framework for Reading (Stenner et al., 2006), text complexity is governed by two orthogonal dimensions in the theoretical regression equation:

$$\text{Lexile} = 582 + 1768 \cdot \log_{10}(\text{MLS}) - 386 \cdot \overline{\text{WFi}}$$

where **$\text{MLS}$** is Mean Length of Sentence (syntactic demand) and **$\overline{\text{WFi}}$** is the mean log word frequency per 5-million-word corpus (semantic demand; lower $\overline{\text{WFi}}$ = rarer vocabulary = higher Lexile).

### Multi-Band Linguistic Specification Matrix

| Metric / Linguistic Feature | **700L – 830L**<br>*(Late 3rd / Early 4th)*<br>CAT Easy / Scaffold Floor | **830L – 940L**<br>*(Mid 4th / Early 5th)*<br>Lucas Baseline (**940L**) | **940L – 1010L**<br>*(Upper 5th Stretch)*<br>Grade 5 Mastery Zone | **1010L – 1100L**<br>*(6th Grade / AC Target)*<br>Cobb County AC (**$\ge 1075\text{L}$**) | **1100L – 1185L**<br>*(7th Grade / BEACON Ceiling)*<br>CAT Elite Stage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Target FKGL Guardrail** | **4.5 – 5.4** | **5.2 – 6.2** | **6.0 – 6.8** | **6.6 – 7.4** | **7.0 – 7.8** *(Hard Cap < 8.0)* |
| **New Dale-Chall (NDC)** | 4.9 – 5.6 | 5.5 – 6.1 | 6.0 – 6.6 | 6.5 – 7.0 | 6.9 – 7.4 |
| **Automated Readability (ARI)** | 4.8 – 6.2 | 6.0 – 7.5 | 7.2 – 8.5 | 8.2 – 9.3 | 8.8 – 9.8 |
| **Coleman-Liau Index (CLI)** | 6.2 – 7.8 | 7.5 – 9.2 | 8.8 – 10.4 | 9.8 – 11.2 | 10.5 – 11.8 |
| **Mean Sentence Length (MLS)** | **10.5 – 12.5 words** | **12.5 – 14.0 words** | **13.8 – 15.2 words** | **15.0 – 16.5 words** | **16.2 – 18.0 words** |
| **Avg Syllables / Word (ASW)** | 1.30 – 1.38 | 1.36 – 1.43 | 1.42 – 1.47 | 1.45 – 1.51 | 1.48 – 1.54 *(Cap 1.55)* |
| **Polysyllabic Words ($\ge 3$ syl)** | 5.0% – 7.5% | 7.0% – 9.5% | 9.0% – 11.5% | 10.5% – 13.0% | 12.0% – 14.5% |
| **Tier 2 Academic Density** | 1.5 – 2.5 per 100 words | 2.5 – 3.5 per 100 words | 3.5 – 4.5 per 100 words | 4.5 – 5.5 per 100 words | 5.5 – 6.8 per 100 words |
| **Mean Zipf Word Freq ($\bar{Z}$)** | 5.35 – 5.55 | 5.20 – 5.35 | 5.08 – 5.22 | 4.95 – 5.10 | 4.82 – 4.98 |
| **Subordinate Clauses / Sent** | 0.20 – 0.35 | 0.35 – 0.50 | 0.50 – 0.65 | 0.65 – 0.85 | 0.80 – 1.05 |
| **"Monster Sentence" Budget** | 1 sent (18–20 words) | 1 sent (20–23 words) | 1–2 sents (22–25 words) | 2 sents (24–27 words) | 2 sents (25–29 words) |

---

### Detailed Band Breakdown: Semantic vs. Syntactic Demand

#### Band 1: 700L–830L (Late 3rd / Early 4th Grade — Diagnostic Floor & CAT Stage 2 Easy)
* **Semantic Demand**: High-frequency concrete Tier 1 vocabulary (Zipf $\ge 5.35$). Tier 2 words are concrete, high-utility verbs/adjectives (*observe, delicate, sturdy,eager, vanish*) with immediate synonym or action clues in the same sentence. Tier 3 terms (maximum 1–2 per passage) are explicitly defined via direct statement (*"This glowing light is called bioluminescence."*).
* **Syntactic Demand**: Predominantly simple (SVO) and basic compound sentences joined by coordinating conjunctions (*and, but, so*). Subordinate clauses are limited to initial time/cause markers (*When the sun set, ...*, *Because the water was cold, ...*). Zero passive voice except in the single 18–20 word target sentence.

#### Band 2: 830L–940L (Mid 4th / Early 5th Grade — Lucas's Transition Zone; Baseline 940L on 09/01/2026)
* **Semantic Demand**: Shift from concrete physical descriptors to foundational Tier 2 academic verbs and modifiers (*regulate, scrutinized, scarce, preserve, reluctant, formidable*). Polysemous words (*channel, current, scale, harbor*) begin appearing in non-primary senses. Tier 3 terms are scaffolded within the sentence using appositives or *or*-clauses.
* **Syntactic Demand**: MLS rises to **12.5–14.0 words**. Sentences regularly incorporate 1 dependent clause (*although, while, since*) or an introductory prepositional/participial phrase. Contains **1 deliberate "Monster Sentence" (20–23 words)** featuring passive voice (*were carefully evaluated by...*) separated from its subject by a short modifier.

#### Band 3: 940L–1010L (Upper 5th Grade Stretch Band — Core Grade-Level Mastery)
* **Semantic Demand**: Dense Tier 2 academic vocabulary (**3.5–4.5% of tokens**; e.g., *impede, feasible, calibrate, facilitate,indispensable, subtle, resilient, apprehensive*). Context clues shift from same-sentence synonyms to **contrasting clauses** (*Unlike the brittle outer crust, the mantle remains malleable...*) or cause-and-effect implications across adjacent sentences.
* **Syntactic Demand**: MLS reaches **13.8–15.2 words**. Frequent use of restrictive/non-restrictive relative clauses (*which, whose, where*) and mid-sentence appositives. Includes **1–2 Monster Sentences (22–25 words)** where a passive verb phrase follows a multi-word participial distractor phrase (testing whether the student confuses the object of the modifier with the true actor).

#### Band 4: 1010L–1100L (6th Grade / Cobb County AC Placement Target $\ge 1075\text{L}$)
* **Semantic Demand**: Abstract Tier 2 conceptual nouns and precision verbs (**4.5–5.5% of tokens**; e.g., *equilibrium, susceptible, attenuate, discern, mitigate, autonomous, candid, bolster, discrepancy*). Domain-specific Tier 3 terms require **cross-sentence inference** (the definition is implied by describing how the mechanism functions in the next sentence rather than stated via *"is called"*).
* **Syntactic Demand**: MLS reaches **15.0–16.5 words**. Logical transitions move from simple conjunctions to conjunctive adverbs and subordinators (*consequently, nevertheless, whereas, provided that*). Includes **2 Monster Sentences (24–27 words)** featuring stacked prepositional phrases, fronted dependent clauses, or passive-voice constructions with delayed by-agents.

#### Band 5: 1100L–1185L (7th Grade / Advanced 5th Grade Ceiling on DRC BEACON)
* **Semantic Demand**: High-precision academic and literary lexicon (**5.5–6.8% Tier 2 density**; e.g., *unprecedented, imperceptible, encapsulate, permeable, dissipate, decentralized, trajectory, vindicate, ambivalence*). Nuanced connotation contrasts (e.g., *thrifty* vs. *stingy*, *cautious* vs. *timid*, *speculate* vs. *verify*) are central to answering Pillar 2 items.
* **Syntactic Demand**: MLS reaches **16.2–18.0 words** while holding **ASW $\le 1.54$** so FKGL never exceeds **7.8**. Syntactic complexity is driven by **clause architecture**—nominal clauses (*What puzzled the researchers most was...*), embedded participial modifiers, and balanced parallel structures—not by stuffing 5-syllable bureaucratic words into every sentence.

---

## 3. Multi-Metric Readability Guardrail Suite (Preventing "LLM Lexile Drift")

### Why Lexile Alone Is Gamed or Drifted by LLMs
When an LLM is prompted to *"Write a passage at 1100L"*, it defaults to adult academic/journalistic training distributions. Look at the mathematical sensitivity of **Flesch-Kincaid Grade Level (FKGL)** versus **MetaMetrics Lexile**:

$$\text{FKGL} = 0.39 \cdot \text{MLS} + 11.8 \cdot \text{ASW} - 15.59$$

Notice the ratio of weights in FKGL: **$11.8 / 0.39 = 30.26$**. Increasing Average Syllables per Word ($\text{ASW}$) by just $+0.30$ syllables/word (e.g., from $1.45$ to $1.75$ via Latinate nominalizations like *characterization, implementation, electromagnetic, interconnectedness*) spikes FKGL by **$+3.54$ full grade levels**! Meanwhile, the Lexile equation ($\text{Lexile} = 582 + 1768 \cdot \log_{10}(\text{MLS}) - 386 \cdot \overline{\text{WFi}}$) does **not** count syllables at all—it measures **$\log_{10}(\text{MLS})$** and **word rarity ($\overline{\text{WFi}}$)**.

> [!IMPORTANT]
> **The Golden Engineering Rule for 940L–1185L Passages at Grade 5–7 FKGL (< 7.8):**
> Drive Lexile upward using **controlled sentence length ($\text{MLS} = 14.0\text{–}18.0$)** and **compact 2–3 syllable Tier 2 words** (*impede, discern, bolster, feasible, candid, mitigate, arduous, scarce*), while **strictly capping Average Syllables per Word ($\text{ASW} \le 1.54$) and Polysyllabic Word Density ($\le 14.5\%$)**.

### Exact Formulas for the V2 Readability Guardrail Suite

Let $W$ = total words, $S$ = total sentences, $C$ = total alphanumeric characters, $Y$ = total syllables, $Y_{\ge 3}$ = words with $\ge 3$ syllables, $D_{\text{NDC}}$ = words absent from the 3,000-word New Dale-Chall familiar word list (or Tier 2/3 rare tokens with Zipf $< 4.6$), and $\overline{Z}$ = mean word frequency on the Zipf scale ($\log_{10}$ occurrences per billion words, where common words like *the* $\approx 7.7$, Grade 5 baseline words $\approx 5.2$, and Tier 2 words $\approx 3.4\text{–}4.5$):

1. **Mean Length of Sentence ($\text{MLS}$)** & **Average Syllables per Word ($\text{ASW}$)**:
   $$\text{MLS} = \frac{W}{S}, \qquad \text{ASW} = \frac{Y}{W}$$

2. **Flesch-Kincaid Grade Level ($\text{FKGL}$)** — *Primary Grade-Appropriateness Guardrail*:
   $$\text{FKGL} = 0.39 \left(\frac{W}{S}\right) + 11.8 \left(\frac{Y}{W}\right) - 15.59$$
   * **V2 Target**: **5.2 – 7.8** across 830L–1185L (**Hard Ceiling: $< 8.0$**).

3. **Calibrated Lexile Proxy ($\hat{L}_{\text{V2}}$)** — *Syntactic + Semantic Dual-Axis Estimator*:
   Using the Stenner log-sentence-length term paired with lexical rarity ($R = \text{fraction of Tier 2/rare tokens with Zipf } < 4.5$ or $\ge 3$ syllables excluding common suffixes) and ASW:
   $$\hat{L}_{\text{V2}} = \text{round}\Big(540 + 1120 \cdot \log_{10}(\text{MLS}) + 950 \cdot (\text{ASW} - 1.30) + 1450 \cdot R\Big)$$
   * **V2 Target**: Within **$\pm 35\text{L}$** of the passage's target Lexile badge.

4. **Automated Readability Index ($\text{ARI}$)** — *Character-Length Orthographic Guardrail*:
   $$\text{ARI} = 4.71 \left(\frac{C}{W}\right) + 0.5 \left(\frac{W}{S}\right) - 21.43$$
   * **V2 Target**: **6.0 – 9.8** (prevents long compound/technical character strings).

5. **Coleman-Liau Index ($\text{CLI}$)**:
   $$\text{CLI} = 0.0588 \left(\frac{100 \cdot C}{W}\right) - 0.296 \left(\frac{100 \cdot S}{W}\right) - 15.8$$
   * **V2 Target**: **7.5 – 11.8**.

6. **New Dale-Chall Readability Formula ($\text{NDC}$)** — *Vocabulary Familiarity Guardrail*:
   $$\text{NDC}_{\text{raw}} = 0.1579 \left(\frac{100 \cdot D_{\text{NDC}}}{W}\right) + 0.0496 \left(\frac{W}{S}\right) + \begin{cases} 3.6365 & \text{if } (D_{\text{NDC}}/W) > 0.05 \\ 0 & \text{otherwise} \end{cases}$$
   * **V2 Target**: **5.5 – 7.4** (corresponds to Grade 5–6 at 5.0–5.9, Grade 7–8 at 6.0–6.9, and early Grade 9 ceiling at 7.0–7.4).

---

## 4. Structural, Syntactic & Developmental Blueprints for BEACON Passages

### A. Passage Architecture & "Monster Sentence" Budget
Every generated V2 passage must conform to authentic DRC BEACON structural specifications:

* **Total Word Count**: **350 – 500 words** (Standard Missions & CAT Stages) or **400 – 550 words** (Full-Length Benchmark Passages). *Never generate 150-word micro-passages in V2.*
* **Paragraph Structure**: **4 to 6 numbered paragraphs** (`[Paragraph 1]` through `[Paragraph 5]`), with **65–110 words** and **4–7 sentences** per paragraph.
  - **Paragraph 1**: Hook, setting/phenomenon introduction, and central claim or character goal.
  - **Paragraphs 2–4**: Body progression (cause/effect, problem/solution, chronological sequence, or compare/contrast) containing the **Monster Sentence(s)** and **Tier 2 target words**.
  - **Paragraph 5 (or 6)**: Resolution, broader implication, or thematic synthesis (anchors `ELAGSE5RI2`/`RL2` central idea/theme and `ELAGSE5RI5`/`RL5` structural contribution items).
* **The "Monster Sentence" Budget (Pillar 1 Syntax Target)**:
  - **Allowance**: Exactly **1–2 sentences per passage** between **22 and 28 words** (hard cap: **30 words**).
  - **Required Architecture**: Must contain at least two of: (a) passive voice with a delayed `by`-agent (`were meticulously calibrated by the navigator`), (b) an embedded non-restrictive participial or relative clause separating the grammatical subject from the verb, or (c) a fronted subordinate concession clause (`Although the outer hull withstood the pressure, ...`).
  - **Surrounding Sentence Pacing**: All other sentences in the passage must stay between **9 and 19 words** so the passage-wide MLS stays within the target band (**13.0–18.0 words**).

### B. Developmental & Thematic Appropriateness (Ages 10–12 / Grades 5–7)
High-Lexile passages (**940L–1185L**) for a 5th grader aiming for Advanced/Accelerated placement must match **upper-elementary / middle-grades cognitive and emotional maturity**:
* **Appropriate Cognitive Complexity**: Multi-step physical/biological processes, historical trade-offs, ethical dilemmas around fairness/stewardship/friendship, hidden motives vs. outward actions, and perspective shifts between narrator and characters.
* **Prohibited Content & Tone**: Zero adult/cynical themes, existential dread, romance, graphic violence, or dry bureaucratic/corporate jargon (*stakeholders, regulatory compliance, macroeconomic*).
* **Required Genre Distribution Across V2 Content Bank (45% Literary / 55% Informational)**:
  1. **Literary Fiction & Narrative (45%)**:
     - *Realistic Fiction*: Engineering/science club rivalries, music/art apprenticeships, outdoor wilderness challenges, navigating family heritage or moving to a new town.
     - *Historical Fiction*: Young apprentices in historical eras (e.g., printing press, Silk Road caravan, lighthouse keepers, Transcontinental Railroad, early aviation).
     - *Adventure / Survival & Folktale/Myth*: Navigating storms, cave cartography, adaptations of global folktales/myths emphasizing character traits and theme.
  2. **Informational & Explanatory (55%)**:
     - *Life & Earth Science*: Deep-sea hydrothermal vents, mycorrhizal fungal networks, extremophiles, plate tectonics, migratory navigation, Georgia ecosystems (Okefenokee, barrier islands).
     - *Physical Science & Engineering*: Biomimicry, microgrids, bridge trusses, cryogenic/space telescopes, autonomous rovers, acoustic physics.
     - *Social Studies, History & Biography*: Trailblazing scientists/explorers (e.g., Bessie Coleman, Matthew Henson, Chien-Shiung Wu), ancient trade routes, archaeological shipwrecks, civic innovation.

---

## 5. Production Python Readability & Guardrail Validation Specification

Save and import the following zero-dependency Python validator in V2's passage generation pipeline (`app/utils/readability_validator.py`) to deterministically gate every LLM-generated passage before it enters the database:

```python
import math
import re
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple

# Band specifications: (lexile_min, lexile_max) -> guardrail bounds
LEXILE_BAND_SPECS: Dict[str, Dict[str, Tuple[float, float]]] = {
    "700L-830L": {
        "lexile": (700, 830),
        "fkgl": (4.5, 5.5),
        "mls": (10.5, 12.8),
        "asw": (1.28, 1.39),
        "poly_pct": (4.5, 8.0),
        "ari": (4.5, 6.5),
        "ndc": (4.8, 5.7),
        "monster_len": (18, 21),
    },
    "830L-940L": {
        "lexile": (830, 940),
        "fkgl": (5.2, 6.3),
        "mls": (12.2, 14.2),
        "asw": (1.35, 1.44),
        "poly_pct": (6.5, 10.0),
        "ari": (5.8, 7.8),
        "ndc": (5.4, 6.2),
        "monster_len": (20, 24),
    },
    "940L-1010L": {
        "lexile": (940, 1010),
        "fkgl": (5.9, 6.9),
        "mls": (13.5, 15.5),
        "asw": (1.40, 1.48),
        "poly_pct": (8.5, 12.0),
        "ari": (7.0, 8.8),
        "ndc": (5.9, 6.7),
        "monster_len": (22, 26),
    },
    "1010L-1100L": {
        "lexile": (1010, 1100),
        "fkgl": (6.5, 7.5),
        "mls": (14.8, 16.8),
        "asw": (1.44, 1.52),
        "poly_pct": (10.0, 13.5),
        "ari": (8.0, 9.5),
        "ndc": (6.4, 7.1),
        "monster_len": (23, 28),
    },
    "1100L-1185L": {
        "lexile": (1100, 1185),
        "fkgl": (6.9, 7.8),  # Hard ceiling < 8.0 even at 1185L
        "mls": (15.8, 18.2),
        "asw": (1.47, 1.55),
        "poly_pct": (11.5, 14.8),
        "ari": (8.6, 10.0),
        "ndc": (6.8, 7.5),
        "monster_len": (24, 30),
    },
}


@dataclass
class ReadabilityReport:
    band: str
    passed: bool
    word_count: int
    paragraph_count: int
    sentence_count: int
    mls: float
    max_sentence_words: int
    monster_sentence_count: int
    asw: float
    polysyllabic_pct: float
    fkgl: float
    ari: float
    coleman_liau: float
    new_dale_chall: float
    estimated_lexile: int
    tier2_tagged_count: int
    violations: List[str]
    repair_directives: List[str]

    def to_dict(self) -> dict:
        return asdict(self)


def count_syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    if len(w) <= 3:
        return 1
    w = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", w)
    w = re.sub(r"^y", "", w)
    vowels = re.findall(r"[aeiouy]{1,2}", w)
    return max(1, len(vowels))


def resolve_band_key(target_lexile: int) -> str:
    if target_lexile < 830:
        return "700L-830L"
    if target_lexile < 940:
        return "830L-940L"
    if target_lexile < 1010:
        return "940L-1010L"
    if target_lexile < 1100:
        return "1010L-1100L"
    return "1100L-1185L"


def evaluate_passage_readability(
    raw_passage: str,
    target_lexile: int = 1000,
    min_words: int = 350,
    max_words: int = 550,
    min_paragraphs: int = 4,
    max_paragraphs: int = 6,
) -> ReadabilityReport:
    """Evaluates a BEACON passage against the V2 Multi-Metric Readability Guardrail Suite."""
    band_key = resolve_band_key(target_lexile)
    spec = LEXILE_BAND_SPECS[band_key]

    # Count explicit Tier 2 tags (HTML showTier2 or markdown **word**)
    tier2_html = re.findall(r"showTier2\(['\"]([^'\"]+)['\"]", raw_passage)
    tier2_md = re.findall(r"\*\*([A-Za-z-]+)\*\*", raw_passage)
    tier2_count = len(tier2_html) + len(tier2_md)

    # Strip HTML tags and split paragraphs
    clean = re.sub(r"<[^>]+>", "", raw_passage)
    clean = re.sub(r"\*\*([^*]+)\*\*", r"\1", clean)
    paras = [p.strip() for p in re.split(r"\[(?:Paragraph|P)\s*\d+\]", clean) if p.strip()]
    if len(paras) <= 1:
        paras = [p.strip() for p in re.split(r"\n\s*\n", clean) if p.strip()]

    full_text = " ".join(paras)
    sentences = [s.strip() for s in re.split(r"[.!?]+", full_text) if s.strip()]
    words = re.findall(r"[A-Za-z0-9'-]+", full_text)

    n_words = len(words)
    n_sents = max(1, len(sentences))
    n_paras = len(paras)

    char_counts = [len(re.sub(r"[^A-Za-z0-9]", "", w)) for w in words]
    syllable_counts = [count_syllables(w) for w in words]
    sent_lengths = [len(re.findall(r"[A-Za-z0-9'-]+", s)) for s in sentences]

    n_chars = sum(char_counts)
    n_syll = sum(syllable_counts)
    polysyllables = sum(1 for s in syllable_counts if s >= 3)

    mls = n_words / n_sents if n_words else 0.0
    asw = n_syll / n_words if n_words else 0.0
    poly_pct = (polysyllables / n_words * 100.0) if n_words else 0.0

    # Core readability indices
    fkgl = 0.39 * mls + 11.8 * asw - 15.59
    ari = 4.71 * (n_chars / max(1, n_words)) + 0.5 * mls - 21.43
    cli = 0.0588 * (n_chars / max(1, n_words) * 100.0) - 0.296 * (n_sents / max(1, n_words) * 100.0) - 15.8

    # Proxy for unfamiliar / Tier 2-3 words (>=3 syllables or >=8 chars not ending in -ing/-ed/-ly)
    difficult_words = sum(
        1 for w, syl in zip(words, syllable_counts)
        if syl >= 3 or (len(w) >= 8 and not w.lower().endswith(("ing", "ed", "ly", "er", "est")))
    )
    diff_pct = (difficult_words / max(1, n_words)) * 100.0
    ndc = 0.1579 * diff_pct + 0.0496 * mls + (3.6365 if diff_pct > 5.0 else 0.0)

    # Calibrated V2 Lexile Proxy
    rare_ratio = difficult_words / max(1, n_words)
    est_lexile = round(
        540 + 1120 * math.log10(max(1.0, mls)) + 950 * (asw - 1.30) + 1450 * rare_ratio
    )

    monster_min, monster_max = spec["monster_len"]
    monster_sents = [l for l in sent_lengths if l >= monster_min]
    max_sent = max(sent_lengths) if sent_lengths else 0

    violations: List[str] = []
    repairs: List[str] = []

    if not (min_words <= n_words <= max_words):
        violations.append(f"Word count {n_words} outside [{min_words}, {max_words}]")
        repairs.append(f"Adjust passage length from {n_words} words to {min_words}–{max_words} words.")

    if not (min_paragraphs <= n_paras <= max_paragraphs):
        violations.append(f"Paragraph count {n_paras} outside [{min_paragraphs}, {max_paragraphs}]")
        repairs.append(f"Format into {min_paragraphs}–{max_paragraphs} numbered paragraphs ([Paragraph 1]..).")

    fk_min, fk_max = spec["fkgl"]
    if not (fk_min <= fkgl <= fk_max):
        violations.append(f"FKGL {fkgl:.2f} outside band target [{fk_min}, {fk_max}]")
        if fkgl > fk_max:
            repairs.append(
                f"FKGL is too high ({fkgl:.2f} > {fk_max}). Replace 4-5 syllable nominalizations with 1-2 syllable "
                f"Anglo-Saxon words to lower ASW from {asw:.2f} toward {spec['asw'][0]:.2f}–{spec['asw'][1]:.2f}."
            )
        else:
            repairs.append(
                f"FKGL is too low ({fkgl:.2f} < {fk_min}). Combine choppy simple sentences using subordinate clauses "
                f"to raise MLS from {mls:.2f} toward {spec['mls'][0]:.1f}–{spec['mls'][1]:.1f}."
            )

    mls_min, mls_max = spec["mls"]
    if not (mls_min <= mls <= mls_max):
        violations.append(f"MLS {mls:.2f} outside [{mls_min}, {mls_max}]")
        repairs.append(f"Adjust mean sentence length from {mls:.2f} to {mls_min}–{mls_max} words/sentence.")

    asw_min, asw_max = spec["asw"]
    if not (asw_min <= asw <= asw_max):
        violations.append(f"ASW {asw:.2f} outside [{asw_min}, {asw_max}]")
        repairs.append(f"Adjust average syllables/word from {asw:.2f} to {asw_min}–{asw_max}.")

    if not (1 <= len(monster_sents) <= 2) or max_sent > 30:
        violations.append(
            f"Monster sentence budget violated: {len(monster_sents)} sentences >= {monster_min} words (max={max_sent})"
        )
        repairs.append(
            f"Include exactly 1–2 complex target sentences of {monster_min}–{monster_max} words (hard cap 30 words) "
            f"and keep all other sentences between 10 and {monster_min - 2} words."
        )

    if tier2_count < 4:
        violations.append(f"Tier 2 highlighted vocabulary count ({tier2_count}) < 4")
        repairs.append("Embed 4–6 highlighted Tier 2 academic vocabulary words with context clues.")

    return ReadabilityReport(
        band=band_key,
        passed=(len(violations) == 0),
        word_count=n_words,
        paragraph_count=n_paras,
        sentence_count=n_sents,
        mls=round(mls, 2),
        max_sentence_words=max_sent,
        monster_sentence_count=len(monster_sents),
        asw=round(asw, 2),
        polysyllabic_pct=round(poly_pct, 1),
        fkgl=round(fkgl, 2),
        ari=round(ari, 2),
        coleman_liau=round(cli, 2),
        new_dale_chall=round(ndc, 2),
        estimated_lexile=est_lexile,
        tier2_tagged_count=tier2_count,
        violations=violations,
        repair_directives=repairs,
    )
```
