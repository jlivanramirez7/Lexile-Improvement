import os
import glob
import json
import math
import logging
from datetime import datetime, timezone
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, List, Any, Optional, Callable

try:
    from fastapi import FastAPI, HTTPException, Request, Body
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    from pydantic import BaseModel
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

    class HTTPException(Exception):
        def __init__(self, status_code: int = 500, detail: str = "Error"):
            self.status_code = status_code
            self.detail = detail
            super().__init__(detail)

    class Request:
        pass

    def Body(default: Any = None, **kwargs: Any) -> Any:
        return default

    class BaseModel:
        def __init__(self, **kwargs: Any):
            for k, v in self.__class__.__dict__.items():
                if not k.startswith("_") and not callable(v):
                    setattr(self, k, v)
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self) -> Dict[str, Any]:
            return {
                k: getattr(self, k)
                for k in set(list(self.__dict__.keys()) + [
                    k2 for k2, v2 in self.__class__.__dict__.items()
                    if not k2.startswith("_") and not callable(v2)
                ])
            }

    class FileResponse:
        def __init__(self, path: str, media_type: Optional[str] = None):
            self.path = path
            self.media_type = media_type

    class StaticFiles:
        def __init__(self, directory: str):
            self.directory = directory

    class FastAPI:
        def __init__(self, title: str = ""):
            self.title = title
            self.routes: List[Dict[str, Any]] = []
            self.mounts: List[Dict[str, Any]] = []

        def _register(self, method: str, path: str) -> Callable:
            def decorator(func: Callable) -> Callable:
                self.routes.append({"method": method, "path": path, "func": func})
                return func
            return decorator

        def get(self, path: str) -> Callable:
            return self._register("GET", path)

        def post(self, path: str) -> Callable:
            return self._register("POST", path)

        def delete(self, path: str) -> Callable:
            return self._register("DELETE", path)

        def mount(self, path: str, app_obj: Any, name: str = ""):
            self.mounts.append({"path": path, "app": app_obj, "name": name})

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("beacon-simulator")

app = FastAPI(title="DRC BEACON ELA Simulator API (V1 + V2)")

# Path setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_DIR = os.path.join(BASE_DIR, "data")
CURRICULUM_FILE = os.path.join(DATA_DIR, "curriculum_matrix.json")
WORKOUTS_DIR = os.path.join(DATA_DIR, "daily_workouts")

# Initialize Firestore Client (Google Cloud Native)
db = None
DATABASE_NAME = os.getenv("FIRESTORE_DATABASE", "lexile-growth-db")
try:
    from google.cloud import firestore
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT")
    kwargs = {}
    if project_id:
        kwargs["project"] = project_id
    if DATABASE_NAME:
        kwargs["database"] = DATABASE_NAME
    db = firestore.Client(**kwargs)
    logger.info(f"Connected to Firestore database '{DATABASE_NAME}' in project context.")
except Exception as e:
    logger.warning(f"Firestore initialization fallback: {e}. Local fallback file will be used.")
    db = None

COLLECTION_NAME_V1 = "student_progress"
COLLECTION_NAME_V2 = "student_progress_v2"

# ==============================================================================
# V1 LEGACY STATE & HELPERS (Preserved for /v1 backward compatibility)
# ==============================================================================

DEFAULT_PROGRESS = {
    "studentId": "lucas",
    "studentName": "Lucas Ramirez",
    "xp": 450,
    "level": "Rising 5th (Advanced)",
    "completedMissions": [],
    "missionSubmissions": {},
    "completedMathMissions": [],
    "mathMissionSubmissions": {},
    "analytics": {
        "totalAttempted": 0,
        "totalCorrect": 0,
        "p1Attempted": 0,
        "p1Correct": 0,
        "p2Attempted": 0,
        "p2Correct": 0,
        "p3Attempted": 0,
        "p3Correct": 0,
        "distractorsCount": {
            "passive_subject_confusion": 0,
            "outside_knowledge": 0,
            "vocabulary_misinterpretation": 0,
            "unsupported_inference": 0
        },
        "informationalAttempted": 0,
        "informationalCorrect": 0,
        "fictionAttempted": 0,
        "fictionCorrect": 0,
        "dokBreakdown": {
            "dok1Attempted": 0,
            "dok1Correct": 0,
            "dok2Attempted": 0,
            "dok2Correct": 0,
            "dok3Attempted": 0,
            "dok3Correct": 0
        },
        "ebsrMetrics": {
            "pairedBothCorrect": 0,
            "partAOnlyCorrect": 0,
            "partBOnlyCorrect": 0,
            "bothWrong": 0
        },
        "syntacticMetrics": {
            "attempted": 0,
            "correct": 0
        },
        "semanticMetrics": {
            "attempted": 0,
            "correct": 0
        },
        "pacingMetrics": {
            "totalSecondsSpent": 0,
            "impulsiveCount": 0,
            "hesitationCount": 0
        }
    },
    "mathAnalytics": {
        "totalAttempted": 0,
        "totalCorrect": 0,
        "oaAttempted": 0,
        "oaCorrect": 0,
        "nbtAttempted": 0,
        "nbtCorrect": 0,
        "nfAttempted": 0,
        "nfCorrect": 0,
        "mdAttempted": 0,
        "mdCorrect": 0,
        "gAttempted": 0,
        "gCorrect": 0,
        "mathDistractorsCount": {
            "computational_error": 0,
            "misreading_operation": 0,
            "place_value_shift": 0,
            "denominator_addition_misconception": 0,
            "partial_step_completion": 0
        },
        "dokBreakdown": {
            "dok1Attempted": 0,
            "dok1Correct": 0,
            "dok2Attempted": 0,
            "dok2Correct": 0,
            "dok3Attempted": 0,
            "dok3Correct": 0
        },
        "pacingMetrics": {
            "totalSecondsSpent": 0,
            "impulsiveCount": 0,
            "hesitationCount": 0
        }
    }
}


class ProgressModel(BaseModel):
    studentId: Optional[str] = "lucas"
    studentName: Optional[str] = "Lucas Ramirez"
    xp: Optional[int] = 450
    level: Optional[str] = "Rising 5th (Advanced)"
    completedMissions: Optional[List[str]] = []
    missionSubmissions: Optional[Dict[str, Any]] = {}
    completedMathMissions: Optional[List[str]] = []
    mathMissionSubmissions: Optional[Dict[str, Any]] = {}
    analytics: Optional[Dict[str, Any]] = {}
    mathAnalytics: Optional[Dict[str, Any]] = {}


def get_local_filename_v1(student_id: str) -> str:
    clean_id = student_id.lower().replace(" ", "_")
    return f"/tmp/{clean_id}_progress.json"


def read_local_fallback_v1(student_id: str) -> dict:
    file_path = get_local_filename_v1(student_id)
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading V1 local storage file: {e}")

    prog = json.loads(json.dumps(DEFAULT_PROGRESS))
    prog["studentId"] = student_id
    prog["studentName"] = "Evelyn Mietling" if "evelyn" in student_id.lower() else "Lucas Ramirez"
    return prog


def write_local_fallback_v1(student_id: str, data: dict):
    file_path = get_local_filename_v1(student_id)
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing to V1 local storage file: {e}")


# ==============================================================================
# V2 DATA LOADERS & PSYCHOMETRIC BASELINE / RECALCULATION ENGINE
# ==============================================================================

DOMAIN_BASELINE_SEEDS = {
    "D1_KEY_IDEAS": 78,
    "D2_CRAFT_STRUCTURE": 72,
    "D3_INTEGRATION": 68,
    "D4_SYNTAX": 62,
    "D5_EBSR": 64,
}

DOMAIN_DEFAULT_TRAP = {
    "D1_KEY_IDEAS": "TRAP_TOO_NARROW",
    "D2_CRAFT_STRUCTURE": "TRAP_WORD_MATCH",
    "D3_INTEGRATION": "TRAP_OUTSIDE_INFO",
    "D4_SYNTAX": "TRAP_SYNTACTIC_REVERSAL",
    "D5_EBSR": "TRAP_WORD_MATCH",
}

LEGACY_TRAP_MAP = {
    "passive_subject_confusion": "TRAP_SYNTACTIC_REVERSAL",
    "outside_knowledge": "TRAP_OUTSIDE_INFO",
    "unsupported_inference": "TRAP_OUTSIDE_INFO",
    "verbatim_word_trap": "TRAP_WORD_MATCH",
    "vocabulary_misinterpretation": "TRAP_WORD_MATCH",
    "vocabulary_context_slip": "TRAP_WORD_MATCH",
    "too_narrow_detail": "TRAP_TOO_NARROW",
    "extreme_qualifier": "TRAP_EXTREME",
}


def load_curriculum_matrix() -> Dict[str, Any]:
    if os.path.exists(CURRICULUM_FILE):
        try:
            with open(CURRICULUM_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read curriculum_matrix.json: {e}")
    return {"studentProfile": {}, "tiers": [], "domains": [], "trapArchetypes": {}}


def load_all_workouts() -> List[Dict[str, Any]]:
    workouts: List[Dict[str, Any]] = []
    if not os.path.exists(WORKOUTS_DIR):
        return workouts

    pattern_direct = os.path.join(WORKOUTS_DIR, "*.json")
    pattern_nested = os.path.join(WORKOUTS_DIR, "**", "*.json")
    seen_paths = set()
    all_files = sorted(glob.glob(pattern_direct) + glob.glob(pattern_nested, recursive=True))

    for path in all_files:
        norm_path = os.path.abspath(path)
        if norm_path in seen_paths:
            continue
        seen_paths.add(norm_path)
        try:
            with open(norm_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict) and "workoutId" in data and "questions" in data:
                workouts.append(data)
        except Exception as e:
            logger.warning(f"Skipping invalid workout file {norm_path}: {e}")

    workouts.sort(key=lambda w: (w.get("workoutNumber", 9999), w.get("workoutId", "")))
    return workouts


def compute_domain_status(mastery_pct: float) -> str:
    if mastery_pct >= 85:
        return "MASTERED"
    if mastery_pct >= 65:
        return "DEVELOPING"
    return "NEEDS_PRACTICE"


def normalize_trap_code(raw_trap: Optional[str]) -> Optional[str]:
    if not raw_trap:
        return None
    if raw_trap in ("TRAP_WORD_MATCH", "TRAP_TOO_NARROW", "TRAP_EXTREME", "TRAP_OUTSIDE_INFO", "TRAP_SYNTACTIC_REVERSAL"):
        return raw_trap
    return LEGACY_TRAP_MAP.get(raw_trap, raw_trap)


def _parse_iso_epoch(ts_str: Optional[str]) -> float:
    if not ts_str or not isinstance(ts_str, str):
        return 0.0
    try:
        clean = ts_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean).timestamp()
    except Exception:
        return 0.0


def deduplicate_trial_history(trials: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deduplicates trialHistory by trialId/sessionId AND collapses accidental double-click
    twin submissions (identical workoutId, duration, and scores within 120 seconds).
    """
    if not isinstance(trials, list):
        return []
    seen_ids = set()
    result: List[Dict[str, Any]] = []
    for t in trials:
        if not isinstance(t, dict):
            continue
        tid = str(t.get("trialId") or t.get("sessionId") or "")
        if tid and tid in seen_ids:
            continue
        w_id = str(t.get("workoutId") or "")
        dur = float(t.get("totalDurationSeconds") or t.get("timeSpentSeconds") or 0.0)
        f_score = int(t.get("firstTryCorrectCount", t.get("firstTryScore", 0)) or 0)
        r_score = int(t.get("retryCorrectCount", t.get("finalCorrectCount", f_score)) or f_score)
        ts_sec = _parse_iso_epoch(t.get("timestampISO") or t.get("completedAt"))

        is_twin = False
        for prev in result:
            prev_wid = str(prev.get("workoutId") or "")
            prev_dur = float(prev.get("totalDurationSeconds") or prev.get("timeSpentSeconds") or 0.0)
            prev_f = int(prev.get("firstTryCorrectCount", prev.get("firstTryScore", 0)) or 0)
            prev_r = int(prev.get("retryCorrectCount", prev.get("finalCorrectCount", prev_f)) or prev_f)
            prev_ts = _parse_iso_epoch(prev.get("timestampISO") or prev.get("completedAt"))
            if w_id and w_id == prev_wid and abs(dur - prev_dur) < 0.2 and f_score == prev_f and r_score == prev_r:
                if ts_sec > 0 and prev_ts > 0 and abs(ts_sec - prev_ts) <= 120.0:
                    is_twin = True
                    break
        if is_twin:
            continue
        if tid:
            seen_ids.add(tid)
        result.append(t)
    return result


def recalculate_v2_progress(progress: Dict[str, Any], curriculum: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Deterministic server-side recalculation of V2 progress state from official BEACON baseline
    priors (940L Fall G5 anchor + 4-item domain priors) blended with all recorded trials.
    Mirrors window.V2Engine.recalculateMetricsFromTrials on the client.
    """
    if curriculum is None:
        curriculum = load_curriculum_matrix()

    profile = curriculum.get("studentProfile", {})
    domains_cfg = curriculum.get("domains", [])
    trap_archetypes = curriculum.get("trapArchetypes", {})
    workouts = load_all_workouts()

    student_id = (progress.get("studentId") or "lucas").lower().replace(" ", "_")
    student_name = "Evelyn Mietling" if "evelyn" in student_id else profile.get("studentName", "Lucas Ramirez")

    progress["studentId"] = student_id
    progress["studentName"] = student_name
    progress["grade"] = profile.get("currentGrade", 5)
    progress["school"] = profile.get("school", "Nickajack Elementary")
    progress["targetMiddleSchool"] = profile.get("targetMiddleSchool", "Dickerson Middle School")
    progress["baselineLexile"] = profile.get("currentOfficialLexile", 940)
    progress["baselineDate"] = "09/01/2026"
    progress["targetACLexile"] = profile.get("targetACLexile", 1075)
    progress["targetStretchLexile"] = profile.get("targetStretchLexile", 1150)
    progress["officialBeaconHistory"] = profile.get("officialBeaconHistory", [
        {"date": "2025-03-19", "displayDate": "03/19/2025", "grade": 3, "window": "Spring G3", "lexile": 835, "quantile": 500, "bookRange": "750L-870L"},
        {"date": "2025-09-04", "displayDate": "09/04/2025", "grade": 4, "window": "Fall G4", "lexile": 840, "quantile": 515, "bookRange": "760L-880L"},
        {"date": "2025-12-17", "displayDate": "12/17/2025", "grade": 4, "window": "Winter G4", "lexile": 830, "quantile": 760, "bookRange": "750L-860L"},
        {"date": "2026-03-18", "displayDate": "03/18/2026", "grade": 4, "window": "Spring G4", "lexile": 800, "quantile": 700, "bookRange": "710L-830L"},
        {"date": "2026-09-01", "displayDate": "09/01/2026", "grade": 5, "window": "Fall G5", "lexile": 940, "quantile": None, "bookRange": "850L-990L"},
    ])

    trial_history: List[Dict[str, Any]] = progress.get("trialHistory")
    if not isinstance(trial_history, list):
        trial_history = []
    else:
        trial_history = deduplicate_trial_history(trial_history)
    progress["trialHistory"] = trial_history

    # Domain attempts collection
    domain_attempts: Dict[str, List[Dict[str, Any]]] = {d_id: [] for d_id in DOMAIN_BASELINE_SEEDS}
    subskill_attempts: Dict[str, List[Dict[str, Any]]] = {}
    domain_trap_counts: Dict[str, Dict[str, int]] = {
        d_id: {t: 0 for t in ("TRAP_WORD_MATCH", "TRAP_TOO_NARROW", "TRAP_EXTREME", "TRAP_OUTSIDE_INFO", "TRAP_SYNTACTIC_REVERSAL")}
        for d_id in DOMAIN_BASELINE_SEEDS
    }

    trap_counts: Dict[str, int] = {
        "TRAP_WORD_MATCH": 0,
        "TRAP_TOO_NARROW": 0,
        "TRAP_EXTREME": 0,
        "TRAP_OUTSIDE_INFO": 0,
        "TRAP_SYNTACTIC_REVERSAL": 0,
    }

    ebsr_stats = {
        "bothCorrect": 0,
        "partAOnly": 0,
        "partBOnly": 0,
        "bothWrong": 0,
        "totalPairs": 0,
        "linkAccuracyPct": 64,
    }

    total_items_attempted = 0
    total_first_try_correct = 0
    total_retry_correct = 0
    total_seconds_spent = 0.0
    impulsive_count = 0
    hesitation_count = 0
    optimal_pace_count = 0

    completed_workout_ids: List[str] = []
    domain_last_practiced: Dict[str, Optional[str]] = {d_id: None for d_id in DOMAIN_BASELINE_SEEDS}

    for trial in trial_history:
        w_id = trial.get("workoutId")
        if w_id and w_id not in completed_workout_ids:
            completed_workout_ids.append(w_id)

        t_genre = trial.get("genre") or "Informational"
        t_lexile = trial.get("targetLexile") or 960
        t_iso = trial.get("timestampISO") or trial.get("completedAt")
        items = trial.get("itemAttempts")
        if not isinstance(items, list):
            items = trial.get("items") if isinstance(trial.get("items"), list) else []
        trial["itemAttempts"] = items

        ebsr_part_a_item = None
        ebsr_part_b_item = None
        d5_items_in_trial = []

        for idx, item in enumerate(items):
            d_id = item.get("domain") or item.get("domainId") or trial.get("focusDomain") or "D1_KEY_IDEAS"
            if d_id not in DOMAIN_BASELINE_SEEDS:
                d_id = "D1_KEY_IDEAS"

            first_correct = bool(item.get("firstTryCorrect") if "firstTryCorrect" in item else item.get("isCorrect", False))
            retry_correct = bool(item.get("retryCorrect", True if first_correct else item.get("secondTryCorrect", False)))
            sec = float(item.get("timeSpentSeconds") if "timeSpentSeconds" in item else item.get("secondsSpent", 30.0))
            dok = int(item.get("dok") or item.get("dokLevel") or 2)
            sub_id = item.get("subSkill") or item.get("subSkillId")
            item_type = item.get("itemType") or "STANDARD"

            is_impulsive = bool(item.get("impulsiveFlag") or item.get("impulsivityFlag") or (0 < sec < 8.0))
            is_hesitation = bool(item.get("hesitationFlag") or (sec > 90.0))

            total_items_attempted += 1
            if first_correct:
                total_first_try_correct += 1
            if retry_correct:
                total_retry_correct += 1
            total_seconds_spent += sec

            if is_impulsive:
                impulsive_count += 1
            elif is_hesitation:
                hesitation_count += 1
            else:
                optimal_pace_count += 1

            if not first_correct:
                trap = normalize_trap_code(item.get("trapType") or item.get("distractorTrapSelected"))
                if trap and trap in trap_counts:
                    trap_counts[trap] += 1
                    domain_trap_counts[d_id][trap] = domain_trap_counts[d_id].get(trap, 0) + 1

            attempt_record = {
                "domain": d_id,
                "subSkill": sub_id,
                "genre": item.get("genre") or t_genre,
                "targetLexile": t_lexile,
                "dok": dok,
                "firstTryCorrect": first_correct,
                "retryCorrect": retry_correct,
                "score": 1.0 if first_correct else 0.0,
                "timestampISO": t_iso,
            }
            domain_attempts[d_id].append(attempt_record)
            if t_iso:
                domain_last_practiced[d_id] = t_iso

            if sub_id:
                subskill_attempts.setdefault(sub_id, []).append(attempt_record)

            if item_type == "EBSR_PART_A" or item.get("isEbsrPartA"):
                ebsr_part_a_item = item
            elif item_type == "EBSR_PART_B" or item.get("isEbsrPartB") or idx == 5:
                ebsr_part_b_item = item
            if d_id == "D5_EBSR":
                d5_items_in_trial.append(item)

        # Evaluate EBSR pair for this trial
        if ebsr_part_a_item is None and len(d5_items_in_trial) >= 2:
            ebsr_part_a_item = d5_items_in_trial[0]
            ebsr_part_b_item = d5_items_in_trial[1]
        elif ebsr_part_a_item is None and ebsr_part_b_item is not None and len(items) >= 2:
            ebsr_part_a_item = items[-2]

        if ebsr_part_a_item is not None and ebsr_part_b_item is not None:
            a_ok = bool(ebsr_part_a_item.get("firstTryCorrect") if "firstTryCorrect" in ebsr_part_a_item else ebsr_part_a_item.get("isCorrect", False))
            b_ok = bool(ebsr_part_b_item.get("firstTryCorrect") if "firstTryCorrect" in ebsr_part_b_item else ebsr_part_b_item.get("isCorrect", False))
            ebsr_stats["totalPairs"] += 1
            if a_ok and b_ok:
                ebsr_stats["bothCorrect"] += 1
            elif a_ok and not b_ok:
                ebsr_stats["partAOnly"] += 1
            elif not a_ok and b_ok:
                ebsr_stats["partBOnly"] += 1
            else:
                ebsr_stats["bothWrong"] += 1
        elif len(d5_items_in_trial) == 1:
            only_ok = bool(d5_items_in_trial[0].get("firstTryCorrect") if "firstTryCorrect" in d5_items_in_trial[0] else d5_items_in_trial[0].get("isCorrect", False))
            ebsr_stats["totalPairs"] += 1
            if only_ok:
                ebsr_stats["bothCorrect"] += 1
            else:
                ebsr_stats["bothWrong"] += 1

    # Blend domain mastery from 4-item priors + recency-weighted itemAttempts
    domain_mastery: Dict[str, Any] = {}
    domain_mastery_list: List[Dict[str, Any]] = []

    total_lit_prior_w = 0.0
    total_lit_prior_s = 0.0
    total_info_prior_w = 0.0
    total_info_prior_s = 0.0
    total_lit_rec_attempted = 0
    total_lit_rec_correct = 0
    total_info_rec_attempted = 0
    total_info_rec_correct = 0

    for d_cfg in domains_cfg:
        d_id = d_cfg["id"]
        base_pct = float(DOMAIN_BASELINE_SEEDS.get(d_id, 70))
        weight = float(d_cfg.get("weight", 1.25))
        records = domain_attempts.get(d_id, [])
        n_rec = len(records)

        # Prior equivalent to 4 items at baseline percentage
        prior_w = 4.0
        prior_s = prior_w * (base_pct / 100.0)

        rec_w_sum = 0.0
        rec_s_sum = 0.0

        lit_prior_pct = min(98.0, base_pct + 2.0)
        info_prior_pct = max(40.0, base_pct - 2.0)
        lit_w = 2.0
        lit_s = lit_w * (lit_prior_pct / 100.0)
        info_w = 2.0
        info_s = info_w * (info_prior_pct / 100.0)

        lit_rec_attempted = 0
        lit_rec_correct = 0
        info_rec_attempted = 0
        info_rec_correct = 0

        for idx, rec in enumerate(records):
            age = (n_rec - 1) - idx
            w_recency = 1.25 * (0.92 ** age)
            dok = rec.get("dok", 2)
            w_dok = 0.9 if dok == 1 else (1.15 if dok >= 3 else 1.0)
            lex = rec.get("targetLexile", 960)
            w_lex = 1.15 if lex >= 1030 else (1.05 if lex >= 980 else 1.0)
            w_item = w_recency * w_dok * w_lex
            s_item = float(rec.get("score", 0.0))

            rec_w_sum += w_item
            rec_s_sum += w_item * s_item

            if rec.get("genre") == "Literary":
                lit_w += w_item
                lit_s += w_item * s_item
                lit_rec_attempted += 1
                if s_item >= 0.99:
                    lit_rec_correct += 1
            else:
                info_w += w_item
                info_s += w_item * s_item
                info_rec_attempted += 1
                if s_item >= 0.99:
                    info_rec_correct += 1

        blended_pct = round(((prior_s + rec_s_sum) / (prior_w + rec_w_sum)) * 100.0)
        blended_pct = max(0, min(100, int(blended_pct)))

        lit_pct = max(0, min(100, int(round((lit_s / lit_w) * 100.0))))
        info_pct = max(0, min(100, int(round((info_s / info_w) * 100.0))))

        total_lit_prior_w += lit_w
        total_lit_prior_s += lit_s
        total_info_prior_w += info_w
        total_info_prior_s += info_s
        total_lit_rec_attempted += lit_rec_attempted
        total_lit_rec_correct += lit_rec_correct
        total_info_rec_attempted += info_rec_attempted
        total_info_rec_correct += info_rec_correct

        status = compute_domain_status(blended_pct)
        priority_deficit = round((100.0 - blended_pct) * weight, 1)

        # Sub-skills calculation
        sub_skills_map: Dict[str, Any] = {}
        for idx_sub, sub_cfg in enumerate(d_cfg.get("subSkills", [])):
            s_id = sub_cfg["id"]
            s_recs = subskill_attempts.get(s_id, [])
            s_prior_w = 2.0
            s_prior_s = s_prior_w * (base_pct / 100.0)
            s_w_sum = 0.0
            s_s_sum = 0.0
            for r_i, s_rec in enumerate(s_recs):
                s_age = (len(s_recs) - 1) - r_i
                w_sub = 1.25 * (0.92 ** s_age)
                s_w_sum += w_sub
                s_s_sum += w_sub * float(s_rec.get("score", 0.0))
            if s_recs:
                sub_pct = int(round(((s_prior_s + s_s_sum) / (s_prior_w + s_w_sum)) * 100.0))
            else:
                sub_pct = blended_pct
            sub_pct = max(0, min(100, sub_pct))
            sub_skills_map[s_id] = {
                "id": s_id,
                "name": sub_cfg["name"],
                "masteryPct": sub_pct,
                "attempted": len(s_recs),
                "correct": sum(1 for r in s_recs if r.get("score", 0) >= 0.99),
                "status": compute_domain_status(sub_pct),
            }

        rec_correct_count = sum(1 for r in records if r.get("score", 0) >= 0.99)
        d_obj = {
            "domainId": d_id,
            "id": d_id,
            "shortName": d_cfg.get("shortName", d_id),
            "parentLabel": d_cfg.get("parentLabel", d_id),
            "weight": weight,
            "standards": d_cfg.get("standards", []),
            "baselinePct": int(base_pct),
            "masteryPct": blended_pct,
            "firstTryPct": blended_pct,
            "literaryPct": lit_pct,
            "informationalPct": info_pct,
            "literaryAttempted": lit_rec_attempted,
            "literaryCorrect": lit_rec_correct,
            "informationalAttempted": info_rec_attempted,
            "informationalCorrect": info_rec_correct,
            "priorWeight": 4,
            "attempted": 4 + n_rec,
            "correct": round(prior_s + rec_correct_count, 1),
            "recordedAttempts": n_rec,
            "recordedCorrect": rec_correct_count,
            "status": status,
            "priorityDeficitScore": priority_deficit,
            "lastPracticedISO": domain_last_practiced.get(d_id),
            "subSkills": sub_skills_map,
        }
        domain_mastery[d_id] = d_obj
        domain_mastery_list.append(d_obj)

    # Update EBSR link accuracy from D5 mastery & recorded pairs
    if ebsr_stats["totalPairs"] > 0:
        pair_rate = (ebsr_stats["bothCorrect"] / ebsr_stats["totalPairs"]) * 100.0
        ebsr_stats["linkAccuracyPct"] = int(round((64.0 * 2.0 + pair_rate * ebsr_stats["totalPairs"]) / (2.0 + ebsr_stats["totalPairs"])))
    else:
        ebsr_stats["linkAccuracyPct"] = domain_mastery.get("D5_EBSR", {}).get("masteryPct", 64)

    # Overall Literary vs Informational accuracy
    overall_lit_pct = int(round((total_lit_prior_s / max(1.0, total_lit_prior_w)) * 100.0))
    overall_info_pct = int(round((total_info_prior_s / max(1.0, total_info_prior_w)) * 100.0))

    # Rolling Estimated Lexile & SEM anchored at 940L Fall G5 BEACON report
    baseline_lexile = 940.0
    if not trial_history:
        estimated_lexile = 940
        estimated_sem = 25
    else:
        n_trials = len(trial_history)
        anchor_weight = max(1.5, 3.8 * (0.85 ** n_trials))
        lex_w_sum = anchor_weight
        lex_val_sum = anchor_weight * baseline_lexile
        mastery_bonus = 0.0

        for idx, trial in enumerate(trial_history):
            age = (n_trials - 1) - idx
            w_t = 1.25 * (0.90 ** age)
            t_lex = float(trial.get("targetLexile") or 960.0)
            items = trial.get("itemAttempts") or []
            if items:
                c_cnt = sum(1 for it in items if (it.get("firstTryCorrect") if "firstTryCorrect" in it else it.get("isCorrect")))
                acc = c_cnt / len(items)
            else:
                acc = float(trial.get("firstTryAccuracyPct", 75.0)) / 100.0

            eff_lex = max(baseline_lexile, t_lex)
            if acc >= 0.50:
                perf_lex = eff_lex + (acc - 0.68) * 145.0
            else:
                perf_lex = baseline_lexile - (0.68 - acc) * 85.0

            lex_w_sum += w_t
            lex_val_sum += w_t * perf_lex

            if acc >= 0.80:
                mastery_bonus += 4.5
            elif acc >= 0.66:
                mastery_bonus += 2.0

        raw_est = (lex_val_sum / lex_w_sum) + min(45.0, mastery_bonus)
        # Round to nearest 5L matching BEACON convention
        estimated_lexile = int(round(raw_est / 5.0) * 5)
        estimated_lexile = max(850, min(1180, estimated_lexile))
        estimated_sem = max(12, int(round(25.0 - min(13.0, math.sqrt(max(1, total_items_attempted)) * 2.2))))

    # Determine current tier from estimatedLexile
    if estimated_lexile >= 1085:
        current_tier = 4
    elif estimated_lexile >= 1030:
        current_tier = 3
    elif estimated_lexile >= 980:
        current_tier = 2
    else:
        current_tier = 1

    if estimated_lexile >= 1075:
        ac_status = "QUALIFIED"
    elif estimated_lexile >= 980:
        ac_status = "ON_TRACK"
    else:
        ac_status = "NEEDS_ACCELERATION"

    # Identify topWeakness (highest priorityDeficitScore domain + most frequent or default trap)
    sorted_domains = sorted(domain_mastery_list, key=lambda d: (-d["priorityDeficitScore"], d["masteryPct"]))
    top_dom = sorted_domains[0] if sorted_domains else {
        "domainId": "D4_SYNTAX",
        "shortName": "Sentence Surgery",
        "parentLabel": "Syntactic Decoding (Monster Sentences & Passive Voice)",
        "masteryPct": 62,
        "status": "NEEDS_PRACTICE",
        "priorityDeficitScore": 51.3,
    }
    top_d_id = top_dom["domainId"]
    d_traps = domain_trap_counts.get(top_d_id, {})
    best_trap_code = None
    best_trap_cnt = 0
    for t_code, t_cnt in d_traps.items():
        if t_cnt > best_trap_cnt:
            best_trap_cnt = t_cnt
            best_trap_code = t_code

    if not best_trap_code:
        # Check global trap counts next
        for t_code, t_cnt in trap_counts.items():
            if t_cnt > best_trap_cnt:
                best_trap_cnt = t_cnt
                best_trap_code = t_code

    if not best_trap_code:
        best_trap_code = DOMAIN_DEFAULT_TRAP.get(top_d_id, "TRAP_SYNTACTIC_REVERSAL")

    trap_meta = trap_archetypes.get(best_trap_code, {
        "code": best_trap_code,
        "kidName": "Flipped Action Trap",
        "parentName": "Syntactic / Causal Reversal",
        "remediation": "Confuses the cause and effect or swaps the subject and receiver in a long sentence.",
    })

    # Find recommended workout for topWeakness calibrated to estimated_lexile + 25L
    rec_workout_id = "w01_tier1_info"
    rec_workout_title = "Targeted Precision Workout"
    if workouts:
        target_lex = estimated_lexile + 25
        sort_key = lambda w: (abs(int(w.get("targetLexile") or 960) - target_lex), int(w.get("workoutNumber") or 999))
        uncompleted_in_dom = sorted(
            [w for w in workouts if w.get("focusDomain") == top_d_id and w.get("workoutId") not in completed_workout_ids],
            key=sort_key,
        )
        any_in_dom = sorted(
            [w for w in workouts if w.get("focusDomain") == top_d_id],
            key=sort_key,
        )
        chosen_w = (uncompleted_in_dom or any_in_dom or workouts)[0]
        rec_workout_id = chosen_w.get("workoutId", rec_workout_id)
        rec_workout_title = chosen_w.get("title", rec_workout_title)

    top_weakness = {
        "domainId": top_d_id,
        "domainShortName": top_dom["shortName"],
        "domainParentLabel": top_dom["parentLabel"],
        "masteryPct": top_dom["masteryPct"],
        "status": top_dom["status"],
        "priorityDeficitScore": top_dom["priorityDeficitScore"],
        "trapCode": best_trap_code,
        "topTrapCode": best_trap_code,
        "trapKidName": trap_meta.get("kidName", best_trap_code),
        "trapParentName": trap_meta.get("parentName", best_trap_code),
        "trapCount": best_trap_cnt,
        "trapRemediation": trap_meta.get("remediation", ""),
        "headline": f"{top_dom['parentLabel']} ({top_dom['masteryPct']}% Mastery)",
        "parentSummary": (
            f"{top_dom['parentLabel']} is currently {student_name.split()[0]}'s #1 priority focus area at "
            f"{top_dom['masteryPct']}% mastery (Priority Deficit Score: {top_dom['priorityDeficitScore']}). "
            f"Primary vulnerability: {trap_meta.get('parentName', best_trap_code)} — {trap_meta.get('remediation', '')}"
        ),
        "recommendedWorkoutId": rec_workout_id,
        "recommendedWorkoutTitle": rec_workout_title,
    }

    avg_sec = round(total_seconds_spent / total_items_attempted, 1) if total_items_attempted > 0 else 0.0
    pacing_stats = {
        "totalItemsAttempted": total_items_attempted,
        "totalSecondsSpent": round(total_seconds_spent, 1),
        "avgSecondsPerItem": avg_sec,
        "impulsiveCount": impulsive_count,
        "hesitationCount": hesitation_count,
        "optimalCount": optimal_pace_count,
    }

    xp_val = int(progress.get("xp", 450))
    level_num = max(1, (xp_val // 100) + 1)

    progress["estimatedLexile"] = estimated_lexile
    progress["estimatedSEM"] = estimated_sem
    progress["lexileDelta"] = estimated_lexile - 940
    progress["gapToAC"] = max(0, 1075 - estimated_lexile)
    progress["acQualificationStatus"] = ac_status
    progress["currentTier"] = current_tier
    progress["xp"] = xp_val
    progress["level"] = level_num
    progress["levelTitle"] = f"Level {level_num}"
    progress["levelProgressPct"] = xp_val % 100
    progress["streakDays"] = int(progress.get("streakDays", 5))
    progress["lastPracticeDate"] = progress.get("lastPracticeDate", "2026-10-04")
    progress["queuedWorkoutId"] = progress.get("queuedWorkoutId", None)
    progress["queuedDomainId"] = progress.get("queuedDomainId", None)
    progress["completedWorkoutIds"] = completed_workout_ids
    progress["domainMastery"] = domain_mastery
    progress["domainMasteryList"] = domain_mastery_list
    progress["literaryAccuracyPct"] = overall_lit_pct
    progress["informationalAccuracyPct"] = overall_info_pct
    progress["genreStats"] = {
        "Literary": {
            "attempted": total_lit_rec_attempted,
            "correct": total_lit_rec_correct,
            "accuracyPct": overall_lit_pct,
        },
        "Informational": {
            "attempted": total_info_rec_attempted,
            "correct": total_info_rec_correct,
            "accuracyPct": overall_info_pct,
        },
    }
    progress["trapCounts"] = trap_counts
    progress["ebsrStats"] = ebsr_stats
    progress["pacingStats"] = pacing_stats
    progress["pacingMetrics"] = pacing_stats
    progress["avgSecondsPerItem"] = avg_sec
    progress["impulsiveCount"] = impulsive_count
    progress["hesitationCount"] = hesitation_count
    progress["totalItemsAttempted"] = total_items_attempted
    progress["totalFirstTryCorrect"] = total_first_try_correct
    progress["totalRetryCorrect"] = total_retry_correct
    progress["overallFirstTryPct"] = int(round((total_first_try_correct / total_items_attempted) * 100.0)) if total_items_attempted > 0 else 69
    progress["topWeakness"] = top_weakness

    return progress


def build_default_v2_progress(student_id: str = "lucas") -> Dict[str, Any]:
    clean_id = student_id.lower().replace(" ", "_")
    curriculum = load_curriculum_matrix()
    seed = {
        "studentId": clean_id,
        "studentName": "Evelyn Mietling" if "evelyn" in clean_id else "Lucas Ramirez",
        "xp": 450,
        "streakDays": 5,
        "lastPracticeDate": "2026-10-04",
        "queuedWorkoutId": None,
        "queuedDomainId": None,
        "completedWorkoutIds": [],
        "trialHistory": [],
    }
    return recalculate_v2_progress(seed, curriculum)


def get_local_filename_v2(student_id: str) -> str:
    clean_id = student_id.lower().replace(" ", "_")
    return f"/tmp/{clean_id}_v2_progress.json"


def read_local_fallback_v2(student_id: str) -> Dict[str, Any]:
    clean_id = student_id.lower().replace(" ", "_")
    file_path = get_local_filename_v2(clean_id)
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return recalculate_v2_progress(data)
        except Exception as e:
            logger.error(f"Error reading V2 local storage file: {e}")

    default_data = build_default_v2_progress(clean_id)
    write_local_fallback_v2(clean_id, default_data)
    return default_data


def write_local_fallback_v2(student_id: str, data: Dict[str, Any]):
    clean_id = student_id.lower().replace(" ", "_")
    file_path = get_local_filename_v2(clean_id)
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing to V2 local storage file: {e}")


def load_v2_progress_store(student_id: str) -> Dict[str, Any]:
    clean_id = student_id.lower().replace(" ", "_")
    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME_V2).document(clean_id)
            doc = doc_ref.get()
            if doc.exists:
                data = recalculate_v2_progress(doc.to_dict() or {"studentId": clean_id})
                write_local_fallback_v2(clean_id, data)
                return data
            else:
                default_data = build_default_v2_progress(clean_id)
                doc_ref.set(default_data)
                write_local_fallback_v2(clean_id, default_data)
                return default_data
        except Exception as e:
            logger.error(f"Firestore V2 read error: {e}. Falling back to local storage.")
            return read_local_fallback_v2(clean_id)
    else:
        return read_local_fallback_v2(clean_id)


def save_v2_progress_store(student_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    clean_id = student_id.lower().replace(" ", "_")
    data["studentId"] = clean_id
    recalculated = recalculate_v2_progress(data)
    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME_V2).document(clean_id)
            doc_ref.set(recalculated)
            logger.info(f"V2 progress saved to Firestore for student: {clean_id}")
        except Exception as e:
            logger.error(f"Firestore V2 write error: {e}. Saving locally.")
    write_local_fallback_v2(clean_id, recalculated)
    return recalculated


# ==============================================================================
# V1 REST ENDPOINTS (Preserved)
# ==============================================================================

@app.get("/api/progress")
def get_progress(student_id: str = "lucas"):
    """Retrieve V1 student progress for a specific student from Firestore or fallback storage."""
    clean_id = student_id.lower().replace(" ", "_")
    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME_V1).document(clean_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            else:
                default_data = json.loads(json.dumps(DEFAULT_PROGRESS))
                default_data["studentId"] = clean_id
                default_data["studentName"] = "Evelyn Mietling" if "evelyn" in clean_id else "Lucas Ramirez"
                doc_ref.set(default_data)
                return default_data
        except Exception as e:
            logger.error(f"Firestore read error: {e}. Falling back to local storage.")
            return read_local_fallback_v1(clean_id)
    else:
        return read_local_fallback_v1(clean_id)


@app.post("/api/progress")
def save_progress(progress: ProgressModel):
    """Save updated V1 student progress to Firestore or fallback storage."""
    data = progress.model_dump()
    clean_id = (progress.studentId or "lucas").lower().replace(" ", "_")
    data["studentId"] = clean_id

    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME_V1).document(clean_id)
            doc_ref.set(data, merge=True)
            logger.info(f"Progress saved to Firestore for student: {clean_id}")
        except Exception as e:
            logger.error(f"Firestore write error: {e}. Saving locally.")
            write_local_fallback_v1(clean_id, data)
    else:
        write_local_fallback_v1(clean_id, data)
    return {"status": "success", "data": data}


@app.post("/api/reset")
def reset_progress(student_id: str = "lucas"):
    """Reset V1 progress back to default baseline for a given student."""
    clean_id = student_id.lower().replace(" ", "_")
    default_data = json.loads(json.dumps(DEFAULT_PROGRESS))
    default_data["studentId"] = clean_id
    default_data["studentName"] = "Evelyn Mietling" if "evelyn" in clean_id else "Lucas Ramirez"

    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME_V1).document(clean_id)
            doc_ref.set(default_data)
            logger.info(f"Firestore progress reset for student: {clean_id}")
        except Exception as e:
            logger.error(f"Firestore reset error: {e}")
    write_local_fallback_v1(clean_id, default_data)
    return {"status": "reset", "data": default_data}


# ==============================================================================
# V2 REST ENDPOINTS
# ==============================================================================

@app.get("/api/v2/curriculum")
def get_v2_curriculum():
    """Return the parsed contents of app/data/curriculum_matrix.json."""
    return load_curriculum_matrix()


@app.get("/api/v2/workouts")
def get_v2_workouts():
    """Scan app/data/daily_workouts/*.json, sort by workoutNumber ascending, and return workouts."""
    workouts = load_all_workouts()
    return {"workouts": workouts}


@app.get("/api/v2/progress")
def get_v2_progress(student_id: str = "lucas"):
    """Return the student's V2 progress document anchored at Lucas's 940L Fall Grade 5 baseline."""
    return load_v2_progress_store(student_id)


@app.post("/api/v2/progress")
def save_v2_progress(payload: Dict[str, Any] = Body(...), student_id: Optional[str] = None):
    """Save full V2 progress state to Firestore (student_progress_v2) and local fallback."""
    resolved_id = (student_id or payload.get("studentId") or "lucas").lower().replace(" ", "_")
    saved = save_v2_progress_store(resolved_id, payload)
    return {"status": "success", "data": saved}


@app.post("/api/v2/trial")
def record_v2_trial(payload: Dict[str, Any] = Body(...), student_id: Optional[str] = None):
    """
    Append a completed daily workout trial to trialHistory, recalculate V2 progress metrics,
    persist to Firestore + local fallback, and return the updated state.
    """
    resolved_id = (
        student_id
        or payload.get("studentId")
        or (payload.get("trial", {}) if isinstance(payload.get("trial"), dict) else {}).get("studentId")
        or "lucas"
    ).lower().replace(" ", "_")

    current_prog = load_v2_progress_store(resolved_id)

    # Extract trial object whether wrapped in {"trial": ...} or sent at top level
    trial_obj = payload.get("trial") if isinstance(payload.get("trial"), dict) else dict(payload)
    trial_obj.pop("progress", None)

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    trial_id = trial_obj.get("trialId") or trial_obj.get("sessionId") or f"trial_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{resolved_id}"
    trial_obj["trialId"] = trial_id
    trial_obj["sessionId"] = trial_id
    trial_obj["studentId"] = resolved_id
    trial_obj["timestampISO"] = trial_obj.get("timestampISO") or trial_obj.get("completedAt") or now_iso
    trial_obj["completedAt"] = trial_obj["timestampISO"]

    items = trial_obj.get("itemAttempts")
    if not isinstance(items, list):
        items = trial_obj.get("items") if isinstance(trial_obj.get("items"), list) else []
    trial_obj["itemAttempts"] = items
    trial_obj["items"] = items

    q_count = len(items) or int(trial_obj.get("questionsAttempted", 0))
    first_correct = sum(1 for it in items if (it.get("firstTryCorrect") if "firstTryCorrect" in it else it.get("isCorrect"))) if items else int(trial_obj.get("firstTryCorrectCount", 0))
    retry_correct = sum(1 for it in items if it.get("retryCorrect", True if (it.get("firstTryCorrect") if "firstTryCorrect" in it else it.get("isCorrect")) else False)) if items else int(trial_obj.get("retryCorrectCount", first_correct))
    total_dur = sum(float(it.get("timeSpentSeconds") if "timeSpentSeconds" in it else it.get("secondsSpent", 0.0)) for it in items) if items else float(trial_obj.get("totalDurationSeconds", 0.0))

    trial_obj["questionsAttempted"] = q_count
    trial_obj["firstTryCorrectCount"] = first_correct
    trial_obj["firstTryAccuracyPct"] = round((first_correct / q_count) * 100.0, 1) if q_count > 0 else float(trial_obj.get("firstTryAccuracyPct", 0.0))
    trial_obj["retryCorrectCount"] = retry_correct
    trial_obj["retryAccuracyPct"] = round((retry_correct / q_count) * 100.0, 1) if q_count > 0 else float(trial_obj.get("retryAccuracyPct", 100.0))
    trial_obj["totalDurationSeconds"] = round(total_dur, 1)
    trial_obj["avgSecondsPerItem"] = round(total_dur / q_count, 1) if q_count > 0 else 0.0

    # Replace if trialId already exists, else append with twin-trial deduplication
    history: List[Dict[str, Any]] = current_prog.get("trialHistory", [])
    existing_idx = next((i for i, t in enumerate(history) if (t.get("trialId") == trial_id or t.get("sessionId") == trial_id)), None)
    if existing_idx is not None:
        history[existing_idx] = trial_obj
    else:
        before_len = len(history)
        history = deduplicate_trial_history(history + [trial_obj])
        if len(history) > before_len:
            # Award XP for new non-duplicate trial
            xp_gain = int(trial_obj.get("xpEarned", (first_correct * 15) + max(0, retry_correct - first_correct) * 8 + 20))
            current_prog["xp"] = int(current_prog.get("xp", 450)) + xp_gain

    current_prog["trialHistory"] = history
    current_prog["lastPracticeDate"] = trial_obj["timestampISO"][:10]

    # Clear queued workout if completed
    if trial_obj.get("workoutId") and current_prog.get("queuedWorkoutId") == trial_obj.get("workoutId"):
        current_prog["queuedWorkoutId"] = None
        current_prog["queuedDomainId"] = None

    saved = save_v2_progress_store(resolved_id, current_prog)
    trial_obj["rollingLexileEstimateAfter"] = saved.get("estimatedLexile", 940)
    write_local_fallback_v2(resolved_id, saved)
    return {"status": "success", "trial": trial_obj, "data": saved}


@app.delete("/api/v2/trial/{trial_id}")
def delete_v2_trial(trial_id: str, student_id: str = "lucas"):
    """Remove a specific trial by trialId from trialHistory and persist updated V2 state."""
    clean_id = student_id.lower().replace(" ", "_")
    current_prog = load_v2_progress_store(clean_id)
    history: List[Dict[str, Any]] = current_prog.get("trialHistory", [])
    removed_one = False
    new_history: List[Dict[str, Any]] = []
    for t in history:
        if not removed_one and (t.get("trialId") == trial_id or t.get("sessionId") == trial_id):
            removed_one = True
            continue
        new_history.append(t)
    current_prog["trialHistory"] = new_history
    saved = save_v2_progress_store(clean_id, current_prog)
    return {"status": "deleted", "trialId": trial_id, "data": saved}


@app.post("/api/v2/queue")
def queue_v2_workout(payload: Dict[str, Any] = Body(...), student_id: Optional[str] = None):
    """Queue a targeted workout or focus domain for the student's next practice session."""
    resolved_id = (student_id or payload.get("studentId") or "lucas").lower().replace(" ", "_")
    current_prog = load_v2_progress_store(resolved_id)
    workouts = load_all_workouts()
    completed = current_prog.get("completedWorkoutIds") or []

    target = str(payload.get("target") or payload.get("workoutId") or payload.get("domainId") or payload.get("focusDomain") or "").strip()
    explicit_wid = payload.get("workoutId")
    explicit_did = payload.get("domainId") or payload.get("focusDomain")

    if explicit_wid:
        w_match = next((w for w in workouts if w.get("workoutId") == explicit_wid), None)
        current_prog["queuedWorkoutId"] = explicit_wid
        current_prog["queuedDomainId"] = explicit_did or (w_match.get("focusDomain") if w_match else None)
    elif explicit_did or target in DOMAIN_BASELINE_SEEDS:
        d_target = explicit_did or target
        current_prog["queuedDomainId"] = d_target
        target_lex = int(current_prog.get("estimatedLexile") or 940) + 25
        sort_key = lambda w: (abs(int(w.get("targetLexile") or 960) - target_lex), int(w.get("workoutNumber") or 999))
        uncomp = sorted(
            [w for w in workouts if w.get("focusDomain") == d_target and w.get("workoutId") not in completed],
            key=sort_key,
        )
        any_dom = sorted(
            [w for w in workouts if w.get("focusDomain") == d_target],
            key=sort_key,
        )
        chosen = (uncomp or any_dom or [None])[0]
        current_prog["queuedWorkoutId"] = chosen.get("workoutId") if chosen else None
    elif target:
        w_match = next((w for w in workouts if w.get("workoutId") == target), None)
        current_prog["queuedWorkoutId"] = target
        current_prog["queuedDomainId"] = w_match.get("focusDomain") if w_match else None
    else:
        current_prog["queuedWorkoutId"] = None
        current_prog["queuedDomainId"] = None

    saved = save_v2_progress_store(resolved_id, current_prog)
    return {
        "status": "queued",
        "queuedWorkoutId": saved.get("queuedWorkoutId"),
        "queuedDomainId": saved.get("queuedDomainId"),
        "data": saved,
    }


@app.post("/api/v2/reset")
def reset_v2_progress(student_id: str = "lucas"):
    """Reset the student's V2 state back to the clean 940L Fall G5 baseline."""
    clean_id = student_id.lower().replace(" ", "_")
    default_data = build_default_v2_progress(clean_id)
    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME_V2).document(clean_id)
            doc_ref.set(default_data)
            logger.info(f"Firestore V2 progress reset for student: {clean_id}")
        except Exception as e:
            logger.error(f"Firestore V2 reset error: {e}")
    write_local_fallback_v2(clean_id, default_data)
    return {"status": "reset", "data": default_data}


# ==============================================================================
# STATIC FILES & HTML ROUTES
# ==============================================================================

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def read_root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/v1")
def read_v1_root():
    v1_path = os.path.join(STATIC_DIR, "v1_index.html")
    if os.path.exists(v1_path):
        return FileResponse(v1_path)
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


def run_stdlib_http_server(host: str = "0.0.0.0", port: int = 8000):
    """Fallback stdlib HTTP server when uvicorn/fastapi are not installed in host Python."""
    import mimetypes

    class BeaconRequestHandler(BaseHTTPRequestHandler):
        def _send_json(self, status_code: int, payload: Any):
            raw = json.dumps(payload).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def _send_file(self, filepath: str):
            if not os.path.isfile(filepath):
                self._send_json(404, {"detail": "File not found"})
                return
            ctype, _ = mimetypes.guess_type(filepath)
            ctype = ctype or "application/octet-stream"
            with open(filepath, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            qs = urllib.parse.parse_qs(parsed.query)
            student_id = qs.get("student_id", ["lucas"])[0]

            if path == "/":
                return self._send_file(os.path.join(STATIC_DIR, "index.html"))
            if path == "/v1":
                v1_p = os.path.join(STATIC_DIR, "v1_index.html")
                return self._send_file(v1_p if os.path.exists(v1_p) else os.path.join(STATIC_DIR, "index.html"))
            if path.startswith("/static/"):
                rel = path[len("/static/"):]
                safe_path = os.path.abspath(os.path.join(STATIC_DIR, rel))
                if safe_path.startswith(os.path.abspath(STATIC_DIR)):
                    return self._send_file(safe_path)
                return self._send_json(403, {"detail": "Forbidden"})
            if path == "/api/progress":
                return self._send_json(200, get_progress(student_id=student_id))
            if path == "/api/v2/curriculum":
                return self._send_json(200, get_v2_curriculum())
            if path == "/api/v2/workouts":
                return self._send_json(200, get_v2_workouts())
            if path == "/api/v2/progress":
                return self._send_json(200, get_v2_progress(student_id=student_id))
            return self._send_json(404, {"detail": f"Not found: {path}"})

        def do_POST(self):
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            qs = urllib.parse.parse_qs(parsed.query)
            student_id = qs.get("student_id", [None])[0]
            length = int(self.headers.get("Content-Length", "0") or "0")
            body_bytes = self.rfile.read(length) if length > 0 else b"{}"
            try:
                payload = json.loads(body_bytes.decode("utf-8") or "{}")
            except Exception:
                payload = {}

            if path == "/api/progress":
                model = ProgressModel(**payload)
                return self._send_json(200, save_progress(model))
            if path == "/api/reset":
                return self._send_json(200, reset_progress(student_id=student_id or "lucas"))
            if path == "/api/v2/progress":
                return self._send_json(200, save_v2_progress(payload=payload, student_id=student_id))
            if path == "/api/v2/trial":
                return self._send_json(200, record_v2_trial(payload=payload, student_id=student_id))
            if path == "/api/v2/queue":
                return self._send_json(200, queue_v2_workout(payload=payload, student_id=student_id))
            if path == "/api/v2/reset":
                return self._send_json(200, reset_v2_progress(student_id=student_id or "lucas"))
            return self._send_json(404, {"detail": f"Not found: {path}"})

        def do_DELETE(self):
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            qs = urllib.parse.parse_qs(parsed.query)
            student_id = qs.get("student_id", ["lucas"])[0]
            if path.startswith("/api/v2/trial/"):
                trial_id = urllib.parse.unquote(path[len("/api/v2/trial/"):])
                return self._send_json(200, delete_v2_trial(trial_id=trial_id, student_id=student_id))
            return self._send_json(404, {"detail": f"Not found: {path}"})

    HTTPServer.allow_reuse_address = True
    server = HTTPServer((host, port), BeaconRequestHandler)
    logger.info(f"Serving DRC BEACON ELA App (V1 + V2) on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    port_num = int(os.getenv("PORT", "8000"))
    try:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=port_num)
    except ImportError:
        run_stdlib_http_server(host="0.0.0.0", port=port_num)

