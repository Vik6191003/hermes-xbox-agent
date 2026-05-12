
// Hermes Job Agent — Background Service Worker
// Handles messaging between content script and VPS, manages state

const VPS_URL = "https://76.13.99.138";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "JOB_DETECTED") {
    handleJobDetected(msg.data, sendResponse);
    return true;
  }
  if (msg.type === "TAILOR_RESUME") {
    handleTailorResume(msg.data, sendResponse);
    return true;
  }
  if (msg.type === "SAVE_JOB") {
    handleSaveJob(msg.data, sendResponse);
    return true;
  }
  if (msg.type === "AUTO_APPLY") {
    handleAutoApply(msg.data, sendResponse);
    return true;
  }
});

async function handleJobDetected(job, sendResponse) {
  try {
    const res = await fetch(`${VPS_URL}/api/jobs/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job)
    });
    const result = await res.json();
    sendResponse({ success: true, data: result });
  } catch (e) {
    // Fallback: save to local storage
    chrome.storage.local.get(["detectedJobs"], (data) => {
      const jobs = data.detectedJobs || [];
      if (!jobs.find(j => j.url === job.url)) {
        jobs.push({ ...job, score: 5 });
        chrome.storage.local.set({ detectedJobs: jobs });
      }
    });
    sendResponse({ success: true, local: true });
  }
}

async function handleTailorResume(job, sendResponse) {
  try {
    const res = await fetch(`${VPS_URL}/api/jobs/tailor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobUrl: job.url, jobTitle: job.title, company: job.company })
    });
    const result = await res.json();
    sendResponse({ success: true, data: result });
    
    // Store tailored data for popup access
    chrome.storage.local.set({ lastTailored: result });
    showNotification("Resume tailored for " + job.title, "Ready to apply");
  } catch (e) {
    sendResponse({ success: false, error: e.message });
  }
}

async function handleSaveJob(job, sendResponse) {
  try {
    const res = await fetch(`${VPS_URL}/api/jobs/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job)
    });
    sendResponse({ success: true });
    showNotification("Job saved", job.title + " added to pipeline");
  } catch (e) {
    chrome.storage.local.get(["savedJobs"], (data) => {
      const jobs = data.savedJobs || [];
      if (!jobs.find(j => j.url === job.url)) {
        jobs.push({ ...job, savedAt: new Date().toISOString(), status: "Saved" });
        chrome.storage.local.set({ savedJobs: jobs });
      }
    });
    sendResponse({ success: true, local: true });
  }
}

async function handleAutoApply(job, sendResponse) {
  try {
    const res = await fetch(`${VPS_URL}/api/jobs/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobUrl: job.url })
    });
    const result = await res.json();
    sendResponse({ success: true, data: result });
    showNotification("Application submitted", job.title + " at " + job.company);
  } catch (e) {
    sendResponse({ success: false, error: e.message });
    showNotification("Auto-apply failed", "Use Simplify or apply manually");
  }
}

function showNotification(title, body) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/48.png",
    title: title,
    message: body
  });
}

// Daily pipeline stats
chrome.alarms.create("pipelineStats", { periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pipelineStats") {
    chrome.storage.local.get(["savedJobs", "appliedJobs"], (data) => {
      const saved = data.savedJobs?.length || 0;
      const applied = data.appliedJobs?.length || 0;
      showNotification("Pipeline Update", `Saved: ${saved} | Applied: ${applied}`);
    });
  }
});
