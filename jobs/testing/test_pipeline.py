#!/usr/bin/env python3
"""
Job Pipeline Test Suite — Validates all components work
Run: python3 /root/hermes-xbox/jobs/testing/test_pipeline.py
"""
import json, os, sys

JOBS_DIR = "/root/hermes-xbox/jobs"
RESULTS = []

def test(name, fn):
    try:
        result = fn()
        RESULTS.append({"test": name, "status": "PASS", "result": result})
        print(f"  ✓ {name}")
        return True
    except Exception as e:
        RESULTS.append({"test": name, "status": "FAIL", "error": str(e)})
        print(f"  ✗ {name}: {e}")
        return False

def test_profile_exists():
    path = f"{JOBS_DIR}/profile.json"
    assert os.path.exists(path), "profile.json missing"
    with open(path) as f:
        p = json.load(f)
    assert p.get("name"), "Name missing from profile"
    assert p.get("email"), "Email missing from profile"
    return p

def test_profile_fields(profile):
    required = ["name", "phone", "email", "location", "work_history", "education", "certifications"]
    for field in required:
        assert field in profile, f"Missing field: {field}"
    return True

def test_work_history(profile):
    work = profile.get("work_history", [])
    assert len(work) >= 3, f"Expected 3+ jobs, got {len(work)}"
    for job in work:
        assert job.get("title"), "Job missing title"
        assert job.get("company"), "Job missing company"
    return f"{len(work)} jobs validated"

def test_certifications(profile):
    certs = profile.get("certifications", [])
    assert len(certs) >= 5, f"Expected 5+ certs, got {len(certs)}"
    return f"{len(certs)} certifications"

def test_references(profile):
    refs = profile.get("references", [])
    assert len(refs) >= 3, f"Expected 3+ refs, got {len(refs)}"
    for ref in refs:
        assert ref.get("name"), "Reference missing name"
        assert ref.get("phone"), "Reference missing phone"
    return f"{len(refs)} references"

def test_discovery_module():
    path = f"{JOBS_DIR}/discovery/job_discovery.py"
    assert os.path.exists(path), "job_discovery.py missing"
    sys.path.insert(0, f"{JOBS_DIR}/discovery")
    return "Discovery module exists"

def test_tailoring_module():
    path = f"{JOBS_DIR}/tailoring/resume_tailor.py"
    assert os.path.exists(path), "resume_tailor.py missing"
    sys.path.insert(0, f"{JOBS_DIR}/tailoring")
    return "Tailoring module exists"

def test_dedup_module():
    path = f"{JOBS_DIR}/tailoring/dedup.py"
    assert os.path.exists(path), "dedup.py missing"
    sys.path.insert(0, f"{JOBS_DIR}/tailoring")
    from dedup import is_duplicate, add_to_pipeline
    is_dup, reason = is_duplicate("https://linkedin.com/jobs/999999", "Test Job XYZ", "Test Company ABC")
    assert is_dup == False, "New job should not be duplicate"
    return "Dedup module functional"

def test_pipeline_tracker():
    path = f"{JOBS_DIR}/trackers/pipeline.json"
    assert os.path.exists(path), "pipeline.json missing"
    with open(path) as f:
        data = json.load(f)
    for key in ["applied", "saved", "interview", "offer"]:
        assert key in data, f"Missing pipeline key: {key}"
    return "Pipeline tracker valid"

def test_extension_files():
    ext = f"{JOBS_DIR}/extensions/hermes-jobs"
    required = ["manifest.json", "content.js", "background.js", "popup.html", "popup.js", "options.html", "options.js"]
    for fname in required:
        path = f"{ext}/{fname}"
        assert os.path.exists(path), f"Extension missing: {fname}"
    with open(f"{ext}/manifest.json") as f:
        m = json.load(f)
    assert m.get("manifest_version") == 3, "Must be MV3"
    return f"Extension has {len(os.listdir(ext))} files"

def test_orchestrator():
    path = f"{JOBS_DIR}/job_orchestrator.py"
    assert os.path.exists(path), "orchestrator.py missing"
    return "Orchestrator exists"

def main():
    print("=" * 50)
    print("HERMES JOB PIPELINE — Test Suite")
    print("=" * 50)
    
    # Run tests in order, passing profile between tests
    p = test_profile_exists()
    
    print("\n--- Profile Validation ---")
    test("Profile has required fields", lambda: test_profile_fields(p))
    test("Work history complete", lambda: test_work_history(p))
    test("Certifications complete", lambda: test_certifications(p))
    test("References complete", lambda: test_references(p))
    
    print("\n--- Module Validation ---")
    test("Discovery module", test_discovery_module)
    test("Tailoring module", test_tailoring_module)
    test("Dedup module", test_dedup_module)
    test("Pipeline tracker", test_pipeline_tracker)
    test("Extension files", test_extension_files)
    test("Orchestrator", test_orchestrator)
    
    print("\n" + "=" * 50)
    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 50)
    
    with open("/root/hermes-xbox/jobs/testing/test_results.json", "w") as f:
        json.dump(RESULTS, f, indent=2)
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
