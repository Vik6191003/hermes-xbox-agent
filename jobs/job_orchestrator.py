#!/usr/bin/env python3
"""
Job Orchestrator — Master pipeline controller
Coordinates: discovery → dedup → tailor → apply → track → report
Run daily via cron: python3 /root/hermes-xbox/jobs/job_orchestrator.py
"""
import json, os, sys, subprocess
from datetime import datetime, timedelta

JOBS_DIR = "/root/hermes-xbox/jobs"
sys.path.insert(0, f"{JOBS_DIR}/discovery")
sys.path.insert(0, f"{JOBS_DIR}/tailoring")

PROFILE_PATH = f"{JOBS_DIR}/profile.json"
PIPELINE_PATH = f"{JOBS_DIR}/trackers/pipeline.json"

def load_profile():
    with open(PROFILE_PATH) as f:
        return json.load(f)

def send_telegram(msg):
    """Send message to Telegram"""
    try:
        import urllib.request
        token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        chat_id = "8584755115"
        if not token:
            print(f"[TELEGRAM] {msg}")
            return
        url = f"https://api.telegram.org/bot{token}/sendMessage?chat_id={chat_id}&text={msg}"
        urllib.request.urlopen(url, timeout=10)
    except Exception as e:
        print(f"Telegram error: {e}")

def run_step(name, func):
    """Run a pipeline step with timing"""
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] {name}...")
    try:
        result = func()
        print(f"  ✓ {name} complete")
        return result
    except Exception as e:
        print(f"  ✗ {name} failed: {e}")
        return None

def step_discover():
    """Discover new jobs"""
    result = subprocess.run(
        [sys.executable, f"{JOBS_DIR}/discovery/job_discovery.py"],
        capture_output=True, text=True, timeout=60
    )
    with open(f"{JOBS_DIR}/discovery/today_jobs.json") as f:
        data = json.load(f)
    return data.get("jobs", [])[:20]  # top 20

def step_score_and_filter(jobs):
    """Score jobs and filter by profile preferences"""
    profile = load_profile()
    min_salary = profile.get("salary", {}).get("minimum", 0)
    
    filtered = []
    for job in jobs:
        score = job.get("score", 5)
        if score < 5:
            continue
        # Check salary if available
        salary = job.get("salary", "")
        if salary:
            # Try to extract dollar amount
            import re
            nums = re.findall(r"\$(\d+)", salary)
            if nums and int(nums[0]) < min_salary:
                continue
        filtered.append(job)
    
    return filtered

def step_tailor_and_save(jobs):
    """Tailor resume for top jobs and save to pipeline"""
    from tailoring.dedup import add_to_pipeline, is_duplicate
    
    saved = []
    for job in jobs[:10]:  # top 10 only
        url = job.get("url", "")
        title = job.get("title", "")
        company = job.get("company", "")
        
        is_dup, _ = is_duplicate(url, title, company)
        if is_dup:
            print(f"  SKIP (duplicate): {title} @ {company}")
            continue
        
        # Generate tailored resume
        try:
            from tailoring.resume_tailor import tailor_for_job
            tailor_for_job(title, job.get("description", ""), title.lower().replace(" ", "_"))
        except Exception as e:
            print(f"  Tailor error: {e}")
        
        add_to_pipeline(job, "saved")
        saved.append(job)
        print(f"  SAVED: {title} @ {company}")
    
    return saved

def step_daily_report(new_jobs, saved_jobs):
    """Send daily report to Telegram"""
    profile = load_profile()
    stats = {
        "discovered": len(new_jobs),
        "saved": len(saved_jobs)
    }
    
    msg = f"""&#128640; HERMES JOB PIPELINE — Daily Report

&#128269; Discovered today: {stats['discovered']} jobs
&#128190; Added to pipeline: {stats['saved']} jobs

Top jobs:
"""
    for job in new_jobs[:5]:
        score = job.get("score", 0)
        msg += f"  [{score}] {job.get('title', 'N/A')} @ {job.get('company', 'N/A')}\n"
    
    msg += f"""
&#9989; Applied total: {len(load_applied())}
&#128188; Target: {profile.get('salary', {}).get('minimum', 17)}/hr min

Run 'python3 {JOBS_DIR}/job_orchestrator.py apply' to auto-apply
"""
    send_telegram(msg)
    return msg

def load_applied():
    with open(PIPELINE_PATH) as f:
        return json.load(f).get("applied", [])

def main():
    print("=" * 50)
    print("HERMES JOB ORCHESTRATOR — Starting pipeline")
    print("=" * 50)
    
    # Discovery
    jobs = run_step("Discovering jobs", step_discover) or []
    
    # Score + filter
    jobs = step_score_and_filter(jobs)
    
    # Tailor + save
    saved = run_step("Tailoring resumes + saving to pipeline", lambda: step_tailor_and_save(jobs)) or []
    
    # Report
    run_step("Sending daily report", lambda: step_daily_report(jobs, saved))
    
    print("\n" + "=" * 50)
    print("Pipeline complete!")
    print("=" * 50)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "apply":
        print("Apply mode — submitting to top saved jobs...")
        # Apply to top saved jobs
        with open(PIPELINE_PATH) as f:
            data = json.load(f)
        jobs_to_apply = data.get("saved", [])[:10]
        print(f"Would apply to: {[j.get('title') for j in jobs_to_apply]}")
        # In production: call Simplify API or Playwright automation here
    else:
        main()
