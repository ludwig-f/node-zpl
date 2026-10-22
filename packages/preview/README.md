# @node-zpl/preview

`<zpl-preview>` is a web component that shows ZPL labels as images. Rendering happens locally in the browser with [zpl-renderer-js](https://github.com/Fabrizz/zpl-renderer-js) (the [zebrash](https://github.com/ingridhq/zebrash) renderer compiled to WebAssembly), so label data never leaves the page. Because it's a standard custom element, it works the same in plain HTML, React, Vue, Svelte and Angular.

```bash
npm install @node-zpl/preview
```

## Usage

Importing the package registers the element:

```html
<script type="module">
  import "@node-zpl/preview";
</script>

<zpl-preview zpl="^XA^PW400^LL200^FO20,20^A0,40^FDHello^FS^XZ"></zpl-preview>
```

Set the `zpl` property instead of the attribute to pass a [node-zpl](https://github.com/ludwig-f/node-zpl/tree/main/packages/zpl#readme) `Label`, or anything else with a `toZPL()` method:

```ts
import { Label, mm } from "node-zpl";
import "@node-zpl/preview";

document.querySelector("zpl-preview").zpl = new Label({ width: mm(50), height: mm(25), dpmm: 8 })
  .drawText({ position: { x: mm(3), y: mm(3) }, text: "Hello", font: { height: mm(4) } });
```

### Attributes and properties

| Attribute | Property | Default | Description |
| --- | --- | --- | --- |
| `zpl` | `zpl` | | ZPL to show. The property also accepts objects with `toZPL()`. |
| `width` | `width` | `^PW`, else 101.6 | Label width in millimeters |
| `height` | `height` | `^LL`, else 152.4 | Label height in millimeters |
| `dpmm` | `dpmm` | 8 | Dots per millimeter: 6, 8, 12 or 24 for 152, 203, 300 or 600 dpi |
| `grayscale` | `grayscale` | off | Smooth 8-bit output instead of the printer's 1-bit dots |

ZPL with several labels shows one image per label. Changes made together, like setting `dpmm` and `zpl` one after the other, render once.

### Events

- `zpl-render`: `event.detail.images` holds the rendered PNGs as data URLs.
- `zpl-error`: `event.detail.error` is the rendering error. The element also shows its message.

### Styling

The images and error message are exposed as [parts](https://developer.mozilla.org/en-US/docs/Web/CSS/::part): `zpl-preview::part(labels)` and `zpl-preview::part(error)`.

## Loading the renderer

The renderer is about 7 MB of WebAssembly. It's loaded with a dynamic `import()` the first time a preview renders, so bundlers put it in a separate chunk and pages without previews never download it.

To host the WebAssembly file yourself instead of bundling it into the JavaScript, copy `zpl-renderer-js/dist/zebrash.wasm` to your server and configure it before the first preview renders:

```ts
import { configure } from "@node-zpl/preview";

configure({ wasmUrl: "/assets/zebrash.wasm" });
```

You can also use a different renderer entirely. It receives the ZPL and size and returns one base64 PNG per label:

```ts
configure({
  render: async (zpl, { widthMm, heightMm, dpmm, grayscale }) => {
    // e.g. call your own rendering service
  },
});
```

## Frameworks

### React

React 19 passes props to custom elements as properties, so `zpl` can be a `Label`. Import `@node-zpl/preview/react` to register the element and add its props to React's JSX types:

```tsx
import "@node-zpl/preview/react";

<zpl-preview zpl={label} dpmm={8} onzpl-render={(event) => console.log(event.detail.images)} />;
```

React 18 sets everything on custom elements as attributes, so pass ZPL text there, or set the `zpl` property through a ref.

### Vue

Tell Vue that `zpl-preview` is a custom element (`compilerOptions.isCustomElement` in your Vue or Vite config), then bind the property with `.prop`:

```vue
<zpl-preview :zpl.prop="label" dpmm="8" @zpl-render="onRender" />
```

### Svelte

Svelte supports custom elements directly:

```svelte
<zpl-preview zpl={label} dpmm={8} on:zpl-render={onRender}></zpl-preview>
```

### Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to the component's `schemas`, then bind the property:

```html
<zpl-preview [zpl]="label" dpmm="8" (zpl-render)="onRender($event)"></zpl-preview>
```

## Server rendering

Importing the package where there is no DOM, such as during server rendering, is safe: the element is only registered in the browser.
