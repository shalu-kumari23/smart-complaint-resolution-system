import re
import math
from typing import List, Dict, Any, Tuple
from pymongo.database import Database

def clean_text(text: str) -> str:
    """Preprocess text: lowercase, remove special characters and extra whitespace."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return " ".join(text.split())

def tokenize(text: str) -> List[str]:
    """Tokenize text into a list of words."""
    cleaned = clean_text(text)
    return cleaned.split() if cleaned else []

def compute_cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    """Computes the cosine similarity between two sparse vector representations."""
    # Dot product
    dot_product = 0.0
    for term, val in vec1.items():
        if term in vec2:
            dot_product += val * vec2[term]
            
    # L2 norms
    norm1 = math.sqrt(sum(val ** 2 for val in vec1.values()))
    norm2 = math.sqrt(sum(val ** 2 for val in vec2.values()))
    
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
        
    return dot_product / (norm1 * norm2)

def check_duplicates_in_list(new_text: str, existing_complaints: List[Dict[str, Any]], threshold: float = 0.5) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Computes cosine similarity between new text and a list of existing complaints.
    Uses a lightweight pure-Python TF-IDF implementation.
    """
    new_tokens = tokenize(new_text)
    if not new_tokens or not existing_complaints:
        return False, []

    # Prepare document corpus
    # Doc 0 is the new complaint. Docs 1 to N are existing complaints.
    corpus = [new_tokens]
    valid_complaints = []
    
    for c in existing_complaints:
        text_content = c.get("description", c.get("text", ""))
        tokens = tokenize(text_content)
        if tokens:
            corpus.append(tokens)
            valid_complaints.append(c)

    if len(corpus) < 2:
        return False, []

    # 1. Calculate Document Frequencies (DF)
    # df[term] = number of documents containing the term
    df = {}
    vocab = set()
    for doc in corpus:
        doc_vocab = set(doc)
        vocab.update(doc_vocab)
        for term in doc_vocab:
            df[term] = df.get(term, 0) + 1

    # 2. Calculate Inverse Document Frequencies (IDF)
    # idf[term] = log((1 + N) / (1 + DF(term))) + 1  (Standard Smooth IDF)
    N = len(corpus)
    idf = {}
    for term in vocab:
        idf[term] = math.log((1 + N) / (1 + df[term])) + 1.0

    # 3. Calculate TF-IDF vectors for each document
    # tfidf_vectors[i] = { term: tf_idf_value }
    tfidf_vectors = []
    for doc in corpus:
        # term frequency
        tf = {}
        for term in doc:
            tf[term] = tf.get(term, 0) + 1
            
        doc_vector = {}
        for term, freq in tf.items():
            doc_vector[term] = freq * idf[term]
        tfidf_vectors.append(doc_vector)

    # 4. Compare Doc 0 (new complaint) against Docs 1 to N (existing)
    new_vector = tfidf_vectors[0]
    similar_list = []
    is_duplicate = False
    
    for idx in range(1, len(tfidf_vectors)):
        existing_vector = tfidf_vectors[idx]
        score = compute_cosine_similarity(new_vector, existing_vector)
        
        if score >= threshold:
            is_duplicate = True
            comp = valid_complaints[idx - 1]
            similar_list.append({
                "complaintId": comp.get("complaintId", str(comp.get("_id", ""))),
                "title": comp.get("title", ""),
                "description": comp.get("description", comp.get("text", "")),
                "status": comp.get("status", ""),
                "similarity": float(round(score, 2))
            })
            
    # Sort by similarity descending
    similar_list.sort(key=lambda x: x["similarity"], reverse=True)
    return is_duplicate, similar_list

def detect_duplicate(db: Database, new_complaint_text: str, category: str, threshold: float = 0.5) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Connects to database, fetches recent complaints in the same category,
    and runs cosine similarity duplicate check.
    """
    query = {}
    if category and category != "Other":
        query["category"] = category
        
    cursor = db["complaints"].find(
        query,
        {"_id": 1, "complaintId": 1, "title": 1, "description": 1, "status": 1}
    ).limit(100) # Check against top 100 recent complaints
    
    existing = list(cursor)
    return check_duplicates_in_list(new_complaint_text, existing, threshold)
