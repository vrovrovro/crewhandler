const enabledToggle = document.getElementById("enabledToggle");
const previewToggle = document.getElementById("previewToggle");
const sensitivityRange = document.getElementById("sensitivityRange");
const sensitivityValue = document.getElementById("sensitivityValue");
const statusText = document.getElementById("statusText");
const statusBadge = document.getElementById("statusBadge");
const statusDot = document.getElementById("statusDot");

const DEFAULT_SETTINGS = {
  enabled: false,
  sensitivity: 1,
  showPreview: true
};

function updateStatus(enabled) {
  statusText.textContent = enabled ? "Camera active" : "Camera inactive";
  statusBadge.textContent = enabled ? "Running" : "Idle";
  statusDot.classList.toggle("active", enabled);
}

function updateSensitivityLabel(value) {
  sensitivityValue.textContent = `${Number(value).toFixed(1)}x`;
}

async function saveSettings(partial) {
  await chrome.storage.sync.set(partial);
}

async function init() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  enabledToggle.checked = settings.enabled;
  previewToggle.checked = settings.showPreview;
  sensitivityRange.value = settings.sensitivity;
  updateSensitivityLabel(settings.sensitivity);
  updateStatus(settings.enabled);
}

enabledToggle.addEventListener("change", async () => {
  const enabled = enabledToggle.checked;
  updateStatus(enabled);
  await saveSettings({ enabled });
});

previewToggle.addEventListener("change", async () => {
  await saveSettings({ showPreview: previewToggle.checked });
});

sensitivityRange.addEventListener("input", async () => {
  updateSensitivityLabel(sensitivityRange.value);
  await saveSettings({ sensitivity: Number(sensitivityRange.value) });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  if (changes.enabled) {
    enabledToggle.checked = changes.enabled.newValue;
    updateStatus(changes.enabled.newValue);
  }

  if (changes.showPreview) {
    previewToggle.checked = changes.showPreview.newValue;
  }

  if (changes.sensitivity) {
    sensitivityRange.value = changes.sensitivity.newValue;
    updateSensitivityLabel(changes.sensitivity.newValue);
  }
});

init();
