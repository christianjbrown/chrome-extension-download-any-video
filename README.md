# Download Any Video Chrome Extension 🎬

One button in your Chrome toolbar. Click it, and the video on the page lands in your downloads folder. No digging through the network tab, no right-click menu that the player swallowed, no copying a link into some sketchy website. Click, done. 🍿

## What you get 🪄

- **Videos that refuse to be saved.** Most players draw the video themselves and hand the `<video>` tag a `blob:` address that is useless outside the page. The real file is usually still written down somewhere nearby, and this goes and finds it.
- **It looks everywhere a page keeps its video:**
  - the `<video>` tag itself and its `<source>` children
  - the player around it, which is often a custom element with the real addresses on its attributes, JSON and all (it reads through open shadow DOM to get there)
  - the page's own word on it: `og:video` and friends, and any schema.org `VideoObject` in the structured data
  - what the page actually fetched, as a last resort
- **The sharpest copy wins.** When a player names several sizes, you get the tallest one, and the player's own word beats the page's metadata beats the network log.
- **The one you're looking at.** On a feed with many videos it takes the one showing the most of itself on screen.
- **Embeds count.** A video inside an iframe is found too, as long as Chrome lets the extension into that frame.
- **Good names.** Servers call video files things like `m2-res_720p.mp4`, which tells you nothing a week later. Downloads are named after the date, the time and the page title instead: `2026-11-09-16-05-my-cool-page.mp4`, with the file's real extension.

## Install it 🔧

You need [Node.js](https://nodejs.org) 22 or newer, and Chrome 126 or newer.

1. Grab the code and build it:

   ```bash
   git clone https://github.com/christianjbrown/chrome-extension-download-any-video.git
   cd chrome-extension-download-any-video
   npm ci
   npm run build
   ```

   That makes a `dist` folder, which is the actual extension.

2. Open `chrome://extensions` in Chrome.
3. Flip on **Developer mode** (top right).
4. Click **Load unpacked** and pick the `dist` folder.
5. Click the puzzle piece 🧩 in the toolbar and hit the pin next to **Christian's Download Any Video**.

### Updating a build 🔄

```bash
git pull
npm ci
npm run build
```

Then hit the reload arrow on the Christian's Download Any Video card in `chrome://extensions`.

## Using it 🖱️

1. Open a page with a video on it.
2. Click the button. It shows a blue **…** while it looks, then a **✓** when the file is in your downloads folder. Hover over it and the tooltip tells you the filename.

That's it. There is no step three. 🎉

## Good to know 🤓

- **Streams it can't stitch.** Some sites only ever hand out a playlist of little pieces (HLS or DASH) and never a whole file. When that's all there is, you get a red `!` saying so. Putting the pieces back together is on the list.
- **Protected video is off limits.** Anything behind DRM never exists as a file you could save, and this doesn't pretend otherwise.
- **Chrome's own pages** (`chrome://` anything, the Web Store) are off limits to every extension. Red `!` again.
- **Getting a save dialog every time?** That's Chrome's **Ask where to save each file before downloading** setting. Turn it off in `chrome://settings/downloads`.
- **A red `!` on the button** means something went wrong. Hover over it and the tooltip says what. It clears when the tab loads a new page.
- **It asks for three permissions:** `activeTab` and `scripting` to look at the tab you clicked on (and only that tab, only when you click), and `downloads` to save the file. No access to any other site, ever.

## No tracking 🔒

No analytics, no tracking, no ads, no accounts, and nothing phoning home. The only thing it ever fetches is the video itself, from wherever the page got it, and that goes straight into your downloads folder.

## Development 🛠️

It's TypeScript, bundled with esbuild, tested with Vitest.

```bash
npm test          # the unit tests
npm run ci        # everything CI checks: format, lint, types, unused code, 100% coverage, build
```

`npm run ci` is exactly what CI runs, and coverage has to stay at 100% for lines, branches, functions and statements, or it fails. To run it before every push, point git at the committed hook: `git config core.hooksPath .githooks`.

How it fits together, in `src`:

- **`background/`** is the service worker. A toolbar click puts the page script into every frame of the tab, asks each frame what it found (`page-script.ts`), picks the best candidate (`candidate-ranker.ts`), names it (`video-filename.ts`) and hands it to Chrome to download (`video-saver.ts`). The button says how it went (`toolbar-indicator.ts`).
- **`page/`** is the script injected into the page. It changes nothing and listens to nothing: `video-finder.ts` asks the finders in turn (`video-elements.ts`, `player-attributes.ts`, `page-metadata.ts`, `network-entries.ts`), `visible-video.ts` picks the video on screen, and the report waits on a global for the service worker to read.
- **`shared/`** is what the two agree on: the shape of a candidate, and what a URL's extension says about it.

Each way of finding a video is its own small class behind an interface, so teaching it a new trick means adding a class. Each context's `main.ts` is the only file that touches `chrome`, `window` or `document`; everything else gets its collaborators through its constructor and is tested on its own with fakes.

## Licence 📄

MIT. See [LICENSE](LICENSE).
