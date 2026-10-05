#!/usr/bin/env python3
"""
Deterministic Gate 1 Readability, Psychometric, & Verbatim Schema Validator for V2 Daily Workouts.
Usage:
  python3 scripts/validate_content.py app/data/daily_workouts/*.json
  python3 scripts/validate_content.py app/data/daily_workouts/w01_tier1_lit.json --fix-metrics
"""
import sys
import os
import re
import json
import glob
from typing import Dict, Any, List, Tuple

VALID_DOMAINS = {
    "D1_KEY_IDEAS",
    "D2_CRAFT_STRUCTURE",
    "D3_INTEGRATION",
    "D4_SYNTAX",
    "D5_EBSR",
}

VALID_TRAP_TYPES = {
    "TRAP_WORD_MATCH",
    "TRAP_TOO_NARROW",
    "TRAP_EXTREME",
    "TRAP_OUTSIDE_INFO",
    "TRAP_SYNTACTIC_REVERSAL",
}

BANNED_CHILD_JARGON = {
    "dok",
    "pillar",
    "sem",
    "lexile",
    "quantile",
    "nominalization",
    "psychometric",
    "ebsr",
    "elagse",
    "metacognitive",
    "subordinate clause",
    "appositive",
}


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


def split_sentences(text: str) -> List[str]:
    cleaned = re.sub(r"\b(Mr|Mrs|Ms|Dr|St|Mt|Jr|Sr|vs|etc)\.", r"\1<PRD>", text)
    raw = re.split(r"(?<=[.!?])\s+", cleaned.strip())
    sents = [s.replace("<PRD>", ".").strip() for s in raw if len(re.findall(r"[A-Za-z]+", s)) >= 2]
    return sents


def compute_passage_metrics(text: str) -> Dict[str, Any]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text.strip()) if p.strip()]
    words = re.findall(r"[A-Za-z0-9'-]+", text)
    sents = split_sentences(text)
    n_words = len(words)
    n_sents = max(1, len(sents))
    n_syllables = sum(count_syllables(w) for w in words)

    mls = n_words / n_sents
    asw = n_syllables / max(1, n_words)
    fkgl = round(0.39 * mls + 11.8 * asw - 15.59, 2)

    sent_lengths = [len(re.findall(r"[A-Za-z0-9'-]+", s)) for s in sents]
    max_sent_len = max(sent_lengths) if sent_lengths else 0
    monster_candidates = [s for s, l in zip(sents, sent_lengths) if l >= 20]

    return {
        "wordCount": n_words,
        "paragraphCount": len(paragraphs),
        "sentenceCount": n_sents,
        "mls": round(mls, 2),
        "asw": round(asw, 3),
        "fkgl": fkgl,
        "maxSentenceWords": max_sent_len,
        "monsterCandidatesCount": len(monster_candidates),
    }


def extract_quoted_Or_full(option_text: str) -> str:
    """Extract the longest double-quoted or single-quoted substring, or fallback to stripped text."""
    matches = re.findall(r'"([^"]{20,})"', option_text)
    if matches:
        return max(matches, key=len).strip()
    # Try curly quotes
    matches_curly = re.findall(r'“([^”]{20,})”', option_text)
    if matches_curly:
        return max(matches_curly, key=len).strip()
    # Fallback: strip leading 'Paragraph X: ' if present
    cleaned = re.sub(r"^\s*\(?Paragraph\s+\d+\)?\s*[:\-]?\s*", "", option_text, flags=re.I).strip()
    cleaned = cleaned.strip('"“”\'')
    return cleaned


def normalize_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip())


def validate_workout_file(filepath: str, fix_metrics: bool = False) -> Tuple[bool, List[str], Dict[str, Any]]:
    errors: List[str] = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        return False, [f"Invalid JSON syntax: {e}"], {}

    req_top = [
        "workoutId", "workoutNumber", "title", "tier", "lexileBand",
        "targetLexile", "fkgl", "genre", "subGenre", "focusDomain",
        "focusStandard", "estimatedMinutes", "passage", "questions"
    ]
    for k in req_top:
        if k not in data:
            errors.append(f"Missing top-level field: '{k}'")
    if errors:
        return False, errors, {}

    if data["genre"] not in ("Literary", "Informational"):
        errors.append(f"genre must be 'Literary' or 'Informational', got '{data['genre']}'")

    if data["focusDomain"] not in VALID_DOMAINS:
        errors.append(f"focusDomain '{data['focusDomain']}' not in {sorted(VALID_DOMAINS)}")

    passage = data["passage"]
    p_text = passage.get("text", "")
    norm_passage = normalize_ws(p_text)

    metrics = compute_passage_metrics(p_text)

    if fix_metrics:
        data["fkgl"] = metrics["fkgl"]
        passage["wordCount"] = metrics["wordCount"]
        passage["paragraphCount"] = metrics["paragraphCount"]
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    # 1. Word count (320 to 560 words)
    wc = metrics["wordCount"]
    if not (320 <= wc <= 560):
        errors.append(
            f"Passage wordCount={wc} outside [320, 560] range. "
            f"{'Add ' + str(320 - wc) + ' more words.' if wc < 320 else 'Trim ' + str(wc - 560) + ' words.'}"
        )

    # 2. Paragraph count (4 to 6 paragraphs)
    pc = metrics["paragraphCount"]
    if not (4 <= pc <= 6):
        errors.append(f"Passage paragraphCount={pc} outside [4, 6] range (separate paragraphs with '\\n\\n').")

    # 3. FKGL (5.0 to 7.9)
    fkgl = metrics["fkgl"]
    if not (5.0 <= fkgl <= 7.9):
        if fkgl > 7.9:
            errors.append(
                f"Passage FKGL={fkgl} exceeds max 7.9 (MLS={metrics['mls']}, ASW={metrics['asw']}). "
                f"Repair: Replace 3-4 syllable words with 1-2 syllable concrete verbs/nouns while keeping 1-2 complex sentences."
            )
        else:
            errors.append(
                f"Passage FKGL={fkgl} is below min 5.0 (MLS={metrics['mls']}, ASW={metrics['asw']}). "
                f"Repair: Combine short choppy sentences using subordinate clauses or richer Tier 2 words."
            )

    # 4. Mean Sentence Length (11.0 to 20.5)
    mls = metrics["mls"]
    if not (11.0 <= mls <= 20.5):
        errors.append(f"Mean Sentence Length MLS={mls} outside [11.0, 20.5].")

    # 5. Monster Sentence check
    ms = passage.get("monsterSentence", {})
    ms_text = ms.get("verbatimSentence", "")
    if not ms_text:
        errors.append("Missing passage.monsterSentence.verbatimSentence")
    else:
        if normalize_ws(ms_text) not in norm_passage:
            errors.append(f"monsterSentence.verbatimSentence does NOT exist verbatim in passage.text: '{ms_text[:60]}...'")
        ms_wc = len(re.findall(r"[A-Za-z0-9'-]+", ms_text))
        if not (18 <= ms_wc <= 35):
            errors.append(f"monsterSentence word count={ms_wc} outside [18, 35] words.")
        for req_ms in ["actorChunk", "actionChunk", "receiverChunk", "activeRewrite"]:
            if not ms.get(req_ms):
                errors.append(f"Missing monsterSentence.{req_ms}")

    # 6. Tier 2 words check
    t2 = passage.get("tier2Words", [])
    if len(t2) < 3:
        errors.append(f"passage.tier2Words must have at least 3 vocabulary items, got {len(t2)}")
    for idx, item in enumerate(t2):
        w = item.get("word", "")
        if not w or w.lower() not in p_text.lower():
            errors.append(f"tier2Words[{idx}] '{w}' does not appear in passage.text")

    # 7. Questions validation
    questions = data.get("questions", [])
    if len(questions) != 6:
        errors.append(f"Expected exactly 6 questions per daily workout, got {len(questions)}")

    for idx, q in enumerate(questions):
        q_num = idx + 1
        q_id = q.get("questionId", f"q{q_num}")
        if q.get("domain") not in VALID_DOMAINS:
            errors.append(f"{q_id}: invalid domain '{q.get('domain')}'")

        opts = q.get("options", [])
        if len(opts) != 4:
            errors.append(f"{q_id}: must have 4 options, got {len(opts)}")
        else:
            correct_opts = [o for o in opts if o.get("isCorrect") is True]
            if len(correct_opts) != 1:
                errors.append(f"{q_id}: must have exactly 1 correct option, got {len(correct_opts)}")
            for o in opts:
                if not o.get("isCorrect"):
                    trap = o.get("trapType")
                    if trap not in VALID_TRAP_TYPES:
                        errors.append(f"{q_id} option {o.get('id')}: invalid trapType '{trap}', must be in {sorted(VALID_TRAP_TYPES)}")

        # Proving sentence check
        prov = q.get("provingSentenceText", "")
        if len(prov.strip()) < 20 or normalize_ws(prov) not in norm_passage:
            errors.append(
                f"{q_id}: provingSentenceText must be >=20 chars and exist 100% verbatim in passage.text. Got: '{prov[:60]}'"
            )

        # Child Tip check (6 to 45 words, no jargon, no pre-answer "Click the sentence / Pick the quote" imperatives)
        tip = q.get("childTip", "")
        tip_words = re.findall(r"[A-Za-z0-9'-]+", tip)
        if not (5 <= len(tip_words) <= 45):
            errors.append(f"{q_id}: childTip has {len(tip_words)} words (must be 5-45 words): '{tip}'")
        tip_lower = tip.lower().strip()
        for banned in BANNED_CHILD_JARGON:
            if re.search(rf"\b{re.escape(banned)}\b", tip_lower):
                errors.append(f"{q_id}: childTip contains banned psychometric jargon '{banned}': '{tip}'")
        if re.match(r"^(click the|first click|pick the quote|select the quote|choose the quote|pick the sentence)\b", tip_lower):
            errors.append(f"{q_id}: childTip sounds like a pre-answer instruction instead of explaining WHY the answer is right: '{tip}'")

        # Retry Hint check (4 to 36 words, no jargon)
        retry_hint = q.get("retryHint", "")
        if retry_hint:
            rh_words = re.findall(r"[A-Za-z0-9'-]+", retry_hint)
            if not (4 <= len(rh_words) <= 38):
                errors.append(f"{q_id}: retryHint has {len(rh_words)} words (must be 4-38 words): '{retry_hint}'")
            for banned in BANNED_CHILD_JARGON:
                if re.search(rf"\b{re.escape(banned)}\b", retry_hint.lower()):
                    errors.append(f"{q_id}: retryHint contains banned psychometric jargon '{banned}': '{retry_hint}'")

        # Option-level childFeedback check
        for o in opts:
            cfb = o.get("childFeedback", "")
            if not cfb:
                errors.append(f"{q_id} Option {o.get('id')}: missing 'childFeedback' explanation")
            else:
                cfb_words = re.findall(r"[A-Za-z0-9'-]+", cfb)
                if not (4 <= len(cfb_words) <= 45):
                    errors.append(f"{q_id} Option {o.get('id')}: childFeedback has {len(cfb_words)} words (must be 4-45 words): '{cfb}'")
                for banned in BANNED_CHILD_JARGON:
                    if re.search(rf"\b{re.escape(banned)}\b", cfb.lower()):
                        errors.append(f"{q_id} Option {o.get('id')}: childFeedback contains banned jargon '{banned}': '{cfb}'")

        # EBSR Part B verbatim quote check on all 4 options
        if q.get("itemType") == "EBSR_PART_B" or q_num == 6:
            for o in opts:
                quote_sub = extract_quoted_Or_full(o.get("text", ""))
                if len(quote_sub) < 20 or normalize_ws(quote_sub) not in norm_passage:
                    errors.append(
                        f"{q_id} (EBSR_PART_B) Option {o.get('id')}: quotation does NOT match passage.text verbatim: '{quote_sub[:70]}'"
                    )

    return len(errors) == 0, errors, metrics


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    fix_metrics = "--fix-metrics" in sys.argv[1:]

    if not args:
        args = sorted(glob.glob("app/data/daily_workouts/*.json"))

    if not args:
        print("No workout files found to validate.")
        sys.exit(0)

    all_passed = True
    passed_count = 0
    for path in args:
        ok, errs, metrics = validate_workout_file(path, fix_metrics=fix_metrics)
        fname = os.path.basename(path)
        if ok:
            passed_count += 1
            print(
                f"[PASS] {fname} | Words={metrics['wordCount']} | Paras={metrics['paragraphCount']} "
                f"| FKGL={metrics['fkgl']} | MLS={metrics['mls']}"
            )
        else:
            all_passed = False
            print(f"[FAIL] {fname} (FKGL={metrics.get('fkgl')}, Words={metrics.get('wordCount')}):")
            for e in errs:
                print(f"   - {e}")

    print(f"\nSummary: {passed_count}/{len(args)} workout files passed Gate 1 validation.")
    if not all_passed:
        sys.exit(1)


if __name__ == "__main__":
    main()
