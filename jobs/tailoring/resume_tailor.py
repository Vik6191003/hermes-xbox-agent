#!/usr/bin/env python3
"""
Resume Tailor — Rewrites resume bullets for specific job postings
Uses profile.json as base, AI-tailors per job description
"""
import json, os, sys, re

PROFILE_PATH = "/root/hermes-xbox/jobs/profile.json"
OUTPUT_DIR = "/root/hermes-xbox/jobs/tailoring"

def load_profile():
    with open(PROFILE_PATH) as f:
        return json.load(f)

def load_job_description(job_url_or_desc):
    """Fetch or parse job description from URL or text"""
    if os.path.exists(job_url_or_desc):
        with open(job_url_or_desc) as f:
            return f.read()
    
    # If it's a URL, try to fetch with jina
    if job_url_or_desc.startswith("http"):
        try:
            import urllib.request
            jina_url = f"https://r.jina.ai/{job_url_or_desc}"
            req = urllib.request.Request(jina_url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=15) as r:
                data = json.loads(r.read())
                return data.get("content", "")
        except:
            return job_url_or_desc  # fallback to URL as text
    
    return job_url_or_desc

def extract_keywords(job_desc):
    """Extract key skills/requirements from job description"""
    # Common patterns
    patterns = [
        r"required.*?:(.*?)\n",
        r"qualifications.*?:(.*?)\n",
        r"skills.*?:(.*?)\n",
        r"responsibilities.*?:(.*?)\n",
    ]
    text = job_desc.lower()
    skills = re.findall(r"\b[A-Za-z ]{3,20}\b", text)
    
    # Filter to meaningful skills
    stopwords = {"the", "and", "for", "with", "you", "our", "will", "are", "this", "that", "from", "have", "has", "been", "were", "their", "them"}
    skills = [s for s in skills if s.lower() not in stopwords and len(s) > 3]
    return list(set(skills))[:20]

def build_tailored_resume(job_title, job_desc, format="text"):
    """Build a tailored resume for a specific job"""
    profile = load_profile()
    
    # Find matching work history
    work = profile.get("work_history", [])
    current = next((w for w in work if w.get("current")), work[0] if work else {})
    
    # Extract job keywords
    keywords = extract_keywords(job_desc)
    job_lower = job_desc.lower()
    
    # Map profile skills to job keywords
    profile_skills = profile.get("skills", [])
    matched = [s for s in profile_skills if any(s.lower() in job_lower for s in [s])]
    
    # Build tailored bullets
    duties = current.get("duties", "")
    title = current.get("title", "")
    company = current.get("company", "")
    dates = f"{current.get('start', '')} – {current.get('end', 'Present')}"
    
    # AI-style tailored bullets (would use LLM in production)
    tailored_bullets = [
        f"Relevant experience in {title} role demonstrating hands-on {', '.join(matched[:3])}",
        f"Demonstrated ability to maintain safety and security protocols in high-stakes environments",
        f"Skilled in documentation, compliance procedures, and regulatory standards"
    ]
    
    if matched:
        tailored_bullets.insert(0, f"Applied experience with: {', '.join(matched[:5])}")
    
    resume = {
        "name": profile.get("name", ""),
        "email": profile.get("email", ""),
        "phone": profile.get("phone", ""),
        "location": profile.get("location", ""),
        "summary": f"Detail-oriented professional with experience in {title} and transferable skills in security, healthcare, and leadership. Certified in BLS, OSHA 30, and CJBAT.",
        "experience": [{
            "title": title,
            "company": company,
            "dates": dates,
            "bullets": tailored_bullets,
            "original_duties": duties
        }],
        "education": profile.get("education", {}),
        "certifications": profile.get("certifications", []),
        "tailored_for": {
            "job_title": job_title,
            "matched_keywords": matched,
            "all_job_keywords": keywords
        }
    }
    
    return resume

def build_cover_letter(job_title, job_company, job_desc):
    """Generate cover letter paragraph"""
    profile = load_profile()
    
    # Extract what they want
    keywords = extract_keywords(job_desc)[:5]
    
    letter = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {job_title} position at {job_company}. With my background in security operations, healthcare assistance, and team leadership — combined with certifications including BLS, OSHA 30, and CJBAT — I am confident I can contribute meaningfully to your team.

My experience supervising up to 130 individuals in a correctional setting has equipped me with exceptional de-escalation, documentation, and safety protocol skills. Additionally, my CT Medical Assistant training provides me with healthcare fundamentals that apply to a wide range of roles.

I am particularly drawn to this opportunity because my skills in {', '.join(keywords[:3])} align directly with your requirements. I am available for day or overnight shifts, hold a Class D security license, and have a proven track record of maintaining operational excellence under pressure.

Thank you for considering my application. I look forward to discussing how I can contribute to your team.

Sincerely,
{profile.get('name', '')}
{profile.get('phone', '')}
{profile.get('email', '')}
"""
    return letter.strip()

def tailor_for_job(job_title, job_desc, output_name=None):
    """Main entry point — tailor resume + cover letter for a job"""
    resume = build_tailored_resume(job_title, job_desc)
    cover = build_cover_letter(job_title, job_desc.get("company", "the Company") if isinstance(job_desc, dict) else "the Company", job_desc if isinstance(job_desc, str) else "")
    
    output_name = output_name or job_title.lower().replace(" ", "_")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    out_file = f"{OUTPUT_DIR}/{output_name}.json"
    with open(out_file, "w") as f:
        json.dump({"resume": resume, "cover_letter": cover}, f, indent=2)
    
    print(f"Tailored resume + cover letter saved to {out_file}")
    return resume, cover

if __name__ == "__main__":
    # Test with corrections officer job
    test_desc = """
    Security Officer needed for overnight shift.
    Requirements: High school diploma, security experience,
    de-escalation training, ability to work weekends.
    Duties: Monitor premises, control access, respond to incidents.
    """
    r, c = tailor_for_job("Security Officer", test_desc, "test_security")
    print("\n=== TAILORED RESUME ===")
    print(json.dumps(r, indent=2))
    print("\n=== COVER LETTER ===")
    print(c)
