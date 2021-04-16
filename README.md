# magnit-modal
A zero-dependency, vanilla javascript (es6) modal web component.

## setup
```html
<script defer type="module">
    import MagnitModalComponent from './magnit-modal.component.js';
</script>
```
```js
    import MagnitModalComponent from './magnit-modal.component.js';
```

## demo
see the demo in action, and inspect it in the dev tools for code examples.

## project
`MagnitModalComponent` is ~25KB unminified, uncompressed and unoptimized. It is intended as a simple drop-in component that can be used to quick-start a UI while being versitile and accessible. With a single line to import, you can create fully styled and themed modals for displaying errors, or handling modal form content.

The project is written verbose (there's a minified version, but that doesn't fix the architechture) as a way to leave it open for editing to fit any specific project. Some of the code patterns can be optimized out, completely, depending upon your use cases. Leaving the code verbose and "dumb" lets you cut out chunks with high confidence and ease.

### points of interest
- ES6; one file, one import. all styles and templates included.
- ~25KB unminified, uncompressed and unoptimized.
- ~15KB minified, ~5KB minified+gzip; still unoptimized.
- NO shadow dom. fully style-able and overrideable.
- customizeable element name to prevent collissions.
- helper functions like `ask()`, which can be `await`ed to get a result back, and `submitForm()` which can be `await`ed to handle form submission failures.
- simple, but pre-existing themes. no setup necessary.
- css properties for themeing to make allow for quick/simple customizations
- NOT accessible (but maybe accessible?). Zero accessibility testing was done on this, to be perfectly clear. But there WERE efforts made to preserve and restore focus, contain the tab loop, and respect the escape key to close. The component also expects native elements, like buttons, for default functionality, encouraging browser standards. And, lastly, the `role` and `aria-labelledby` attributes are in use.  
  So while I'm not implying that's "good enough", I don't feel I've neglected the area. This just isn't production code. 

### basics
After importing, a simple modal can be created by adding a `magnit-modal` element as a direct child of the body (this isn't strictly a REQUIREMENT, it's just what I've been made to understand is appropriate for ARIA support).
Here's a example of the most basic modal:
```html
<magnit-modal>
    <p slot="content">Hola Mundo!</p>
</magnit-modal>
```
This will generate a simple modal with a simple message and a close button.

---

If you'd like to add a simple "Ok" button, that can be done by adding a `type` attribute of "message". There's only the one type, though, so that's all you need to remember:
```html
<magnit-modal type="message">
    <p slot="content">Hola Mundo!</p>
</magnit-modal>
```
This will generate a modal with a button that says "Ok", and closes the modal when clicked.

---

If you would like to set up your own choices, just use the "choices" slot:
```html
<magnit-modal>
    <p slot="content">Hola Mundo!</p>
    <ul slot="choices">
        <li><button class="a" type="button">A</button></li>
        <li><button class="b" type="button">B</button></li>
        <li><button class="c" type="button">C</button></li>
    </ul>
</magnit-modal>
```
This slot can contain any number of "choices" which are any 'button' elements that are found in this choices element.

---

When a modal closes, it reports the method that was used to close it, so you can interrogate the element for unique data. For example:
```js
const $choice = await $myModal.ask();
```
Here, the `$choice` element will be either the choice button element that was clicked, or the "close" button or "shade" element, if either of those were used to close the modal.

---

If you need to interrogate the choice before you want to let the modal close, you can do so by passing a `canClose` callback into the ask function, like this:
```js
const $choice = await $myModal.ask(($choice) =>
{
    if($choice.classList.contains('cancel'))
    {
        return true; // trying to cancel; the modal can close.
    }

    if($choice == x)
    {
        // it worked!
        return true;
    }

    return false; // the test failed. the modal can not close.
});

const z = 'z'; // this code won't run until the modal has closed.
```

### styling
`MagnitModalComponent` does NOT use the ShadowDOM, so all styling can be done by targeting any of the elements in the modal in your regular styling method. 

In addition to being an entirely LightDOM element, any element that takes advantage of a slot - that is, any element that uses the `slot` attribute to replace a named slot in the template - has the slot's `name` preserved as a class on the element. This prevents silly nonsense like this:
```html
<magnit-modal>
    <div slot="content" class="content">...</div>
</magnit-modal>
```
Simply by consuming the "content" slot, the element will be given a class of "content" which can be used to style the element or its children.

Style scope is not really a concern of mine, as I don't know of many situation where it can't be overcome with targeted selectors, and this element has a customizeable element name, so that should cover scope in most cases. Obviously, if you've got a niche that I should know about, feel free to leave an issue.

### quick reference
#### custom attributes
- `type` `[default: none]`: Setting this to `message` will create a modal similar to an "alert" dialog with an "Ok" button that closes the modal. No other values are valid.
- `close-button` `[default: true]`: When this is true, the modal displays a close button in the header controls that closes the modal. When this is false, that button is removed.
- `use-shade` `[default: false]`: When this is true, the modal hides the rest of the page behind a translucent shade. When this is false, the shade is entirely clear.
- `shade-close` `[default: false]`: When this is true, clicking anywhere on the shade element will attempt to close the modal. When this is false, clicks on the shade are ignored.
#### `slot`s:
- `title-icon`: A small icon at the top-left corner of the modal. Usually used to reinforce context.
- `title`: The text that will appear at the top of the modal.
- `controls`: An element containing buttons that will appear in the top-right of the modal. Usually used for a "close" or "settings" function.
- `content`: 
- `choices`: 

#### themes:
- `default`: A simple, basic style. Light Gray.
  - `--font-color`: #393939;
  - `--primary-color`: #707683;
  - `--background-color`: #e9e9eb;
- `info`: A style to indicate information. Blue.
  - `--font-color`: #393939;
  - `--primary-color`: #3d84e5;
  - `--background-color`: #cde2ff;
- `success`: A style to indicate success. Green.
  - `--font-color`: #393939;
  - `--primary-color`: #3ac279;
  - `--background-color`: #c5f7dc;
- `warning`: A style to indicate caution. Yellow.
  - `--font-color`: #393939;
  - `--primary-color`: #e89f29;
  - `--background-color`: #ffe8c3;
- `error`: A style to indicate failure. Red.
  - `--font-color`: #393939;
  - `--primary-color`: #e9594c;
  - `--background-color`: #ffcfcb;