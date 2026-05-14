const DEFAULT_SETTINGS = {
  enabled: false,
  sensitivity: 1,
  showPreview: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set({
    enabled: typeof current.enabled === "boolean" ? current.enabled : DEFAULT_SETTINGS.enabled,
    sensitivity: Number.isFinite(current.sensitivity) ? current.sensitivity : DEFAULT_SETTINGS.sensitivity,
    showPreview: typeof current.showPreview === "boolean" ? current.showPreview : DEFAULT_SETTINGS.showPreview
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GESTURE_GET_SETTINGS") {
    chrome.storage.sync.get(DEFAULT_SETTINGS).then((settings) => sendResponse(settings));
    return true;
  }

  if (message?.type === "GESTURE_SET_SETTINGS") {
    chrome.storage.sync.set(message.payload).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "GESTURE_STATUS" && sender.tab?.id) {
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: message.active ? "ON" : ""
    });
    chrome.action.setBadgeBackgroundColor({
      tabId: sender.tab.id,
      color: message.active ? "#1f9d55" : "#6b7280"
    });
  }

  return false;
});
