"""
generate_dashboard_cards.py

Reads src/data/config/subjects.json (single source of truth for per-subject
config, same file generate_notes.py already reads) -> writes
src/data/index/dashboard-cards.json.

dashboard-cards.json was previously hand-authored. Two things this script
changes on top of just automating it:

- Subject cards (type "subject") are now fully derived from subjects.json:
  one card per entry, in subjects.json's own order, with
  `url: /notes-index/{subjectId}` — the clean-path route the React app's
  <Route path="/notes-index/:subject"> actually serves. (`/notes` is a
  legacy redirect only — see App.tsx's OldNotesRedirect — never the target
  for a freshly generated card.)
- Adding a subject to subjects.json is enough; no manual dashboard-cards.json
  edit needed, matching how generate_notes.py already treats subjects.json.

Non-subject ("standalone") cards — e.g. quiz, calendar — have no source of
truth outside dashboard-cards.json itself, so they are never generated:
this script loads whatever's already in the existing output file, keeps
every entry whose type isn't "subject" exactly as-is (all fields, original
order), and re-emits them after the freshly-built subject cards. This is
deliberately generic — it doesn't hardcode "quiz" or "calendar" by name —
so any standalone card added by hand keeps round-tripping through future
runs without this script needing to know it exists.

If the existing output file is missing or unreadable, generation still
proceeds (subject cards only) with a warning, since subjects.json is the
only data this script actually depends on.

Run from python/: python generate_dashboard_cards.py
"""

import os
import json

SUBJECTS_JSON_PATH = "../web/public/data/config/subjects.json"
OUTPUT = "../web/public/data/index/dashboard-cards.json"

REQUIRED_SUBJECT_FIELDS = ("label", "icon", "description")


def load_subjects() -> dict:
    try:
        with open(SUBJECTS_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ subjects.json not found at {SUBJECTS_JSON_PATH} — cannot build without the subject registry.")
        raise SystemExit(1)
    except json.JSONDecodeError as e:
        print(f"❌ subjects.json at {SUBJECTS_JSON_PATH} is not valid JSON: {e}")
        raise SystemExit(1)

    if not data:
        print(f"❌ subjects.json at {SUBJECTS_JSON_PATH} is empty — need at least one subject.")
        raise SystemExit(1)

    return data


def load_existing_standalone_cards() -> list[dict]:
    """Preserve every non-subject card from the current output file as-is.

    Generic on purpose: doesn't assume "quiz" is the only standalone card,
    or that there's exactly one. Anything with type != "subject" round-trips
    unchanged; a missing/unreadable file just means no standalone cards to
    carry forward (non-fatal — subjects.json is still enough to build the
    subject cards).
    """
    try:
        with open(OUTPUT, "r", encoding="utf-8") as f:
            existing = json.load(f)
    except FileNotFoundError:
        print(f"  ⚠️  No existing {OUTPUT} found — starting with 0 standalone cards.")
        return []
    except json.JSONDecodeError as e:
        print(f"  ⚠️  Existing {OUTPUT} is not valid JSON ({e}) — starting with 0 standalone cards.")
        return []

    cards = existing.get("cards", [])
    standalone = [c for c in cards if c.get("type") != "subject"]
    print(f"  Preserved {len(standalone)} standalone card(s): {[c.get('id') for c in standalone]}")
    return standalone


def build_subject_cards(subjects: dict) -> list[dict]:
    cards = []
    for subject_id, cfg in subjects.items():
        missing = [field for field in REQUIRED_SUBJECT_FIELDS if not cfg.get(field)]
        if missing:
            print(f"  ⚠️  SKIP subject '{subject_id}': missing {missing}")
            continue

        cards.append({
            "id": subject_id,
            "label": cfg["label"],
            "icon": cfg["icon"],
            "description": cfg["description"],
            "type": "subject",
            "url": f"/notes-index/{subject_id}",
        })
    return cards


def main():
    subjects = load_subjects()
    subject_cards = build_subject_cards(subjects)
    standalone_cards = load_existing_standalone_cards()

    cards = subject_cards + standalone_cards

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"cards": cards}, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"✅ Wrote {len(subject_cards)} subject card(s) + {len(standalone_cards)} standalone card(s) to {OUTPUT}")


if __name__ == "__main__":
    main()
