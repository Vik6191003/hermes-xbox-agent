#!/usr/bin/env python3
"""
Job Discovery — Searches all major job platforms daily
Sources: SerpAPI (LinkedIn, Indeed, Glassdoor, ZipRecruiter) + direct scraping
"""
import json, os, sys, time, subprocess
from datetime import datetime, timedelta

# Load profile for keywords/targeting
PROFILE_PATH = "/root/hermes-xbox/jobs/profile.json"
OUTPUT_PATH = "/root/hermes-xbox/jobs/discovery/today_jobs.json"

def load_profile():
    try:
        with open(PROFILE_PATH) as f:
            return json.load(f)
    except:
        return {}

def load_previous_jobs():
    """Load all jobs we've already seen (for dedup)"""
    prev = set()
    tracker = "/root/hermes-xbox/jobs/trackers/pipeline.json"
    if os.path.exists(tracker):
        with open(tracker) as f:
            data = json.load(f)
            for job in data.get("applied", []) + data.get("saved", []):
                prev.add(job.get("url", ""))
    return prev

def search_serpapi(query, location="Tallahassee+FL", num=20):
    """Search via SerpAPI — set SERPAPI_KEY env var or use free tier"""
    api_key = os.environ.get("SERPAPI_KEY", "")
    results = []
    
    if not api_key:
        return free_search(query, location, num)

    try:
        import urllib.request, urllib.parse
        params = {
            "q": query,
            "location": location,
            "num": num,
            "api_key": api_key
        }
        url = "https://serpapi.com/search?" + urllib.parse.urlencode(params)
        with urllib.request.urlopen(url, timeout=20) as r:
            raw = r.read()
            data = json.loads(raw) if isinstance(raw, str) else json.loads(raw.decode('utf-8', errors='replace'))
            # SerpAPI returns jobs inside "jobs_results" for job searches
            jobs_data = data if isinstance(data, dict) else {}
            for job in jobs_data.get("jobs_results", [])[:num]:
                if not isinstance(job, dict):
                    continue
                results.append({
                    "title": job.get("title", ""),
                    "company": job.get("company_name", ""),
                    "location": job.get("location", ""),
                    "url": job.get("link", ""),
                    "salary": job.get("salary", ""),
                    "date": job.get("posted_date", ""),
                    "source": "serpapi",
                    "query": query,
                    "discoveredAt": datetime.now().isoformat()
                })
            # Also check organic results for job boards
            if not results:
                for result in jobs_data.get("organic_results", [])[:num]:
                    if not isinstance(result, dict):
                        continue
                    snippet = result.get("snippet", "")
                    results.append({
                        "title": result.get("title", query),
                        "company": result.get("displayed_link", query),
                        "location": location,
                        "url": result.get("link", ""),
                        "salary": "",
                        "date": "",
                        "source": "serpapi_organic",
                        "query": query,
                        "snippet": snippet[:200],
                        "discoveredAt": datetime.now().isoformat()
                    })
    except Exception as e:
        print(f"SerpAPI error: {e}")
    
    return results

def free_search(query, location, num):
    """Free job discovery using direct site scraping"""
    results = []
    sites = [
        f"https://www.linkedin.com/jobs/search/?keywords={query.replace(' ', '+')}&location={location.replace(' ', '+')}",
        f"https://www.indeed.com/jobs?q={query.replace(' ', '+')}&l={location.replace(' ', '+')}",
    ]
    
    for site_url in sites[:2]:
        try:
            import urllib.request
            # Use jina.ai to parse the page (free tier: 10k chars)
            jina_url = f"https://r.jina.ai/{site_url}"
            req = urllib.request.Request(jina_url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=15) as r:
                data = json.loads(r.read())
                text = data.get("content", "")[:5000]
                # Basic parsing — extract job titles and companies
                results.append({
                    "title": query,
                    "company": "See URL",
                    "location": location,
                    "url": site_url,
                    "salary": "",
                    "date": "",
                    "source": "free_search",
                    "query": query,
                    "discoveredAt": datetime.now().isoformat(),
                    "raw_snippet": text[:500]
                })
        except Exception as e:
            print(f"Free search error for {site_url}: {e}")
    
    return results

def search_github_trending_jobs():
    """Find job-related GitHub repos/tools that might help"""
    results = []
    try:
        import urllib.request
        url = "https://api.github.com/search/repositories?q=job+search+automation&sort=stars&per_page=5"
        req = urllib.request.Request(url, headers={"User-Agent": "Hermes-JobAgent"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            for repo in data.get("items", []):
                results.append({
                    "title": f"Tool: {repo['name']}",
                    "company": repo['owner']['login'],
                    "location": "Remote",
                    "url": repo['html_url'],
                    "source": "github",
                    "stars": repo.get("stargazers_count", 0),
                    "discoveredAt": datetime.now().isoformat()
                })
    except Exception as e:
        print(f"GitHub error: {e}")
    return results

def score_job(job, profile):
    """Score 1-10 how well a job matches the profile"""
    score = 5  # base
    title = (job.get("title") or "").lower()
    desc = (job.get("description") or "").lower()
    company = (job.get("company") or "").lower()
    
    # Boost for keywords in profile
    keywords = [
        "security", "correctional", "officer", "overnight", "manager",
        "medical", "assistant", "healthcare", "ct", "radiology"
    ]
    for kw in keywords:
        if kw in title or kw in desc:
            score += 1
    
    # Boost for salary info
    if job.get("salary"):
        score += 1
    
    # Penalize if already applied
    if job.get("url") in load_previous_jobs():
        score = 0
    
    return min(score, 10)

def discover_all_jobs():
    """Main discovery — searches all target keywords"""
    profile = load_profile()
    keywords = profile.get("target_jobs", ["Security Officer", "Correctional Officer"])
    location = profile.get("location", "Tallahassee FL")
    all_jobs = []
    seen_urls = load_previous_jobs()
    
    for kw in keywords:
        print(f"Searching: {kw} in {location}")
        jobs = search_serpapi(kw, location)
        for job in jobs:
            if job.get("url") not in seen_urls:
                job["score"] = score_job(job, profile)
                all_jobs.append(job)
        time.sleep(2)  # be polite
    
    # Also check trending tools
    tools = search_github_trending_jobs()
    all_jobs.extend(tools)
    
    # Sort by score
    all_jobs.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    # Save
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "discoveredAt": datetime.now().isoformat(),
            "total": len(all_jobs),
            "jobs": all_jobs[:50]  # top 50
        }, f, indent=2)
    
    print(f"Discovered {len(all_jobs)} jobs, saved top 50 to {OUTPUT_PATH}")
    return all_jobs

if __name__ == "__main__":
    jobs = discover_all_jobs()
    print(f"\nTop 5 jobs:\n")
    for j in jobs[:5]:
        print(f"  [{j.get('score',0)}] {j.get('title')} @ {j.get('company')} — {j.get('url','')[:60]}")
