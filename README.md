# TOML to JSON Converter

Paste TOML configuration and get instant JSON output — parsed, validated and copyable, entirely in your browser.

**Live:** [toml-to-json-converter.itsjust.tools](https://toml-to-json-converter.itsjust.tools)

## Features

- Paste or upload TOML with instant client-side parsing
- Real-time JSON output with syntax highlighting
- Error reporting with line/column info for invalid TOML
- Toggle between pretty-printed and minified JSON output
- Supports tables, arrays, inline tables, dates/times and multiline strings
- Copy the JSON to the clipboard or download it as a `.json` file
- Round-trip preview showing the parsed key structure (newest conversions kept in history)
- Shareable state via URL, `.itsjust.json` import/export and image/PDF export
- 100% client-side — no data ever leaves your browser

## Usage

1. Paste your TOML into the input area (or use **Upload .toml**).
2. Pick **Pretty** or **Minified** output in the toolbar.
3. Copy the JSON or download it as `converted.json`.
4. Invalid TOML shows the parser error with the offending line and column.

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-toml-to-json-converter .
docker run -p 3000:3000 itsjust-toml-to-json-converter
```

## License

MIT
