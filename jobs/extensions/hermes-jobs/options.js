
document.getElementById("save").onclick = () => {
  const settings = {
    vpsUrl: document.getElementById("vps-url").value,
    apiToken: document.getElementById("api-token").value,
    autoApply: document.getElementById("auto-apply").checked,
    autoTailor: document.getElementById("auto-tailor").checked,
    dailySweep: document.getElementById("daily-sweep").checked,
    minSalary: parseInt(document.getElementById("min-salary").value),
    maxApps: parseInt(document.getElementById("max-apps").value),
    keywords: document.getElementById("keywords").value,
    locations: document.getElementById("locations").value
  };
  chrome.storage.local.set({ hermesSettings: settings });
  const msg = document.getElementById("msg");
  msg.textContent = "Settings saved!";
  msg.className = "msg ok";
  setTimeout(() => msg.className = "msg", 2000);
};

chrome.storage.local.get(["hermesSettings"], (data) => {
  if (data.hermesSettings) {
    const s = data.hermesSettings;
    document.getElementById("vps-url").value = s.vpsUrl || "";
    document.getElementById("api-token").value = s.apiToken || "";
    document.getElementById("auto-apply").checked = s.autoApply || false;
    document.getElementById("auto-tailor").checked = s.autoTailor !== false;
    document.getElementById("daily-sweep").checked = s.dailySweep !== false;
    document.getElementById("min-salary").value = s.minSalary || 17;
    document.getElementById("max-apps").value = s.maxApps || 20;
    document.getElementById("keywords").value = s.keywords || "";
    document.getElementById("locations").value = s.locations || "";
  }
});
