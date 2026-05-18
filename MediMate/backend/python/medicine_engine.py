#Medcine_engine.py
import os
import re
import json
import pickle
import urllib.request
import requests
from sklearn.metrics.pairwise import cosine_similarity
from rapidfuzz import process, fuzz

# ─────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "corrector_model.pkl")
DETAILS_PATH = os.path.join(BASE_DIR, "data", "medicine_details.json")
COMP_PATH = os.path.join(BASE_DIR, "data", "composition_lookup.json")

# ─────────────────────────────────────────────
# LOAD MODEL
# ─────────────────────────────────────────────
with open(MODEL_PATH, "rb") as f:
    _model = pickle.load(f)

MEDICINE_LIST = _model["medicine_list"]
VECTORIZER = _model["vectorizer"]
TFIDF_MATRIX = _model["tfidf_matrix"]

# ─────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────
with open(DETAILS_PATH, "r") as f:
    MEDICINE_DETAILS = json.load(f)

with open(COMP_PATH, "r") as f:
    COMPOSITION_LOOKUP = json.load(f)

# ─────────────────────────────────────────────
# CLEAN TEXT
# ─────────────────────────────────────────────
def _clean(text):
    text = text.lower()
    text = re.sub(r"\b(tablet|capsule|syrup|mg|ml|injection)\b", "", text)
    return re.sub(r"[^a-z0-9 ]", "", text).strip()

# ─────────────────────────────────────────────
# NORMALIZE DATASET KEYS (🔥 IMPORTANT FIX)
# ─────────────────────────────────────────────
NORMALIZED_DETAILS = {}

for key, value in MEDICINE_DETAILS.items():
    clean_key = _clean(key)
    NORMALIZED_DETAILS[clean_key] = value

# ─────────────────────────────────────────────
# FINAL CLEAN
# ─────────────────────────────────────────────
def _final_clean(text):
    text = str(text)
    text = re.sub(r"\b(indications?|usage|adverse reactions?)\b", "", text, flags=re.I)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

# ─────────────────────────────────────────────
# FORMAT OUTPUT
# ─────────────────────────────────────────────
def _format_medical_text(text, label):
    if not text:
        return f"{label}: Not available"

    parts = re.split(r"[.;]", str(text))

    cleaned = []
    for p in parts:
        p = p.strip()
        if len(p) > 5:
            cleaned.append(p.capitalize())

    if not cleaned:
        return f"{label}: Not available"

    emoji = "💊" if label == "Uses" else "⚠️"
    return emoji + " " + label + ":\n" + "\n".join([f"• {x}" for x in cleaned[:4]])

# ─────────────────────────────────────────────
# SPELL CORRECTION
# ─────────────────────────────────────────────
def _correct_spelling(token):
    token = _clean(token)

    match1, score1, _ = process.extractOne(token, MEDICINE_LIST, scorer=fuzz.token_sort_ratio)

    base = token.split()[0]
    match2, score2, _ = process.extractOne(base, MEDICINE_LIST, scorer=fuzz.ratio)

    if score2 > score1:
        match1, score1 = match2, score2

    return match1 if score1 > 70 else token

# ─────────────────────────────────────────────
# CLEAN OPENFDA TEXT
# ─────────────────────────────────────────────
def _clean_fda_text(text):
    if not text:
        return ""

    text = re.sub(r"\b\d+\b", " ", text)
    text = re.sub(r"\[.*?\]", "", text)
    text = re.sub(r"[^a-zA-Z0-9., ]", " ", text)
    text = re.sub(r"\s+", " ", text)

    sentences = re.split(r"\.", text)

    clean = []
    for s in sentences:
        s = s.strip()
        if 20 < len(s) < 200:
            clean.append(s)

    return ". ".join(clean[:3])

# ─────────────────────────────────────────────
# OPENFDA
# ─────────────────────────────────────────────
def _fetch_openfda(name):
    try:
        clean = re.sub(r"[^a-zA-Z ]", " ", name).lower()
        words = clean.split()

        queries = [clean]
        if words:
            queries.append(words[0])
            if len(words) > 1:
                queries.append(" ".join(words[:2]))

        for q in queries:
            try:
                url = f'https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{q}"&limit=1'
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

                with urllib.request.urlopen(req, timeout=5) as r:
                    data = json.loads(r.read())

                result = data["results"][0]

                uses = _clean_fda_text(" ".join(result.get("indications_and_usage", [])))
                side = _clean_fda_text(" ".join(result.get("adverse_reactions", [])))

                if uses or side:
                    return {"uses": uses, "side_effects": side}

            except:
                continue

    except:
        pass

    return {"uses": "", "side_effects": ""}

# ─────────────────────────────────────────────
# RXNORM
# ─────────────────────────────────────────────
def _fetch_rxnorm_name(name):
    try:
        url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={name}"
        res = requests.get(url, timeout=5).json()

        ids = res.get("idGroup", {}).get("rxnormId", [])
        if not ids:
            return None

        rxcui = ids[0]

        prop_url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/properties.json"
        prop = requests.get(prop_url, timeout=5).json()

        return prop.get("properties", {}).get("name")

    except:
        return None

# ─────────────────────────────────────────────
# GROQ AI FALLBACK (IMPROVED PROMPT)
# ─────────────────────────────────────────────
def _fetch_ai_fallback(name):
    try:
        GROQ_API_KEY = os.getenv("GROQ_API_KEY")

        prompt = f"""
You are a medical assistant.

Provide accurate information for medicine: {name}

Rules:
- Short and precise
- No repetition
- No numbering

Format:

Uses:
- ...
- ...

Side Effects:
- ...
- ...
"""
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2
            }
        )

        if response.status_code != 200:
            return None

        text = response.json()["choices"][0]["message"]["content"]

        uses, side = [], []
        mode = None

        for line in text.split("\n"):
            line = line.strip()

            if line.lower().startswith("uses"):
                mode = "uses"
                continue
            elif line.lower().startswith("side"):
                mode = "side"
                continue

            if line.startswith("-"):
                item = line.replace("-", "").strip()

                if mode == "uses":
                    uses.append(item)
                elif mode == "side":
                    side.append(item)

        return {
            "uses": ". ".join(uses),
            "side_effects": ". ".join(side)
        }

    except:
        return None

# ─────────────────────────────────────────────
# CORE ENGINE (FINAL FLOW)
# ─────────────────────────────────────────────
def _get_medicine_info(name):

    cleaned = _clean(name)
    base = cleaned.split()[0]

    # 1️⃣ RXNORM FIRST
    rx = _fetch_rxnorm_name(base)
    if rx:
        rx_clean = _clean(rx)

        if rx_clean in NORMALIZED_DETAILS:
            data = NORMALIZED_DETAILS[rx_clean]
            return {
                "uses": data.get("uses", ""),
                "side_effects": data.get("side_effects", ""),
                "source": "DATASET"
            }

    # 2️⃣ DATASET EXACT
    if cleaned in NORMALIZED_DETAILS:
        data = NORMALIZED_DETAILS[cleaned]
        return {
            "uses": data.get("uses", ""),
            "side_effects": data.get("side_effects", ""),
            "source": "DATASET"
        }

    if base in NORMALIZED_DETAILS:
        data = NORMALIZED_DETAILS[base]
        return {
            "uses": data.get("uses", ""),
            "side_effects": data.get("side_effects", ""),
            "source": "DATASET"
        }

    # 3️⃣ DATASET FUZZY
    match, score, _ = process.extractOne(
        cleaned,
        list(NORMALIZED_DETAILS.keys()),
        scorer=fuzz.token_sort_ratio
    )
    if score > 80:
        data = NORMALIZED_DETAILS[match]
        return {
            "uses": data.get("uses", ""),
            "side_effects": data.get("side_effects", ""),
            "source": "DATASET"
        }

    # 4️⃣ COMPOSITION → OPENFDA
    comp = COMPOSITION_LOOKUP.get(cleaned)
    if comp:
        api = _fetch_openfda(comp)
        if api["uses"]:
            return {
                "uses": api["uses"],
                "side_effects": api["side_effects"],
                "source": "OPENFDA"
            }
    # 5️⃣ OPENFDA DIRECT
    api = _fetch_openfda(base)
    if api["uses"]:
        return {
            "uses": api["uses"],
            "side_effects": api["side_effects"],
            "source": "OPENFDA"
        }

    # 6️⃣ RXNORM → OPENFDA
    if rx:
        api = _fetch_openfda(rx)
        if api["uses"]:
            return {
                "uses": api["uses"],
                "side_effects": api["side_effects"],
                "source": "RXNORM"
            }

    # 7️⃣ GROQ AI
    ai = _fetch_ai_fallback(base)
    if ai:
        return {
            "uses": _final_clean(ai["uses"]),
            "side_effects": _final_clean(ai["side_effects"]),
            "source": "AI"
        }

    # 8️⃣ DEFAULT
    return {
        "uses": "Consult doctor",
        "side_effects": "Not available",
        "source": "DEFAULT"
    }

# ─────────────────────────────────────────────
# MATCH ENGINE
# ─────────────────────────────────────────────
def _find_match(token):
    cleaned = _clean(token)

    vec = VECTORIZER.transform([cleaned])
    sims = cosine_similarity(vec, TFIDF_MATRIX).flatten()

    idx = sims.argmax()
    score = sims[idx]

    if score < 0.30:
        return None, 0

    return MEDICINE_LIST[idx], score * 100

# ─────────────────────────────────────────────
# MAIN MATCH
# ─────────────────────────────────────────────
def match_medicine(token):

    corrected = _correct_spelling(token)

    name, conf = _find_match(corrected)

    if not name:
        name = corrected
        conf = 50

    info = _get_medicine_info(name)

    return {
        "name": name,
        "uses": _format_medical_text(info.get("uses"), "Uses"),
        "side_effects": _format_medical_text(info.get("side_effects"), "Side Effects"),
        "confidence": round(conf, 1),
        "source": info.get("source", "AI")
    }

# ─────────────────────────────────────────────
# EXTRACT
# ─────────────────────────────────────────────
def extract_medicines(text):

    lines = re.split(r"\n|•", text)

    seen = set()
    result = []

    for line in lines:
        line = line.strip()
        if len(line) < 3:
            continue

        r = match_medicine(line)

        if r and r["name"] not in seen:
            seen.add(r["name"])
            result.append(r)

    return result

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def parse_prescription(text):
    return {
        "medicines": extract_medicines(text)
    }