// Shared runtime helpers used across UI, systems, and rendering.

const toastState = {
  timeoutId: null,
};

let toastEl = null;

function ensureToastElement() {
  if (toastEl) {
    return toastEl;
  }
  toastEl = document.createElement("div");
  toastEl.id = "farm-toast";
  Object.assign(toastEl.style, {
    position: "fixed",
    left: "50%",
    bottom: "112px",
    transform: "translateX(-50%) translateY(8px)",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "rgba(38, 28, 18, 0.9)",
    color: "#fff7e6",
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.01em",
    opacity: "0",
    pointerEvents: "none",
    transition: "opacity 0.18s ease, transform 0.18s ease",
    zIndex: "9999",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.28)",
  });
  document.body.appendChild(toastEl);
  return toastEl;
}

function positionToastElement(el, options = {}) {
  const anchorRect = options.anchorRect || null;
  const hasAnchor = anchorRect && typeof canvas !== "undefined" && canvas?.getBoundingClientRect;
  if (!hasAnchor) {
    el.style.left = "50%";
    el.style.top = "";
    el.style.bottom = "112px";
    el.style.transform = "translateX(-50%) translateY(0)";
    return {
      hiddenTransform: "translateX(-50%) translateY(8px)",
      visibleTransform: "translateX(-50%) translateY(0)",
    };
  }

  const canvasRect = canvas.getBoundingClientRect();
  const anchorX = canvasRect.left + anchorRect.x + anchorRect.width / 2;
  const anchorY = canvasRect.top + anchorRect.y - 10;
  el.style.left = `${Math.round(anchorX)}px`;
  el.style.top = `${Math.round(anchorY)}px`;
  el.style.bottom = "auto";
  el.style.transform = "translateX(-50%) translateY(0)";
  return {
    hiddenTransform: "translateX(-50%) translateY(8px)",
    visibleTransform: "translateX(-50%) translateY(0)",
  };
}

function showToast(message, options = {}) {
  if (!message) {
    return;
  }
  const el = ensureToastElement();
  const transforms = positionToastElement(el, options);
  el.textContent = message;
  el.style.opacity = "1";
  el.style.transform = transforms.visibleTransform;
  if (toastState.timeoutId) {
    clearTimeout(toastState.timeoutId);
  }
  toastState.timeoutId = window.setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = transforms.hiddenTransform;
    toastState.timeoutId = null;
  }, 1400);
}

function rarityName(rarity) {
  if (rarity === "basic") {
    return "Basic";
  }
  if (rarity === "rare") {
    return "Rare";
  }
  return "Epic";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return "0";
  }
  const sign = numeric < 0 ? "-" : "";
  const absolute = Math.abs(numeric);
  if (absolute < 1000) {
    return `${sign}${new Intl.NumberFormat("ko-KR").format(Math.floor(absolute))}`;
  }

  let unitIndex = 0;
  let scaled = absolute / 1000;
  while (scaled >= 1000) {
    scaled /= 1000;
    unitIndex += 1;
  }
  const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  let rounded = Number(scaled.toFixed(decimals));
  if (rounded >= 1000) {
    rounded /= 1000;
    unitIndex += 1;
  }
  return `${sign}${String(rounded).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1")}${getAlphabetSuffix(unitIndex)}`;
}

function getAlphabetSuffix(index) {
  let safeIndex = Math.max(0, Math.floor(Number(index || 0)));
  let suffix = "";
  do {
    suffix = String.fromCharCode(97 + (safeIndex % 26)) + suffix;
    safeIndex = Math.floor(safeIndex / 26) - 1;
  } while (safeIndex >= 0);
  return suffix;
}

function formatShortDuration(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(Number(seconds || 0)));
  const minutes = Math.floor(safeSeconds / 60);
  const remainSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainSeconds).padStart(2, "0")}`;
}
