#!/usr/bin/env python3
"""
Job Deduplication — Prevents applying to same job twice
Checks: exact URL match + fuzzy company+title match
"""
import json, os, re
from urllib.parse import urlparse

PIPELINE_PATH = "/root/hermes-xbox/jobs/trackers/pipeline.json"

def normalize_url(url):
    """Remove tracking params from URL for dedup"""
    try:
        parsed = urlparse(url)
        # Keep only scheme, netloc, path
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}".lower()
    except:
        return url.lower()

def normalize_text(text):
    """Normalize job title/company for fuzzy matching"""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^a-z0-9 ]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def load_applied_jobs():
    """Load all previously applied jobs"""
    if not os.path.exists(PIPELINE_PATH):
        return {"applied": [], "saved": []}
    with open(PIPELINE_PATH) as f:
        return json.load(f)

def is_duplicate(job_url, job_title, job_company):
    """Check if this job was already applied to"""
    data = load_applied_jobs()
    norm_url = normalize_url(job_url)
    norm_title = normalize_text(job_title)
    norm_company = normalize_text(job_company)
    
    for job in data.get("applied", []) + data.get("saved", []):
        # Exact URL match
        if normalize_url(job.get("url", "")) == norm_url:
            return True, "Exact URL match"
        
        # Fuzzy match: same company + very similar title
        j_company = normalize_text(job.get("company", ""))
        j_title = normalize_text(job.get("title", ""))
        if j_company and j_title:
            company_match = j_company in norm_company or norm_company in j_company
            title_match = j_title in norm_title or norm_title in j_title
            if company_match and title_match:
                return True, f"Fuzzy match: {job.get('title')} @ {job.get('company')}"
    
    return False, None

def add_to_pipeline(job, status="saved"):
    """Add a job to the pipeline tracker"""
    data = load_applied_jobs()
    
    # Ensure lists exist
    if "applied" not in data:
        data["applied"] = []
    if "saved" not in data:
        data["saved"] = []
    if "interview" not in data:
        data["interview"] = []
    if "offer" not in data:
        data["offer"] = []
    
    # Add with timestamp
    from datetime import datetime
    job["status"] = status
    job["addedAt"] = datetime.now().isoformat()
    
    if status == "applied":
        data["applied"].insert(0, job)
    elif status == "saved":
        # Check not already in saved
        if not is_duplicate(job.get("url", ""), job.get("title", ""), job.get("company", ""))[0]:
            data["saved"].insert(0, job)
    
    # Keep only last 500 of each type
    data["applied"] = data["applied"][:500]
    data["saved"] = data["saved"][:500]
    
    os.makedirs(os.path.dirname(PIPELINE_PATH), exist_ok=True)
    with open(PIPELINE_PATH, "w") as f:
        json.dump(data, f, indent=2)
    
    return True

def get_pipeline_stats():
    """Get current pipeline statistics"""
    data = load_applied_jobs()
    return {
        "total_applied": len(data.get("applied", [])),
        "total_saved": len(data.get("saved", [])),
        "total_interview": len(data.get("interview", [])),
        "total_offer": len(data.get("offer", [])),
        "response_rate": round(len(data.get("interview", [])) / max(len(data.get("applied", [])), 1) * 100, 1)
    }

if __name__ == "__main__":
    # Test dedup
    print("Testing dedup...")
    is_dup, reason = is_duplicate("https://www.linkedin.com/jobs/123", "Security Officer", "Wakulla Correctional")
    print(f"  New job: duplicate={is_dup}, reason={reason}")
    
    stats = get_pipeline_stats()
    print(f"\nPipeline stats: {stats}")
