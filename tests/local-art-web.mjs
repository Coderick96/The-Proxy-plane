import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { openArtStudio } from "../src/proxy-plane-art.mjs";

const editorOrigin = "https://proxy-plane.example";
const studioOrigin = "http://127.0.0.1:8765";
const listeners = new Set();
const popup = { closed: false, close() { this.closed = true; } };
let popupUrl;
globalThis.location = { origin: editorOrigin };
globalThis.window = {
  open(url) { popupUrl = url; return popup; },
  addEventListener(type, listener) { listeners.add(listener); },
  removeEventListener(type, listener) { listeners.delete(listener); },
};
function deliver(data, origin = studioOrigin, source = popup) {
  for (const listener of listeners) listener({ data, origin, source });
}

let selected;
const dispose = openArtStudio(art => { selected = art; }, error => assert.fail(error));
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=";
const events = [11, 12, 13].map(seed => ({ seed, original: png, card: png }));
const ndjson = [...events, { done: true }].map(JSON.stringify).join("\n") + "\n";
const html = await readFile(new URL("../local-art-studio/index.html", import.meta.url), "utf8");
const dom = new JSDOM(html, {
  url: popupUrl,
  runScripts: "dangerously",
  beforeParse(win) {
    win.opener = { postMessage(data, target) {
      assert.equal(target, editorOrigin);
      deliver(data);
    } };
    win.Blob = Blob;
    win.TextDecoder = TextDecoder;
    win.URL.createObjectURL = URL.createObjectURL;
    win.fetch = async (url, options) => {
      assert.equal(url, "/generate");
      assert.deepEqual(JSON.parse(options.body), { prompt: "A moonlit tower", layout: "portrait" });
      return new Response(new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(ndjson.slice(0, 25)));
          controller.enqueue(encoder.encode(ndjson.slice(25)));
          controller.close();
        },
      }));
    };
  },
});

try {
  const { document, Event } = dom.window;
  document.querySelector("#prompt").value = "A moonlit tower";
  document.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true }));
  for (let attempt = 0; attempt < 40 && document.querySelector("#generate").disabled; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const choices = document.querySelectorAll("#choices button");
  assert.equal(choices.length, 3);
  assert.match(document.querySelector("#status").textContent, /All three images/);
  const forged = { type: "proxy-plane:art-selected", ...events[0],
    card: new Blob([], { type: "image/png" }), original: new Blob([], { type: "image/png" }),
    layout: "portrait" };
  deliver(forged, "https://other.example");
  deliver(forged, studioOrigin, {});
  assert.equal(selected, undefined);
  choices[1].click();
  assert.equal(selected.seed, 12);
  assert.equal(selected.layout, "portrait");
  assert.deepEqual(Buffer.from(await selected.original.arrayBuffer()), Buffer.from(png, "base64"));
  assert.equal(choices[1].getAttribute("aria-pressed"), "true");
  assert.equal(document.querySelectorAll("#downloads a").length, 2);
  assert.equal(popup.closed, true);
  assert.equal(listeners.size, 0);
  console.log("Local art web integration passed with fixture PNGs.");
} finally {
  dispose();
  dom.window.close();
}
