(() => {
  if (window.__handGestureBridgeLoaded) {
    return;
  }

  window.__handGestureBridgeLoaded = true;

  const BRIDGE_EVENT = "HAND_GESTURE_BRIDGE_EVENT";
  const bridgeScript = document.currentScript;
  const assetConfig = {
    cameraUtilsUrl: bridgeScript?.dataset.cameraUtilsUrl || "",
    handsScriptUrl: bridgeScript?.dataset.handsScriptUrl || "",
    handsBaseUrl: bridgeScript?.dataset.handsBaseUrl || ""
  };

  const bridgeState = {
    active: false,
    starting: false,
    hands: null,
    camera: null,
    video: null,
    lastFrameAt: 0
  };

  const emit = (detail) => {
    window.dispatchEvent(new CustomEvent(BRIDGE_EVENT, { detail }));
  };

  async function loadMediaPipeHands() {
    if (window.Hands && window.Camera) {
      return;
    }

    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-gesture-lib="mediapipe-hands"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const scripts = [
        assetConfig.cameraUtilsUrl,
        assetConfig.handsScriptUrl
      ].filter(Boolean);

      if (!scripts.length) {
        reject(new Error("Missing local MediaPipe asset URLs."));
        return;
      }

      let loaded = 0;
      for (const src of scripts) {
        const script = document.createElement("script");
        script.src = src;
        script.dataset.gestureLib = "mediapipe-hands";
        script.async = false;
        script.onload = () => {
          loaded += 1;
          if (loaded === scripts.length) {
            resolve();
          }
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.documentElement.appendChild(script);
      }
    });
  }

  async function startTracking() {
    if (bridgeState.active || bridgeState.starting) {
      return;
    }

    bridgeState.starting = true;

    try {
      await loadMediaPipeHands();

      const existingVideo = document.getElementById("gesture-bridge-video");
      existingVideo?.remove();

      const video = document.createElement("video");
      video.id = "gesture-bridge-video";
      video.setAttribute("playsinline", "true");
      video.muted = true;
      video.style.display = "none";
      document.documentElement.appendChild(video);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      video.srcObject = stream;
      await video.play();

      const hands = new window.Hands({
        locateFile: (file) => `${assetConfig.handsBaseUrl}${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.55
      });

      hands.onResults((results) => {
        const now = performance.now();
        const deltaMs = bridgeState.lastFrameAt ? now - bridgeState.lastFrameAt : 0;
        bridgeState.lastFrameAt = now;

        emit({
          type: "results",
          payload: {
            imageWidth: results.image?.width || video.videoWidth || 640,
            imageHeight: results.image?.height || video.videoHeight || 480,
            landmarks: results.multiHandLandmarks?.[0] || null,
            fps: deltaMs > 0 ? 1000 / deltaMs : 0
          }
        });
      });

      const camera = new window.Camera(video, {
        onFrame: async () => {
          await hands.send({ image: video });
        },
        width: 640,
        height: 480
      });

      await camera.start();

      bridgeState.active = true;
      bridgeState.video = video;
      bridgeState.hands = hands;
      bridgeState.camera = camera;

      emit({
        type: "started",
        payload: {
          width: video.videoWidth || 640,
          height: video.videoHeight || 480
        }
      });
    } finally {
      bridgeState.starting = false;
    }
  }

  async function stopTracking() {
    if (!bridgeState.active) {
      return;
    }

    bridgeState.camera?.stop();
    bridgeState.hands?.close();

    const tracks = bridgeState.video?.srcObject?.getTracks?.() || [];
    for (const track of tracks) {
      track.stop();
    }

    bridgeState.video?.remove();

    bridgeState.active = false;
    bridgeState.video = null;
    bridgeState.hands = null;
    bridgeState.camera = null;
    bridgeState.lastFrameAt = 0;

    emit({ type: "stopped" });
  }

  window.addEventListener("message", async (event) => {
    if (event.source !== window || !event.data?.type) {
      return;
    }

    if (event.data.type === "HAND_GESTURE_START") {
      try {
        await startTracking();
      } catch (error) {
        emit({
          type: "error",
          payload: {
            message: error?.message || "Unable to start hand tracking."
          }
        });
      }
    }

    if (event.data.type === "HAND_GESTURE_STOP") {
      await stopTracking();
    }
  });
})();
