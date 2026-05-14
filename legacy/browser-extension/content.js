(() => {
  if (window.__handGestureContentLoaded) {
    return;
  }
  window.__handGestureContentLoaded = true;

  const BRIDGE_EVENT = "HAND_GESTURE_BRIDGE_EVENT";
  const DEFAULT_SETTINGS = {
    enabled: false,
    sensitivity: 1,
    showPreview: true
  };

  const LANDMARK = {
    WRIST: 0,
    THUMB_TIP: 4,
    INDEX_PIP: 6,
    INDEX_TIP: 8,
    MIDDLE_PIP: 10,
    MIDDLE_TIP: 12,
    RING_PIP: 14,
    RING_TIP: 16,
    PINKY_PIP: 18,
    PINKY_TIP: 20
  };

  const state = {
    settings: { ...DEFAULT_SETTINGS },
    running: false,
    bridgeReady: false,
    latestResult: null,
    animationFrameId: 0,
    lastPalmCenter: null,
    lastSwipeX: null,
    lastClickAt: 0,
    lastSwipeAt: 0,
    lastToastTimer: 0,
    cursorX: window.innerWidth * 0.5,
    cursorY: window.innerHeight * 0.5,
    targetCursorX: window.innerWidth * 0.5,
    targetCursorY: window.innerHeight * 0.5
  };

  const overlayRoot = document.createElement("div");
  overlayRoot.id = "gesture-extension-root";
  overlayRoot.innerHTML = `
    <div class="gesture-overlay">
      <div class="gesture-preview-shell">
        <canvas class="gesture-canvas"></canvas>
        <div class="gesture-preview-meta">
          <span class="gesture-mode">Idle</span>
          <span class="gesture-fps">0 FPS</span>
        </div>
      </div>
      <div class="gesture-cursor"></div>
      <div class="gesture-toast"></div>
    </div>
  `;
  document.documentElement.appendChild(overlayRoot);

  const previewShell = overlayRoot.querySelector(".gesture-preview-shell");
  const previewCanvas = overlayRoot.querySelector(".gesture-canvas");
  const previewContext = previewCanvas.getContext("2d");
  const cursorEl = overlayRoot.querySelector(".gesture-cursor");
  const toastEl = overlayRoot.querySelector(".gesture-toast");
  const modeEl = overlayRoot.querySelector(".gesture-mode");
  const fpsEl = overlayRoot.querySelector(".gesture-fps");

  function injectBridge() {
    const existing = document.getElementById("gesture-page-bridge");
    if (existing) {
      state.bridgeReady = true;
      return;
    }

    const script = document.createElement("script");
    script.id = "gesture-page-bridge";
    script.src = chrome.runtime.getURL("page-bridge.js");
    script.type = "text/javascript";
    script.dataset.cameraUtilsUrl = chrome.runtime.getURL("node_modules/@mediapipe/camera_utils/camera_utils.js");
    script.dataset.handsScriptUrl = chrome.runtime.getURL("node_modules/@mediapipe/hands/hands.js");
    script.dataset.handsBaseUrl = chrome.runtime.getURL("node_modules/@mediapipe/hands/");
    script.onload = () => {
      state.bridgeReady = true;
      if (state.settings.enabled) {
        startTracking();
      }
    };
    document.documentElement.appendChild(script);
  }

  function setPreviewVisibility(visible) {
    previewShell.classList.toggle("hidden", !visible);
    previewShell.style.display = visible ? "block" : "none";
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("visible");
    window.clearTimeout(state.lastToastTimer);
    state.lastToastTimer = window.setTimeout(() => {
      toastEl.classList.remove("visible");
    }, 1400);
  }

  function updateModeLabel(label) {
    modeEl.textContent = label;
  }

  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function isFingerExtended(landmarks, pipIndex, tipIndex) {
    return landmarks[tipIndex].y < landmarks[pipIndex].y;
  }

  function detectOpenPalm(landmarks) {
    return [
      isFingerExtended(landmarks, LANDMARK.INDEX_PIP, LANDMARK.INDEX_TIP),
      isFingerExtended(landmarks, LANDMARK.MIDDLE_PIP, LANDMARK.MIDDLE_TIP),
      isFingerExtended(landmarks, LANDMARK.RING_PIP, LANDMARK.RING_TIP),
      isFingerExtended(landmarks, LANDMARK.PINKY_PIP, LANDMARK.PINKY_TIP)
    ].every(Boolean);
  }

  function detectIndexOnly(landmarks) {
    const indexExtended = isFingerExtended(landmarks, LANDMARK.INDEX_PIP, LANDMARK.INDEX_TIP);
    const middleExtended = isFingerExtended(landmarks, LANDMARK.MIDDLE_PIP, LANDMARK.MIDDLE_TIP);
    const ringExtended = isFingerExtended(landmarks, LANDMARK.RING_PIP, LANDMARK.RING_TIP);
    const pinkyExtended = isFingerExtended(landmarks, LANDMARK.PINKY_PIP, LANDMARK.PINKY_TIP);
    return indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
  }

  function drawPreview(result) {
    if (!state.settings.showPreview) {
      previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      return;
    }

    if (!result) {
      previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      return;
    }

    const { landmarks, imageWidth, imageHeight } = result;
    if (previewCanvas.width !== imageWidth || previewCanvas.height !== imageHeight) {
      previewCanvas.width = imageWidth;
      previewCanvas.height = imageHeight;
    }

    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    const bridgeVideo = document.getElementById("gesture-bridge-video");

    if (bridgeVideo?.readyState >= 2) {
      previewContext.save();
      previewContext.scale(-1, 1);
      previewContext.drawImage(bridgeVideo, -previewCanvas.width, 0, previewCanvas.width, previewCanvas.height);
      previewContext.restore();
    }

    if (!landmarks) {
      return;
    }

    previewContext.fillStyle = "rgba(249, 115, 22, 0.92)";
    for (const landmark of landmarks) {
      previewContext.beginPath();
      previewContext.arc(
        previewCanvas.width - landmark.x * previewCanvas.width,
        landmark.y * previewCanvas.height,
        4,
        0,
        Math.PI * 2
      );
      previewContext.fill();
    }
  }

  function updateCursorFromIndexFinger(landmarks) {
    const indexTip = landmarks[LANDMARK.INDEX_TIP];
    const normalizedX = 1 - indexTip.x;
    const normalizedY = indexTip.y;
    const speed = state.settings.sensitivity;

    state.targetCursorX = clamp(normalizedX * window.innerWidth * speed, 0, window.innerWidth);
    state.targetCursorY = clamp(normalizedY * window.innerHeight * speed, 0, window.innerHeight);
  }

  function updateCursorVisual(pinching) {
    state.cursorX = lerp(state.cursorX, state.targetCursorX, 0.32);
    state.cursorY = lerp(state.cursorY, state.targetCursorY, 0.32);

    cursorEl.style.left = `${state.cursorX}px`;
    cursorEl.style.top = `${state.cursorY}px`;
    cursorEl.classList.toggle("pinching", pinching);
  }

  function handleScrollMode(landmarks) {
    const palmCenterY = (
      landmarks[LANDMARK.WRIST].y +
      landmarks[LANDMARK.INDEX_PIP].y +
      landmarks[LANDMARK.MIDDLE_PIP].y
    ) / 3;

    if (state.lastPalmCenter == null) {
      state.lastPalmCenter = palmCenterY;
      return;
    }

    const delta = state.lastPalmCenter - palmCenterY;
    if (Math.abs(delta) > 0.015) {
      window.scrollBy({
        top: -delta * 1200,
        behavior: "auto"
      });
    }

    state.lastPalmCenter = palmCenterY;
  }

  function triggerHistoryNavigation(direction) {
    const now = performance.now();
    if (now - state.lastSwipeAt < 900) {
      return;
    }
    state.lastSwipeAt = now;

    if (direction === "left") {
      window.history.back();
      showToast("Swipe left: Back");
    } else {
      window.history.forward();
      showToast("Swipe right: Forward");
    }
  }

  function handleSwipe(landmarks) {
    const indexTip = landmarks[LANDMARK.INDEX_TIP];
    const currentX = indexTip.x;
    if (state.lastSwipeX == null) {
      state.lastSwipeX = currentX;
      return;
    }

    const deltaX = currentX - state.lastSwipeX;
    if (deltaX < -0.16) {
      triggerHistoryNavigation("left");
      state.lastSwipeX = currentX;
      return;
    }

    if (deltaX > 0.16) {
      triggerHistoryNavigation("right");
      state.lastSwipeX = currentX;
      return;
    }

    state.lastSwipeX = lerp(state.lastSwipeX, currentX, 0.4);
  }

  function dispatchSyntheticClick(x, y) {
    const target = document.elementFromPoint(x, y);
    if (!target) {
      return;
    }

    const eventInit = {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      view: window
    };

    target.dispatchEvent(new MouseEvent("mousemove", eventInit));
    target.dispatchEvent(new MouseEvent("mousedown", eventInit));
    target.dispatchEvent(new MouseEvent("mouseup", eventInit));
    target.dispatchEvent(new MouseEvent("click", eventInit));
    showToast("Pinch: Click");
  }

  function handlePinch(landmarks) {
    const thumbTip = landmarks[LANDMARK.THUMB_TIP];
    const indexTip = landmarks[LANDMARK.INDEX_TIP];
    const pinching = distance(thumbTip, indexTip) < 0.055;
    const now = performance.now();

    if (pinching && now - state.lastClickAt > 650) {
      state.lastClickAt = now;
      dispatchSyntheticClick(state.cursorX, state.cursorY);
    }

    return pinching;
  }

  function resetHandState() {
    state.lastPalmCenter = null;
    state.lastSwipeX = null;
    cursorEl.classList.remove("pinching");
    updateModeLabel(state.running ? "Searching..." : "Idle");
  }

  function processFrame() {
    if (!state.running) {
      return;
    }

    const result = state.latestResult;
    const landmarks = result?.landmarks;

    fpsEl.textContent = `${Math.round(result?.fps || 0)} FPS`;
    drawPreview(result);

    if (!landmarks) {
      resetHandState();
      updateCursorVisual(false);
      state.animationFrameId = window.requestAnimationFrame(processFrame);
      return;
    }

    const openPalm = detectOpenPalm(landmarks);
    const indexOnly = detectIndexOnly(landmarks);
    const pinching = handlePinch(landmarks);

    handleSwipe(landmarks);

    if (openPalm) {
      updateModeLabel("Scroll Mode");
      handleScrollMode(landmarks);
    } else {
      state.lastPalmCenter = null;

      if (indexOnly || pinching) {
        updateModeLabel(pinching ? "Pinch Click" : "Cursor Mode");
        updateCursorFromIndexFinger(landmarks);
      } else {
        updateModeLabel("Hand Detected");
      }
    }

    updateCursorVisual(pinching);
    state.animationFrameId = window.requestAnimationFrame(processFrame);
  }

  function startLoop() {
    window.cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = window.requestAnimationFrame(processFrame);
  }

  function stopLoop() {
    window.cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = 0;
  }

  function startTracking() {
    if (!state.bridgeReady || state.running) {
      return;
    }

    window.postMessage({ type: "HAND_GESTURE_START" }, "*");
  }

  function stopTracking({ notifyBridge = true } = {}) {
    if (notifyBridge && state.bridgeReady) {
      window.postMessage({ type: "HAND_GESTURE_STOP" }, "*");
    }

    state.running = false;
    stopLoop();
    resetHandState();
    drawPreview(null);
    chrome.runtime.sendMessage({ type: "GESTURE_STATUS", active: false }).catch(() => {});
  }

  function applySettings(nextSettings) {
    state.settings = { ...state.settings, ...nextSettings };
    setPreviewVisibility(state.settings.showPreview);

    if (state.settings.enabled) {
      injectBridge();
      if (state.bridgeReady) {
        startTracking();
      }
    } else {
      stopTracking();
    }
  }

  window.addEventListener(BRIDGE_EVENT, (event) => {
    const { type, payload } = event.detail || {};

    if (type === "started") {
      state.running = true;
      updateModeLabel("Searching...");
      chrome.runtime.sendMessage({ type: "GESTURE_STATUS", active: true }).catch(() => {});
      startLoop();
      return;
    }

    if (type === "results") {
      state.latestResult = payload;
      if (payload?.landmarks) {
        updateModeLabel("Hand Detected");
      }
      return;
    }

    if (type === "stopped") {
      stopTracking({ notifyBridge: false });
      return;
    }

    if (type === "error") {
      showToast(payload?.message || "Unable to access the camera.");
      chrome.storage.sync.set({ enabled: false });
      stopTracking();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    const nextSettings = {};
    if (changes.enabled) {
      nextSettings.enabled = changes.enabled.newValue;
    }
    if (changes.sensitivity) {
      nextSettings.sensitivity = changes.sensitivity.newValue;
    }
    if (changes.showPreview) {
      nextSettings.showPreview = changes.showPreview.newValue;
    }

    applySettings(nextSettings);
  });

  window.addEventListener("beforeunload", () => {
    stopTracking();
  });

  chrome.storage.sync.get(DEFAULT_SETTINGS).then(applySettings);
})();
