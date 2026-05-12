
// Hermes Job Agent — Content Script
// Runs on all major job sites, detects postings, scrapes data, sends to VPS

const SITE_CONFIG = {
  linkedin: {
    jobTitle: ".job-details-journey-top-card__job-title, h1.t-24",
    company: ".job-details-journey-top-card__company-name, .t-16",
    location: "[data-test-job-location]",
    description: ".jobs-box__html-content, #job-details",
    salary: ".salary-snippet, [data-test-job-salary]",
    date: "time"
  },
  indeed: {
    jobTitle: "[data-testid='job-title'], h1.jobsearch-JobInfoHeader-title",
    company: "[data-testid='jobinfo-company-name'], .jobsearch-CompanyInfoContainer a",
    location: '[data-testid="jobinfo-location"], [data-testid="jobLocation"]',
    description: "#jobDescriptionText, .jobsearch-JobDescription",
    salary: ".SalaryInformationBasedWages, [data-testid="salary-snippet"]",
    date: ".jobsearch-JobMetadataFooter"
  },
  greenhouse: {
    jobTitle: ".job-header h1, .app-title",
    company: ".company-name",
    location: ".location",
    description: "#content",
    salary: ".pay-compensation",
    date: ".posted-date"
  },
  lever: {
    jobTitle: ".posting-headline h1",
    company: ".posting-company-group a",
    location: ".posting-location",
    description: ".posting-description",
    salary: ".compensation",
    date: ".posting-time"
  },
  workday: {
    jobTitle: "[data-automation-id='jobTitle']",
    company: "[data-automation-id='companyName']",
    location: "[data-automation-id='normalizedLocation']",
    description: "[data-automation-id='jobDescription']",
    salary: "[data-automation-id='compensation']",
    date: "[data-automation-id='postDate']"
  }
};

function detectSite() {
  const url = window.location.href;
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.includes("indeed.com")) return "indeed";
  if (url.includes("greenhouse.io")) return "greenhouse";
  if (url.includes("lever.co")) return "lever";
  if (url.includes("workday.com")) return "workday";
  if (url.includes("usajobs.gov")) return "usajobs";
  if (url.includes("wellfound.com")) return "wellfound";
  if (url.includes("ziprecruiter")) return "ziprecruiter";
  if (url.includes("simplyhired")) return "simplyhired";
  if (url.includes("glassdoor")) return "glassdoor";
  return "unknown";
}

function scrapeJobData(site) {
  const config = SITE_CONFIG[site] || {};
  const getText = (selector) => {
    try {
      const el = document.querySelector(selector);
      return el ? el.innerText.trim() : "";
    } catch { return ""; }
  };
  
  const url = window.location.href;
  const jobId = url.split("?").pop() || url.split("/").filter(Boolean).pop() || "";
  
  return {
    url: url,
    site: site,
    jobId: jobId,
    title: getText(config.jobTitle),
    company: getText(config.company),
    location: getText(config.location),
    description: getText(config.description),
    salary: getText(config.salary),
    postedDate: getText(config.date),
    scrapedAt: new Date().toISOString()
  };
}

function isJobPage() {
  const site = detectSite();
  const config = SITE_CONFIG[site];
  if (!config) return false;
  try {
    const title = document.querySelector(config.jobTitle);
    const company = document.querySelector(config.company);
    return !!(title && company);
  } catch { return false; }
}

// Notify background script when job is detected
if (isJobPage()) {
  const jobData = scrapeJobData(detectSite());
  chrome.runtime.sendMessage({ type: "JOB_DETECTED", data: jobData }, (response) => {
    if (response && response.success) {
      console.log("[Hermes] Job data sent to VPS");
    }
  });
  
  // Show notification bar
  showHermesBar(jobData);
}

function showHermesBar(job) {
  if (document.getElementById("hermes-job-bar")) return;
  
  const bar = document.createElement("div");
  bar.id = "hermes-job-bar";
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:999999;background:linear-gradient(135deg,#1a1a2e,#16213e);padding:12px 20px;display:flex;align-items:center;justify-content:space-between;font-family:system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.4);";
  
  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:18px;">🤖</span>
      <div>
        <div style="color:#fff;font-weight:600;font-size:14px;">Hermes Job Agent</div>
        <div style="color:#aaa;font-size:12px;">${job.title} @ ${job.company}</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <button id="hermes-tailor" style="background:#4ade80;border:none;border-radius:8px;padding:8px 16px;color:#000;font-weight:600;font-size:13px;cursor:pointer;">Tailor Resume</button>
      <button id="hermes-save" style="background:#3b82f6;border:none;border-radius:8px;padding:8px 16px;color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Save Job</button>
      <button id="hermes-apply" style="background:#f97316;border:none;border-radius:8px;padding:8px 16px;color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Auto-Apply</button>
    </div>
  `;
  
  document.body.prepend(bar);
  
  bar.querySelector("#hermes-tailor").onclick = () => {
    chrome.runtime.sendMessage({ type: "TAILOR_RESUME", data: job });
    bar.querySelector("#hermes-tailor").textContent = "Tailoring...";
    setTimeout(() => { bar.querySelector("#hermes-tailor").textContent = "Tailored ✓"; }, 2000);
  };
  
  bar.querySelector("#hermes-save").onclick = () => {
    chrome.runtime.sendMessage({ type: "SAVE_JOB", data: job });
    bar.querySelector("#hermes-save").textContent = "Saved ✓";
  };
  
  bar.querySelector("#hermes-apply").onclick = () => {
    chrome.runtime.sendMessage({ type: "AUTO_APPLY", data: job });
    bar.querySelector("#hermes-apply").textContent = "Applying...";
  };
}

// Listen for fill commands from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "FILL_APPLICATION") {
    fillApplication(msg.data);
    sendResponse({ success: true });
  }
});

function fillApplication(data) {
  // Standard form field mappings for common ATS systems
  const fieldMap = {
    "firstName": ["first-name", "firstName", "fname", "applicant_first_name"],
    "lastName": ["last-name", "lastName", "lname", "applicant_last_name"],
    "email": ["email", "emailAddress", "email_address", "applicant_email"],
    "phone": ["phone", "phoneNumber", "tel", "phone_number"],
    "address": ["address", "streetAddress", "address1"],
    "city": ["city", "application_city"],
    "state": ["state", "application_state"],
    "zip": ["zip", "zipCode", "postal"],
    "resume": ["resume", "upload-resume", "applicant_resume"]
  };
  
  Object.entries(fieldMap).forEach(([field, selectors]) => {
    selectors.forEach(sel => {
      const input = document.querySelector(`[name="${sel}"], [id="${sel}"], [aria-label*="${field}"]`);
      if (input && !input.value && data[field]) {
        input.value = data[field];
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  });
}
