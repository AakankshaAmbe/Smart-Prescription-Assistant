import re
import fitz          # pymupdf
import pdfplumber
from PIL import Image
from io import BytesIO

# ── Regex patterns ────────────────────────────────────────────────────────────

MEDICINE_LINE_RE = re.compile(
    r'([A-Z][a-zA-Z0-9\- ]{2,}).*(\d+\.?\d*\s*(?:mg|ml|mcg|g|iu))',
    re.IGNORECASE
)

SKIP_RE = re.compile(
    r'^(name|patient|address|date|age|sex|gender|doctor|dr\b|phone|'
    r'mob|sig\b|instruction|rx\b|ref|clinic|hospital|mb|md|mbbs|'
    r'lic|ptr|sign|tel|email|reg|dispense|refill|direction|medication|'
    r'complete|take|printable|prescription|signature|orlando)',
    re.IGNORECASE
)

DOSAGE_RE = re.compile(r'\b(\d+\.?\d*)\s*(mg|ml|g|mcg|iu)\b', re.IGNORECASE)

FREQ_RE = re.compile(
    r'\b(od|bd|bid|tid|tds|qid|qd|sos|morning|evening|night|'
    r'once|twice|three times|four times)\b',
    re.IGNORECASE
)

DAYS_RE = re.compile(r'(?:x\s*|for\s+)(\d+)\s*days?', re.IGNORECASE)

NAME_RE = re.compile(
    r'(?:patient\s*name|name)\s*[:\-]?\s*([A-Za-z ]{3,})',
    re.IGNORECASE
)

AGE_RE  = re.compile(r'\bage\s*[:\-]?\s*(\d{1,3})', re.IGNORECASE)

DATE_RE = re.compile(
    r'\bdate\s*[:\-]?\s*([\w ,]+\d{4}|[\d]{1,2}[\/\-\.][\d]{1,2}[\/\-\.][\d]{2,4})',
    re.IGNORECASE
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean_medicine_name(line: str) -> str:
    line = line.strip().strip("'\"")
    line = re.sub(r'^\d+[\.\)]\s*', '', line)
    for sep in [' - ', ' — ', '|', '(']:
        if sep in line:
            line = line[:line.index(sep)]
    stop = re.compile(
        r'\b(tab\b|tabs\b|cap\b|caps\b|capsule|syrup|sos|apply|use|'
        r'take|with|after|before|food|water|days?|weeks?|months?|by|mouth)\b',
        re.IGNORECASE
    )
    m = stop.search(line)
    if m:
        line = line[:m.start()]
    return line.strip()


def _parse_lines(lines: list) -> dict:
    patient_name = "Not Found"
    age          = "Not Found"
    date         = "Not Found"
    medicines    = []

    for line in lines:
        line = line.strip().strip("'\"")
        if not line or len(line) < 3:
            continue

        # Patient info
        name_m = NAME_RE.search(line)
        if name_m and patient_name == "Not Found":
            raw = name_m.group(1).strip()
            for stop in ["address", "age", "date", "sex"]:
                idx = raw.lower().find(stop)
                if idx != -1:
                    raw = raw[:idx].strip()
            if raw:
                patient_name = raw.title()

        age_m = AGE_RE.search(line)
        if age_m and age == "Not Found":
            age = age_m.group(1)

        date_m = DATE_RE.search(line)
        if date_m and date == "Not Found":
            date = date_m.group(1).strip()

        # Skip non-medicine lines
        if SKIP_RE.search(line.strip()):
            continue

        # Detect medicine lines
        if MEDICINE_LINE_RE.search(line):
            raw_name = _clean_medicine_name(line)
            if not raw_name or len(raw_name) < 3:
                continue

            dosage_m  = DOSAGE_RE.findall(line)
            dosage    = " ".join(f"{a}{u}" for a, u in dosage_m) if dosage_m else ""
            freq_m    = FREQ_RE.search(line)
            frequency = freq_m.group().upper() if freq_m else ""
            days_m    = DAYS_RE.search(line)
            duration  = f"{days_m.group(1)} days" if days_m else ""

            medicines.append({
                "raw_name":  raw_name,
                "dosage":    dosage,
                "frequency": frequency,
                "duration":  duration,
            })

    return {
        "patient_name":  patient_name,
        "age":           age,
        "date":          date,
        "raw_medicines": medicines,
    }


# ── Main extractor ────────────────────────────────────────────────────────────

def extract_from_pdf(pdf_bytes: BytesIO) -> dict:
    """
    Main entry point. Auto-detects PDF type.

    Returns:
    {
        "patient_name": str,
        "age": str,
        "date": str,
        "raw_medicines": [{"raw_name", "dosage", "frequency", "duration"}],
        "extraction_method": "digital" | "image_ocr"
    }
    """
    pdf_bytes.seek(0)
    full_text = ""

    # Try pdfplumber first (digital PDF)
    try:
        with pdfplumber.open(pdf_bytes) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
    except Exception:
        pass

    # Digital PDF - text found
    if full_text.strip():
        result = _parse_lines(full_text.split("\n"))
        result["extraction_method"] = "digital"
        result["raw_text"] = full_text.strip()
        return result

    # Fallback: image PDF - render pages and OCR
    # Requires Tesseract to be installed on the system
    # Download: https://github.com/UB-Mannheim/tesseract/wiki
    try:
        import pytesseract
        # Windows path — update if installed elsewhere
        pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

        pdf_bytes.seek(0)
        raw_bytes = pdf_bytes.read()
        doc = fitz.open(stream=raw_bytes, filetype="pdf")

        all_lines = []
        for page in doc:
            pix  = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
            img  = Image.open(BytesIO(pix.tobytes("png")))
            text = pytesseract.image_to_string(img, config="--psm 6")
            all_lines.extend(text.split("\n"))

        result = _parse_lines(all_lines)
        result["extraction_method"] = "image_ocr"
        result["raw_text"] = "\n".join(all_lines)
        return result

    except Exception:
        # Tesseract not installed - return empty for image PDFs
        return {
            "patient_name":       "Not Found",
            "age":                "Not Found",
            "date":               "Not Found",
            "raw_medicines":      [],
            "extraction_method":  "failed_no_tesseract",
            "raw_text":           "",
            "error":              "This appears to be a scanned/image PDF. Install Tesseract OCR to support these. For best results use digitally generated PDFs."
        }