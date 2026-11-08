const studioOrigin = "http://127.0.0.1:8765";

export function openArtStudio(onSelect, onUnavailable = () => {}) {
  const url = new URL(studioOrigin);
  url.searchParams.set("parentOrigin", location.origin);
  const studio = window.open(url.href, "_blank", "popup,width=1050,height=850");
  if (!studio) throw new Error("Allow pop-ups to open Proxy Plane Art Studio.");

  function dispose() {
    window.removeEventListener("message", receive);
    clearInterval(watch);
    clearTimeout(readyTimeout);
  }

  function receive(event) {
    if (event.origin !== studioOrigin || event.source !== studio) return;
    if (event.data?.type === "proxy-plane:art-ready") {
      clearTimeout(readyTimeout);
      return;
    }
    const {type, card, original, seed, layout} = event.data ?? {};
    if (type !== "proxy-plane:art-selected" || !(card instanceof Blob)
        || !(original instanceof Blob) || card.type !== "image/png"
        || original.type !== "image/png" || !Number.isSafeInteger(seed)
        || !["portrait", "landscape"].includes(layout)) return;
    dispose();
    studio.close();
    onSelect({card, original, seed, layout});
  }

  window.addEventListener("message", receive);
  const readyTimeout = setTimeout(() => {
    onUnavailable("The local picker could not connect. Start Art Studio on this device, then reopen the picker. You can also download a PNG from the picker and upload it here.");
  }, 8000);
  const watch = setInterval(() => {
    if (studio.closed) dispose();
  }, 1000);
  return () => {
    dispose();
    studio.close();
  };
}
