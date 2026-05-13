import os
import re
import pickle
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR  = os.path.join(BASE_DIR, '..', 'python')
MODEL_PATH  = os.path.join(OUTPUT_DIR, 'models', 'corrector_model.pkl')
CSV_PATH    = os.path.join(BASE_DIR, 'A_Z_medicines_dataset_of_India.csv')


def clean_name(name: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", name.lower()).strip()


def build():
    print("Loading A-Z medicine dataset...")
    az = pd.read_csv(CSV_PATH)
    medicine_list = az["name"].dropna().str.strip().tolist()
    print(f"  {len(medicine_list)} medicines loaded")

    cleaned_list = [clean_name(n) for n in medicine_list]

    print("Building char n-gram TF-IDF index (this takes ~30 seconds)...")
    vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(2, 4),
        min_df=1,
        max_features=50000,
    )
    tfidf_matrix = vectorizer.fit_transform(cleaned_list)
    print(f"  TF-IDF matrix: {tfidf_matrix.shape}")

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    model_data = {
        "medicine_list": medicine_list,
        "cleaned_list":  cleaned_list,
        "vectorizer":    vectorizer,
        "tfidf_matrix":  tfidf_matrix,
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model_data, f)

    print(f"Saved: {MODEL_PATH}")


if __name__ == "__main__":
    build()