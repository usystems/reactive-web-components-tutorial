# Web Components Tutorial

In this tutorial we are going to build a ui framework inspired by [vuejs](http://vuejs.org) but in just a few hundred 
lines of code. This is possible by using modern web technology, this means we only support new versions of Chrome, 
Safari and Edge.

## Building a Component System

In the first part we are going to build a simple page using the web component technologies.

### Template

Like vuejs, our component system ist template based. To define templates we use the native 
`<template>` tag. It has several advantages over 
`<script type="text/template">` or `<div style="display: none">`:

 * script tags are not executed
 * resources such as img or video are not fetched
 * custom elements are not evaluated

To access our templates we use the css selectors for now, we will change this later. The hello world tempalte looks the
follwoing: 
```html
<template id="hello-world-tpl">Hello World</template>
```

### Custom Elements

Modern frameworks provide components through custom elements. We use the CustomElementRegistry to define custom 
Elements. Custom elements must contain a dash in the tag name to avoid name conflicts with builtin elements. Native 
custom elements can be styled using CSS and have their own script. A custom element is always attached to a ES6 class
extending the native `HTMLElement`:
```javascript
class HelloWorld extends HTMLElement {
    constructor() {
        super();
        //...
    }
}
customElements.define('hello-world', HelloWorld);
```

### Shadow DOM

Encapsulated CSS and DOM can be achieved by Shadow DOM. We encapsulate our components inside a shadow dom. The shadow
DOM is attached to the custom element of the component. And the template is stamped into the shadow dom root. For this
we access the template by its selector
```javascript
const template = document.querySelector('#hello-world-tpl');
```
and stamp it into the current document with `importNode`. The content of a template can be accessed by the `content` 
property. The second parameter of the `importNode` method indicates if the child elements also should be copied. 
```javascript
const stampedTemplate = document.importNode(template.content, true);
```
Now we attach a shadow dom root to the custom element itself. With the mode option, we can allow the parent docuemnt
to access the elements inside the shadow dom via `componentElement.shadowRoot)`
```javascript
const shadowRoot = this.attachShadow({ mode: 'open' });
```
and append the stamped template to the shadow dom root.
```javascript
shadowRoot.appendChild(stampedTemplate);
```

### Use the Custom Element

We build a custem element `<hello-world>`. We can use this element in the body:
```
<body>
    <hello-world></hello-world>
</body>
``` 

### Full Code

if we put everything together wie get the following code
```html
<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<template id="hello-world-tpl">Hello World</template>
		<script>
			'use strict';
			class HelloWorld extends HTMLElement {
				constructor() {
					super();
					const template = document.querySelector('#hello-world-tpl');
					const stampedTemplate = document.importNode(template.content, true);
					const shadowRoot = this.attachShadow({ mode: 'open' });
					shadowRoot.appendChild(stampedTemplate);
				}
			}
			customElements.define('hello-world', HelloWorld);
		</script>
	</head>
	<body>
		<hello-world></hello-world>
	</body>
</html>
```

## Move the functionallity into a function using a Javascript Module

Since Chrome 61 javascript module imports are supported. This means we can directly import a class, variable or function
from a module file. So we move the `HelloWorld` class into a file named createComponent.js. The module file must export
the function using the ES6 module syntax:
```javascript
export default function createComponent(tagName, templateSelector) {
	const ComponentElement = class extends HTMLElement {
		constructor() {
			super();
			const template = document.querySelector(templateSelector);
			const stampedTemplate = document.importNode(template.content, true);
			const shadowRoot = this.attachShadow({ mode: 'open' });
			shadowRoot.appendChild(stampedTemplate);
		}
	};
	customElements.define(tagName, ComponentElement);
}
```
To import the function we need to add `type="module"` to the script tag: 
```html
<script type="module">
    'use strict';
    import createComponent from './createComponent.js';
    createComponent('hello-world', '#hello-world-tpl');
</script>
```
Native javascript module imports always needs to specify the full file path starting with a `./` if the file is in the 
same folder.

## Multiple Components

With the `compileComponent` we have a function to register a new component. Now we can build several components. For 
each component we need to provide a template:
```html
<template id="hello-world-tpl">Hello <first-name></first-name> <last-name></last-name></template>
<template id="first-name-tpl">Jon</template>
<template id="last-name-tpl">Smith</template>
```
In the template we can use custom element as well. Additionally we need to register the components:
```html
<script type="module">
    'use strict';
    import createComponent from './createComponent.js';
    createComponent('hello-world', '#hello-world-tpl');
    createComponent('first-name', '#first-name-tpl');
    createComponent('last-name', '#last-name-tpl');
</script>
```

## The Slot Element

The native tempalte tag provides a build in slot mechanism. The `<slot>` element in a template is replaced by content
provided inside the custom element tag. Inside the slot element, a default content can be provided, which will be
used if no slot content is provided. There are two slot mechanisms:

## Default Slot

If only one slot is needed, we can use an unnamed slot, where all the content from the custom element is inserted:

```html
<template id="bold-text"><strong><slot>NO CONTENT PROVIDED</slot></strong></template>
```
in the custom element, the content can be provided
```html
<bold-text>Highlighted Text</bold-text>
```
this will result in the follwong html inside the components shadow DOM
```html
<strong><slot>Highlighted Text</slot></strong>
```

## Named Slots

If several slotes are needet, slots can be named:

```html
<template id="formatted-comment">
	<h1><slot name="title"></slot></h1>
	<p><slot name="content"></slot></p>
</template>
```
in the custom element, the content can be provided with the slot attribute to match the slots
```html
<formatted-comment>
	<span slot="title">The Title</span>
	<span slot="content">The Content</span>
</formatted-comment>
```
this will result in the follwong html inside the components shadow DOM
```html
<h1>The Title</h1>
<p>The Content</p>
```

## Styling

With the template and the slot tag, there are also special CSS selectors to style the host- and slotted content:

 * There are three new pseudo classes defined to style the host element: `:host`, `:host()`, `:host-context()`
 * There is a pseudo elements to style the slotted content: `::slotted()`

an overview over the new CSS selectors can be found 
[here](https://developers.google.com/web/fundamentals/web-components/shadowdom#styling)

## Full Code and Next Step

Have a look the the full code:

*  [index.html](./index.html). 
*  [createComponent.js](./createComponent.js). 

Next we introduce the native [slot element](../3-slot/index.md)


## Build Chain
Since we directly import the files from the browser, we don't need a bundler like webpack. If your concerned 
about loading many file in the browser you can use HTTP/2 Server Push to send the files at the same time.

## Serving the files
We only serve static html and javascript files. To make life easier your can use the zero configuration 
[http-server](https://www.npmjs.com/package/http-server) to serve the files locally. Run
```
npm install http-server
```
to install the webserver. Go to your project root and run the command
```
http-server ./ -p 3000
```
to start the webserver on port 3000. Now, you can access the file from the url
```
http://localhost:3000/1-javascript-module-import/index.html
```

### Conclusion

In this part we have set up a simple component rendering system using web components:

*  [index.html](./index.html). 
*  [createComponent.js](./createComponent.js). 

In the [Next Part](../1-template-compiler/index.md) we add functionality to our components. 
