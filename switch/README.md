# Edgar on the Switch

The same game, on a homebrew-enabled Nintendo Switch through
[nx.js](https://nxjs.n8.io) — a JavaScript runtime with a Canvas and Web Audio,
but no DOM.

Nearly all of it is the browser's code, untouched. `src/` holds only the two
files nx.js cannot provide — the entry point and the input binding — and pulls
everything else from `../src/js` through the `@game/*` alias. It is a project
of its own, with its own `package.json` and its own `node_modules`, so cloning
the repository for the web game installs none of this.

## Building

```bash
npm install       # once, in this directory
npm run nro       # dist/edgar.nro, with the runtime inside
npm run send      # ... and put it on the console right away
```

The NRO has to reach the Switch: copy it to `switch/` on the SD card, or let
[nxlink](https://github.com/switchbrew/switch-tools) push it over the network,
which is what `npm run send` does and which Sphaira listens for by default.

`npm run nro:slim` builds a 400 KB file instead of a 54 MB one for a console
that already carries the nx.js runtime of the same version. `npm run check`
typechecks this build — linting covers it from the project root.
