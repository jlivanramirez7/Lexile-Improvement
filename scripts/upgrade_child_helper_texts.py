#!/usr/bin/env python3
"""
Upgrades all 100 V2 Daily Workout JSON files (w01-w100, 600 questions, 2,400 options) with:
  1. Post-answer `q.childTip`: Clear, child-friendly explanation of WHY the correct answer is right (never pre-answer commands like "Click the sentence" or "Pick the quote").
  2. `q.retryHint`: Warm, encouraging clue for Try #2 pointing to the right paragraph without spoiling the answer letter.
  3. Option-level `opt.childFeedback` on all 4 choices (A, B, C, D): Specific, child-friendly explanation of why each wrong option is a trick/wrong and why the right option is correct.
"""
import glob
import json
import re
from typing import Dict, Any, List

BANNED_REPLACEMENTS = [
    (r"\bDOK\s*\d?\b", "thinking level"),
    (r"\bPillar\s*\d?\b", "skill"),
    (r"\bSEM\b", "score range"),
    (r"\bLexile\b", "reading level"),
    (r"\bQuantile\b", "math level"),
    (r"\bnominalizations?\b", "complex nouns"),
    (r"\bpsychometric\b", "testing"),
    (r"\bEBSR\b", "two-part question"),
    (r"\bELAGSE[A-Za-z0-9.]*\b", "5th-grade reading"),
    (r"\bmetacognitive\b", "careful thinking"),
    (r"\bsubordinate clauses?\b", "extra detail phrases"),
    (r"\bappositives?\b", "describing phrases"),
    (r"\bPart A\b", "Question 5"),
    (r"\bPart B\b", "Question 6"),
    (r"\bprotagonist'?s?\b", "main character's"),
    (r"\bprotagonist\b", "main character"),
    (r"\btextual evidence\b", "story proof"),
    (r"\bverbatim\b", "exact"),
    (r"\bcorroborates\b", "proves"),
    (r"\bdemonstrates that\b", "shows that"),
    (r"\bdemonstrates how\b", "shows how"),
    (r"\bdemonstrates\b", "shows"),
    (r"\billustrates that\b", "shows that"),
    (r"\billustrates how\b", "shows how"),
    (r"\billustrates\b", "shows"),
    (r"\bconveys that\b", "shows that"),
    (r"\bconveys how\b", "shows how"),
    (r"\bconveys\b", "shows"),
    (r"\bestablishes that\b", "shows that"),
    (r"\bestablishes\b", "sets up"),
    (r"\bsynthesizes\b", "connects"),
    (r"\bcausal relationship\b", "cause-and-effect link"),
    (r"\bpassive-voice construction\b", "flipped sentence"),
    (r"\bpassive voice\b", "flipped sentence order"),
    (r"\bpassive construction\b", "flipped sentence"),
    (r"\bgrammatical actor\b", "true doer of the action"),
    (r"\bgrammatical subject\b", "main subject"),
    (r"\bTier 2\b", "key"),
]


def clean_child_language(text: str) -> str:
    s = text.strip()
    for pat, rep in BANNED_REPLACEMENTS:
        s = re.sub(pat, rep, s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def trim_to_word_limit(text: str, max_words: int = 40) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    trimmed = " ".join(words[:max_words]).rstrip(",;:-")
    if not trimmed.endswith((".", "!", "?")):
        trimmed += "."
    return trimmed


def build_retry_hint(old_tip: str, para_num: int, item_type: str) -> str:
    s = clean_child_language(old_tip)
    # Convert "Click the sentence..." or "Pick the quote..." into a retry hint
    s = re.sub(
        r"^(?:first\s+)?click the\s+(?:last\s+|first\s+)?sentence in paragraph\s*\d+\s*that\s+",
        f"Look in Paragraph {para_num} for the sentence that ",
        s,
        flags=re.I,
    )
    s = re.sub(
        r"^(?:first\s+)?click the\s+(?:last\s+|first\s+)?sentence of paragraph\s*\d+\s*to\s+",
        f"Check Paragraph {para_num} to ",
        s,
        flags=re.I,
    )
    s = re.sub(
        r"^(?:pick|select|choose) the (?:quote|sentence) (?:in|from) paragraph\s*\d+\s*that\s+",
        f"Look for the quote from Paragraph {para_num} that ",
        s,
        flags=re.I,
    )
    s = re.sub(
        r"^(?:pick|select|choose) the (?:quote|sentence) that\s+",
        f"Look for the quote in Paragraph {para_num} that ",
        s,
        flags=re.I,
    )
    if s:
        s = s[0].upper() + s[1:]
    if not s or len(s.split()) < 5:
        s = f"Re-read Paragraph {para_num} closely and match the clue in the text to the remaining choices!"
    return trim_to_word_limit(s, 34)


def clean_parent_to_child_why_right(
    parent_exp: str,
    corr_opt: Dict[str, Any],
    para_num: int,
    item_type: str,
    ms: Dict[str, Any],
    tier2_words: List[Dict[str, Any]],
    prompt: str,
    q5_corr_text: str = "",
) -> str:
    corr_id = corr_opt.get("id", "A")
    corr_text = corr_opt.get("text", "").strip().rstrip(".")

    # Special rich handling for Q1 Sentence Surgery
    if item_type == "SENTENCE_SURGERY" and ms.get("activeRewrite"):
        actor = clean_child_language(ms.get("actorChunk", ""))
        action = clean_child_language(ms.get("actionChunk", ""))
        rewrite = clean_child_language(ms.get("activeRewrite", "")).rstrip(".")
        tip = (
            f"Paragraph {para_num} uses a flipped sentence where '{action}' is followed by 'by {actor}.' "
            f"Put in simple order, {rewrite}."
        )
        return trim_to_word_limit(clean_child_language(tip), 40)

    # Clean parentExplanation into kid-friendly "why it's right" explanation
    p = clean_child_language(parent_exp)
    # Remove leading "Option X is correct because" or "Choice X correctly..."
    p = re.sub(
        r"^(?:Option|Choice)\s+[A-D]\s+(?:is\s+correct\s+because\s+|correctly\s+(?:identifies|explains|states|shows|captures|connects)\s+(?:that\s+|how\s+)?|directly\s+proves\s+(?:Question\s+5\s+by\s+showing\s+(?:that\s+|how\s+)?)?|provides\s+the\s+(?:exact|direct)\s+(?:story\s+proof|proof|evidence)\s+(?:in\s+Paragraph\s+\d+\s+)?(?:showing|that)\s+)",
        "",
        p,
        flags=re.I,
    )
    p = re.sub(r"^In\s+(?:this\s+item|Question\s+\d+)\s*,\s*", "", p, flags=re.I)
    # Remove any accidental reference to wrong option letters in parentExplanation
    p = re.sub(r"\b(?:Option|Choice)\s+[A-D]\b", "This answer", p, flags=re.I)

    if p:
        p = p[0].upper() + p[1:]

    if item_type == "VOCAB_CONTEXT":
        # Check if any tier2 word appears in prompt
        matched_t2 = None
        for t2 in tier2_words:
            w = t2.get("word", "")
            if w and w.lower() in prompt.lower():
                matched_t2 = t2
                break
        if matched_t2:
            w_name = matched_t2.get("word", "")
            clue = clean_child_language(matched_t2.get("contextClue", "")).rstrip(".")
            root = clean_child_language(matched_t2.get("rootHint", "")).rstrip(".")
            extra = f"Clue: {clue}." if clue else (f"Word clue: {root}." if root else p)
            tip = f"In Paragraph {para_num}, '{w_name}' means '{corr_text.lower()}.' {extra}"
            return trim_to_word_limit(clean_child_language(tip), 40)

    if item_type == "EBSR_PART_B":
        if p and len(p.split()) >= 7:
            tip = f"This quote from Paragraph {para_num} proves your Question 5 answer: {p}"
        else:
            q5_short = trim_to_word_limit(clean_child_language(q5_corr_text), 16).rstrip(".")
            tip = f"This exact sentence in Paragraph {para_num} gives the direct proof that {q5_short.lower()}."
        return trim_to_word_limit(clean_child_language(tip), 40)

    if p and len(p.split()) >= 7:
        if f"paragraph {para_num}" not in p.lower():
            tip = f"In Paragraph {para_num}, the text shows why this is right: {p}"
        else:
            tip = p
    else:
        tip = f"Paragraph {para_num} directly supports this answer by showing that {corr_text.lower()}."

    return trim_to_word_limit(clean_child_language(tip), 40)


def find_quote_paragraph(quote_opt_text: str, paragraphs: List[str]) -> int:
    clean_q = re.sub(r'^["“”\']+|["“”\']+$', "", quote_opt_text.strip())
    norm_q = re.sub(r"\s+", " ", clean_q[:45]).lower()
    for idx, p in enumerate(paragraphs):
        if norm_q and norm_q in re.sub(r"\s+", " ", p).lower():
            return idx + 1
    return 0


def build_wrong_option_feedback(
    opt: Dict[str, Any],
    corr_opt: Dict[str, Any],
    why_right: str,
    para_num: int,
    item_type: str,
    ms: Dict[str, Any],
    paragraphs: List[str],
    q5_corr_text: str = "",
) -> str:
    trap = opt.get("trapType") or "TRAP_WORD_MATCH"
    opt_text = clean_child_language(opt.get("text", "")).strip()
    corr_text = clean_child_language(corr_opt.get("text", "")).strip().rstrip(".")

    if item_type == "SENTENCE_SURGERY" and ms.get("actorChunk"):
        actor = clean_child_language(ms.get("actorChunk", "")).rstrip(".")
        action = clean_child_language(ms.get("actionChunk", "")).rstrip(".")
        receiver = clean_child_language(ms.get("receiverChunk", "")).rstrip(".")
        if trap == "TRAP_SYNTACTIC_REVERSAL":
            fb = (
                f"Flipped-Action Trick! In Paragraph {para_num}, {actor} is the one that {action}—"
                f"{receiver} received the action instead of doing it."
            )
        elif trap == "TRAP_WORD_MATCH":
            fb = (
                f"Copycat Words Trick! Those words appear in Paragraph {para_num}, "
                f"but the sentence says {actor} is what actually {action}."
            )
        elif trap == "TRAP_TOO_NARROW":
            fb = (
                f"Tiny Detail Trick! That only names a side detail in Paragraph {para_num}, "
                f"whereas {actor} is the true doer that {action}."
            )
        elif trap == "TRAP_EXTREME":
            fb = (
                f"Too-Extreme Trick! Paragraph {para_num} never goes that far—it simply shows that "
                f"{actor} {action} {receiver}."
            )
        else:
            fb = (
                f"Not in the Text! Paragraph {para_num} shows that {actor} {action} {receiver}, "
                f"not what this choice claims."
            )
        return trim_to_word_limit(clean_child_language(fb), 38)

    if item_type == "VOCAB_CONTEXT":
        if trap == "TRAP_WORD_MATCH":
            fb = (
                f"Word-Association Trick! That connects to other words in Paragraph {para_num}, "
                f"but in this sentence the word actually means '{corr_text.lower()}.'"
            )
        elif trap == "TRAP_SYNTACTIC_REVERSAL":
            fb = (
                f"Opposite Meaning Trick! That is almost the reverse of what happens in Paragraph {para_num}, "
                f"where the word means '{corr_text.lower()}.'"
            )
        else:
            fb = (
                f"Try plugging this into Paragraph {para_num}—it doesn't fit the clue in the sentence! "
                f"The context shows the word means '{corr_text.lower()}.'"
            )
        return trim_to_word_limit(clean_child_language(fb), 38)

    if item_type == "EBSR_PART_B":
        q_para = find_quote_paragraph(opt_text, paragraphs)
        para_label = f"Paragraph {q_para}" if q_para else "another part of the passage"
        q5_short = trim_to_word_limit(clean_child_language(q5_corr_text), 14).rstrip(".")
        if trap == "TRAP_TOO_NARROW":
            fb = (
                f"Tiny Detail Quote! This sentence from {para_label} only gives a small background fact "
                f"and doesn't prove Question 5's big point ({q5_short.lower()})."
            )
        elif trap == "TRAP_WORD_MATCH":
            fb = (
                f"Copycat Quote! This line from {para_label} repeats a few matching words, "
                f"but Paragraph {para_num} has the quote that actually proves Question 5."
            )
        else:
            fb = (
                f"Wrong Proof Quote! This line from {para_label} describes a different moment "
                f"instead of proving your Question 5 answer in Paragraph {para_num}."
            )
        return trim_to_word_limit(clean_child_language(fb), 38)

    # Standard items (Q3 KEY_IDEAS, Q4 CRAFT_OR_INTEGRATION, Q5 EBSR_PART_A)
    short_why = trim_to_word_limit(why_right, 22)
    if trap == "TRAP_WORD_MATCH":
        fb = f"Copycat Words Trick! This reuses words from Paragraph {para_num} but changes what really happened. {short_why}"
    elif trap == "TRAP_TOO_NARROW":
        fb = f"Tiny Detail Trick! This only mentions one small detail instead of the bigger point. {short_why}"
    elif trap == "TRAP_EXTREME":
        fb = f"Danger-Word Trick! Watch out for extreme claims that go way further than Paragraph {para_num}. {short_why}"
    elif trap == "TRAP_OUTSIDE_INFO":
        fb = f"Outside-Fact Trick! Even if this sounds possible in real life, Paragraph {para_num} never says it. {short_why}"
    elif trap == "TRAP_SYNTACTIC_REVERSAL":
        fb = f"Flipped-Cause Trick! This choice mixes up the cause and effect in Paragraph {para_num}. {short_why}"
    else:
        fb = f"Not quite! This choice doesn't match the proof in Paragraph {para_num}. {short_why}"

    return trim_to_word_limit(clean_child_language(fb), 38)


def process_all_files():
    files = sorted(
        glob.glob("app/data/daily_workouts/w*.json"),
        key=lambda p: int(p.split("/w")[1].split("_")[0]),
    )
    updated_count = 0
    for fpath in files:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)

        passage = data.get("passage", {})
        p_text = passage.get("text", "")
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", p_text.strip()) if p.strip()]
        ms = passage.get("monsterSentence", {})
        tier2_words = passage.get("tier2Words", [])
        questions = data.get("questions", [])

        # Find Q5 correct option text for Q6 EBSR link
        q5_corr_text = ""
        if len(questions) >= 5:
            q5_corr = next((o for o in questions[4].get("options", []) if o.get("isCorrect")), None)
            if q5_corr:
                q5_corr_text = q5_corr.get("text", "")

        for idx, q in enumerate(questions):
            para_num = int(q.get("provingParagraph") or 1)
            item_type = q.get("itemType") or "STANDARD"
            old_tip = q.get("childTip", "")
            parent_exp = q.get("parentExplanation", "")
            prompt = q.get("prompt", "")
            opts = q.get("options", [])
            corr_opt = next((o for o in opts if o.get("isCorrect")), opts[0] if opts else {"id": "A", "text": ""})

            # 1. Build retryHint from old_tip
            if not q.get("retryHint"):
                q["retryHint"] = build_retry_hint(old_tip, para_num, item_type)

            # 2. Build post-answer childTip explaining WHY the correct answer is right
            why_right = clean_parent_to_child_why_right(
                parent_exp=parent_exp,
                corr_opt=corr_opt,
                para_num=para_num,
                item_type=item_type,
                ms=ms,
                tier2_words=tier2_words,
                prompt=prompt,
                q5_corr_text=q5_corr_text,
            )
            q["childTip"] = why_right

            # 3. Build childFeedback for every option (A, B, C, D)
            for o in opts:
                if o.get("isCorrect"):
                    o["childFeedback"] = why_right
                else:
                    o["childFeedback"] = build_wrong_option_feedback(
                        opt=o,
                        corr_opt=corr_opt,
                        why_right=why_right,
                        para_num=para_num,
                        item_type=item_type,
                        ms=ms,
                        paragraphs=paragraphs,
                        q5_corr_text=q5_corr_text,
                    )

        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        updated_count += 1

    print(f"Successfully upgraded childTip, retryHint, and 2,400 option childFeedback entries across {updated_count} workout files.")


if __name__ == "__main__":
    process_all_files()
