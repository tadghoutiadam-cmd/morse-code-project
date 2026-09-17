# Morse ⇌ Voice

A self-contained web app that turns Morse code into spoken language — and back again. Type it out, or key it in live with real timing, and hear it two ways: as actual telegraph beeps, and read aloud in plain speech.

**[Live demo →](https://claude.ai/artifact/VUqwPPaGUZeNoA4LMr3NkN)**

## Features

- **Two input modes** — type dots/dashes directly, or hold a key (on-screen button or spacebar) and send real Morse by hand
- **Timing-based decoding** — press duration is classified into dots and dashes, and pause length determines letter and word breaks, following standard Morse timing (the 1:3:7 unit ratio)
- **Live audio** — hear the actual Morse tones via the Web Audio API, synced to a lamp indicator and an oscilloscope trace
- **Text-to-speech** — decoded text is read aloud via the Web Speech API, with a selectable system voice
- **Adjustable send speed** — 5–30 WPM
- **Copy to clipboard**
- No build step, no framework, no dependencies beyond two Google Fonts

## Tech

Vanilla HTML/CSS/JS. Web Audio API for tone generation, Web Speech API (`SpeechSynthesisUtterance`) for text-to-speech, Canvas 2D for the oscilloscope.

## Run it

Just open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server
```

Works as-is on GitHub Pages — no build step required.

## Files

- `index.html` — markup
- `style.css` — styling
- `script.js` — app logic
