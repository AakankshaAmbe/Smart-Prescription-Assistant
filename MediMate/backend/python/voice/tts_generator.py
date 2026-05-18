from gtts import gTTS
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

FREQ_MAP = {
    "hindi": {
        "once daily":   "दिन में एक बार",
        "twice daily":  "दिन में दो बार",
        "thrice daily": "दिन में तीन बार",
        "once":         "दिन में एक बार",
        "twice":        "दिन में दो बार",
        "as directed":  "डॉक्टर के निर्देशानुसार",
    },
    "marathi": {
        "once daily":   "दिवसातून एक वेळा",
        "twice daily":  "दिवसातून दोन वेळा",
        "thrice daily": "दिवसातून तीन वेळा",
        "once":         "दिवसातून एक वेळा",
        "twice":        "दिवसातून दोन वेळा",
        "as directed":  "डॉक्टरांच्या सल्ल्यानुसार",
    }
}

INSTR_MAP = {
    "hindi": {
        "after food":  "खाने के बाद",
        "before food": "खाने से पहले",
        "with water":  "पानी के साथ",
        "at night":    "रात को",
        "in morning":  "सुबह",
    },
    "marathi": {
        "after food":  "जेवणानंतर",
        "before food": "जेवणाआधी",
        "with water":  "पाण्यासोबत",
        "at night":    "रात्री",
        "in morning":  "सकाळी",
    }
}

def build_script(data: dict, lang: str) -> str:
    patient = data.get("patient_name", "Patient")
    medicines = data.get("medicines", [])

    if lang == "hindi":
        lines = [f"नमस्ते {patient}। आपकी दवाओं की जानकारी सुनिए।"]
        for m in medicines:
            name  = m.get("name", "")      if isinstance(m, dict) else str(m)
            dose  = m.get("dosage", "")    if isinstance(m, dict) else ""
            freq  = m.get("frequency", "") if isinstance(m, dict) else ""
            instr = m.get("instruction","")if isinstance(m, dict) else ""
            dur   = m.get("duration", "")  if isinstance(m, dict) else ""

            freq  = FREQ_MAP["hindi"].get(freq.lower().strip(), freq)
            instr = INSTR_MAP["hindi"].get(instr.lower().strip(), instr)

            line = f"{name} {dose}".strip()
            if freq:  line += f", {freq}"
            if instr: line += f", {instr}"
            if dur:   line += f", {dur} तक"
            lines.append(line + " लें।")
        lines.append("अपनी दवाएं समय पर लें। जल्दी ठीक हों।")

    elif lang == "marathi":
        lines = [f"नमस्कार {patient}। आपल्या औषधांची माहिती ऐका।"]
        for m in medicines:
            name  = m.get("name", "")      if isinstance(m, dict) else str(m)
            dose  = m.get("dosage", "")    if isinstance(m, dict) else ""
            freq  = m.get("frequency", "") if isinstance(m, dict) else ""
            instr = m.get("instruction","")if isinstance(m, dict) else ""
            dur   = m.get("duration", "")  if isinstance(m, dict) else ""

            freq  = FREQ_MAP["marathi"].get(freq.lower().strip(), freq)
            instr = INSTR_MAP["marathi"].get(instr.lower().strip(), instr)

            line = f"{name} {dose}".strip()
            if freq:  line += f", {freq}"
            if instr: line += f", {instr}"
            if dur:   line += f", {dur} साठी"
            lines.append(line + " घ्या।")
        lines.append("औषधे वेळेवर घ्या। लवकर बरे व्हा।")

    else:  # english
        lines = [f"Hello {patient}. Here are your medicine instructions."]
        for m in medicines:
            name  = m.get("name", "")      if isinstance(m, dict) else str(m)
            dose  = m.get("dosage", "")    if isinstance(m, dict) else ""
            freq  = m.get("frequency", "") if isinstance(m, dict) else ""
            instr = m.get("instruction","")if isinstance(m, dict) else ""
            dur   = m.get("duration", "")  if isinstance(m, dict) else ""

            line = f"Take {name} {dose}".strip()
            if freq:  line += f", {freq}"
            if instr: line += f", {instr}"
            if dur:   line += f", for {dur}"
            lines.append(line + ".")
        lines.append("Please take your medicines on time. Get well soon.")

    return " ".join(lines)


def generate_voice(data: dict, lang: str = "english") -> str:
    lang = lang.lower().strip()
    lang_codes = {"english": "en", "hindi": "hi", "marathi": "mr"}

    if lang not in lang_codes:
        lang = "english"

    script = build_script(data, lang)
    output_path = os.path.join(OUTPUT_DIR, f"voice_{lang}.mp3")

    tts = gTTS(text=script, lang=lang_codes[lang], slow=False)
    tts.save(output_path)

    return output_path