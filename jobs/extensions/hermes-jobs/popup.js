
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["savedJobs","appliedJobs","pipelineStats"], (data) => {
    const saved = data.savedJobs || [];
    const applied = data.appliedJobs || [];
    document.getElementById("stat-saved").textContent = saved.length;
    document.getElementById("stat-applied").textContent = applied.length;
    
    const recent = [...saved, ...applied].slice(-5).reverse();
    const container = document.getElementById("recent-jobs");
    if (recent.length > 0) {
      container.innerHTML = recent.map(job => `
        <div class="job-item">
          <div class="title">${job.title || "Unknown Title"}</div>
          <div class="company">${job.company || ""} · ${job.site || ""}</div>
          <span class="status ${(job.status||"saved").toLowerCase()}">${job.status || "Saved"}</span>
        </div>
      `).join("");
    }
  });
  
  document.getElementById("btn-refresh").onclick = () => {
    chrome.runtime.sendMessage({ type: "REFRESH_PIPELINE" });
    document.getElementById("btn-refresh").textContent = "Refreshing...";
    setTimeout(() => location.reload(), 1500);
  };
  
  document.getElementById("btn-search").onclick = () => {
    chrome.tabs.create({ url: "https://www.linkedin.com/jobs" });
  };
  
  document.getElementById("btn-apply").onclick = () => {
    chrome.storage.local.get(["savedJobs"], (data) => {
      const jobs = data.savedJobs || [];
      if (jobs.length > 0) {
        chrome.runtime.sendMessage({ type: "AUTO_APPLY", data: jobs[0] });
      }
    });
  };
});
