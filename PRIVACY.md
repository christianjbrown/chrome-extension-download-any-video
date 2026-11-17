# Privacy

Christian's Download Any Video doesn't collect or send any of your data, and the only thing it stores is which colour scheme the toolbar is in. There are no accounts, no analytics and no servers: everything it does happens in your own browser.

When you click the button, it looks at the page in that tab to find the address of the video it is showing, fetches that video into a hidden page inside Chrome (piece by piece, when the site serves it as a stream), converts it there into an MP4 that plays everywhere, and asks Chrome to save the result. If the video cannot be fetched or cannot be converted, Chrome downloads the original address instead. Either way the video goes straight to your downloads folder.

The extension can reach any website, which is what lets it fetch the video from wherever the site keeps it. It only ever fetches the one video you clicked the button for, and only when you click.

That hidden page also checks whether your computer is in its light or dark colour scheme, so the toolbar button can be drawn to match. Chrome can be set to Light or Dark separately, so when you click the button the extension also asks the page you are on which one it is in, and remembers the answer (light or dark, nothing else) in Chrome's local storage. It reads nothing else.

Nothing it sees leaves your computer, and none of it is shared with anyone.

Questions? Open an issue at https://github.com/christianjbrown/chrome-extension-download-any-video/issues.
