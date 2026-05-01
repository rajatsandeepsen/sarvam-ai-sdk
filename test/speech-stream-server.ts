import { streamSpeech } from "../src";
import { sarvam } from "./sarvam";

const PORT = 3000;

const HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Sarvam streaming TTS</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
      textarea { width: 100%; padding: 0.75rem; font-size: 1rem; box-sizing: border-box; resize: vertical; }
      .row { display: flex; gap: 0.5rem; align-items: center; margin: 0.75rem 0; flex-wrap: wrap; }
      label { font-size: 0.85rem; color: #555; }
      select, input { padding: 0.4rem 0.5rem; font-size: 0.95rem; }
      button { padding: 0.6rem 1.2rem; font-size: 1rem; cursor: pointer; background: #111; color: #fff; border: none; border-radius: 4px; }
      button:disabled { opacity: 0.5; cursor: progress; }
      audio { width: 100%; margin-top: 1rem; }
      .meta { font-size: 0.8rem; color: #666; margin-top: 0.5rem; font-family: ui-monospace, monospace; }
    </style>
  </head>
  <body>
    <h1>Sarvam streaming TTS</h1>
    <p>Type any text. Audio playback begins as the first chunk arrives — no wait for full synthesis.</p>

    <textarea id="text" rows="5" placeholder="Type something to speak…">नमस्ते everyone। This is a streaming TTS demo. आप देखेंगे कि playback तुरंत शुरू हो जाता है क्योंकि browser audio chunks को progressively receive करता है.</textarea>

    <div class="row">
      <label>Language
        <select id="lang">
          <option value="en-IN">en-IN</option>
          <option value="hi-IN" selected>hi-IN</option>
          <option value="bn-IN">bn-IN</option>
          <option value="ta-IN">ta-IN</option>
          <option value="te-IN">te-IN</option>
          <option value="kn-IN">kn-IN</option>
          <option value="ml-IN">ml-IN</option>
          <option value="mr-IN">mr-IN</option>
          <option value="gu-IN">gu-IN</option>
          <option value="pa-IN">pa-IN</option>
          <option value="od-IN">od-IN</option>
        </select>
      </label>
      <label>Voice
        <select id="voice">
          <option value="aayan" selected>aayan</option>
          <option value="shubh">shubh</option>
          <option value="aditya">aditya</option>
          <option value="rahul">rahul</option>
          <option value="manan">manan</option>
          <option value="ritu">ritu</option>
          <option value="priya">priya</option>
          <option value="neha">neha</option>
          <option value="amelia">amelia</option>
          <option value="sophia">sophia</option>
        </select>
      </label>
      <label>Speed
        <input id="speed" type="number" min="0.5" max="2" step="0.1" value="1" style="width: 5rem;" />
      </label>
      <label>Format
        <select id="format">
          <option value="mp3" selected>mp3</option>
          <option value="wav">wav</option>
          <option value="opus">opus</option>
        </select>
      </label>
      <button id="go">Speak</button>
    </div>

    <audio id="player" controls></audio>
    <div class="meta" id="meta"></div>

    <script>
      const $ = (id) => document.getElementById(id);
      const player = $("player"), meta = $("meta"), btn = $("go");

      btn.addEventListener("click", async () => {
        const params = new URLSearchParams({
          text: $("text").value,
          lang: $("lang").value,
          voice: $("voice").value,
          speed: $("speed").value,
          format: $("format").value,
          t: Date.now().toString(),
        });
        const url = "/tts?" + params.toString();
        btn.disabled = true;
        meta.textContent = "Requesting…";
        const start = performance.now();
        let firstByteAt = null;

        player.src = url;
        player.addEventListener(
          "loadeddata",
          () => {
            firstByteAt = performance.now() - start;
            meta.textContent = \`First playable data: \${firstByteAt.toFixed(0)}ms · streaming from /tts\`;
          },
          { once: true },
        );
        player.addEventListener("ended", () => { btn.disabled = false; }, { once: true });
        player.addEventListener("error", () => {
          meta.textContent = "Playback error — check server logs.";
          btn.disabled = false;
        }, { once: true });

        try { await player.play(); } catch (e) { /* user gesture already on click */ }
      });
    </script>
  </body>
</html>`;

const SUPPORTED_LANGS = new Set([
	"hi-IN",
	"bn-IN",
	"kn-IN",
	"ml-IN",
	"mr-IN",
	"od-IN",
	"pa-IN",
	"ta-IN",
	"te-IN",
	"en-IN",
	"gu-IN",
]);

Bun.serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url);

		if (url.pathname === "/") {
			return new Response(HTML, {
				headers: { "content-type": "text/html; charset=utf-8" },
			});
		}

		if (url.pathname === "/tts") {
			const text = url.searchParams.get("text")?.trim();
			if (!text) return new Response("Missing `text`", { status: 400 });

			const lang = url.searchParams.get("lang") ?? "en-IN";
			if (!SUPPORTED_LANGS.has(lang)) {
				return new Response(`Unsupported language: ${lang}`, { status: 400 });
			}
			const voice = url.searchParams.get("voice") ?? "aayan";
			const speed = Number(url.searchParams.get("speed") ?? "1") || 1;
			const format = url.searchParams.get("format") ?? "mp3";

			const t0 = Date.now();
			console.log(
				`[${new Date().toISOString()}] /tts lang=${lang} voice=${voice} speed=${speed} format=${format} chars=${text.length}`,
			);

			try {
				const { audioStream, contentType, providerMetadata } =
					await streamSpeech({
						// biome-ignore lint/suspicious/noExplicitAny: language is validated above
						model: sarvam.speech("bulbul:v3", lang as any),
						text,
						voice,
						speed,
						outputFormat: format,
						abortSignal: req.signal,
					});

				console.log(
					`  → upstream ready in ${Date.now() - t0}ms · request_id=${providerMetadata.sarvam.request_id}`,
				);

				return new Response(audioStream, {
					headers: {
						"content-type": contentType ?? "audio/mpeg",
						"cache-control": "no-store",
					},
				});
			} catch (err) {
				console.error("  ✗ stream failed:", (err as Error).message);
				return new Response(`Stream failed: ${(err as Error).message}`, {
					status: 502,
				});
			}
		}

		return new Response("Not found", { status: 404 });
	},
});

console.log(`→ http://localhost:${PORT}`);
