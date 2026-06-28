# Phase 6 — `embedMarkup` output

Input: array of strip URLs

```js
embedMarkup([
  'https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/1a2b3c/p0.svg',
  'https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/1a2b3c/p1.svg',
]);
```

Output (single line, zero inter-tag whitespace):

```html
<pre><picture><img src="https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/1a2b3c/p0.svg" alt=""></picture><picture><img src="https://raw.githubusercontent.com/mohasarc/change-tree-svg/media/trees/1a2b3c/p1.svg" alt=""></picture></pre>
```

Empty input throws `RenderError`:

```js
embedMarkup([]); // RenderError: Cannot render tree: no strip urls to embed.
```
