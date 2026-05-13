TRANSLATIONS = {
    "hindi": {
        # Frequency
        "once daily":      "दिन में एक बार",
        "twice daily":     "दिन में दो बार",
        "thrice daily":    "दिन में तीन बार",
        "once":            "एक बार",
        "twice":           "दो बार",
        "as directed":     "डॉक्टर के निर्देशानुसार",
        "morning & night": "सुबह और रात",
        # Instruction
        "after food":      "खाने के बाद",
        "before food":     "खाने से पहले",
        "with water":      "पानी के साथ",
        "at night":        "रात को",
        "in morning":      "सुबह",
    },
    "marathi": {
        # Frequency
        "once daily":      "दिवसातून एक वेळा",
        "twice daily":     "दिवसातून दोन वेळा",
        "thrice daily":    "दिवसातून तीन वेळा",
        "once":            "एक वेळा",
        "twice":           "दोन वेळा",
        "as directed":     "डॉक्टरांच्या सल्ल्यानुसार",
        "morning & night": "सकाळी आणि रात्री",
        # Instruction
        "after food":      "जेवणानंतर",
        "before food":     "जेवणाआधी",
        "with water":      "पाण्यासोबत",
        "at night":        "रात्री",
        "in morning":      "सकाळी",
    }
}

def translate_text(text: str, lang: str) -> str:
    """Translate a single word/phrase to hindi or marathi."""
    if not text or lang == "english":
        return text
    return TRANSLATIONS.get(lang, {}).get(text.lower().strip(), text)


def translate_medicines(medicines: list, lang: str) -> list:
    """Translate frequency and instruction for each medicine."""
    translated = []
    for m in medicines:
        if isinstance(m, dict):
            translated.append({
                "name":        m.get("name", ""),
                "dosage":      m.get("dosage", ""),
                "frequency":   translate_text(m.get("frequency", ""), lang),
                "instruction": translate_text(m.get("instruction", ""), lang),
                "duration":    m.get("duration", ""),
            })
        else:
            translated.append(str(m))
    return translated