# Template Compiler

In the last part we created the `createComponent` function to create a web component. In this part we are going to 
implement a tempalte compiler to allow interpolation, bound attributes and event handlers.

## Text Interpolation

Until now, our web components looks always the same, we have no possibility to include different values per component 
instance. But we want to look our components different, e.g
```html
	<template id="hello-world-tpl">Hello ${name}</template>
```
For string interpolation we are going to use the javascript `template literal` syntax, i.e. expression can be included
with `${expression}`. The expressions are evaluated in the scope of the component class, this means the string 
`Hello ${name}` becoms `'Hello ' + scope.name`. Whats missing now is a possibility to pass a component scope to 
the `createComponent` function like:
```javascript
	class HelloWorld {
		constructor() {
			this.name = "Jon";
			this.position = "Manager";
		}
	}
	createComponent('hello-world', '#hello-world-tpl', HelloWorld);
```
To make this possible we extend our `createTemplate` class and add a third argument with the template class:

```javascript
export default function createComponent(tagName, templateSelector, ComponentClass) {
	const ComponentElement = class extends HTMLElement {
		constructor() {
			super();
			const component = new ComponentClass();
			const template = document.querySelector(templateSelector);
			const stampedTemplate = document.importNode(template.content, true);
			const shadowRoot = this.attachShadow({ mode: 'open' });
			shadowRoot.appendChild(stampedTemplate);
		}
	};
	customElements.define(tagName, ComponentElement);
}
```
The last bit which is missing now is a template compiler. 

### Compile Content Interpoations

To replace the expression in the template we need to compile the template in some way. Lets create a template compiler 
for this. We create a new es6 module called `TemplateCompiler.js`:
```javascript
export default class TemplateCompiler {
	static compile(scope, template) {
		TemplateCompiler.compileContentExpressions(scope, template);
	}
	static compileContentExpressions(scope, template) {
		const xPath = '//text()[contains(.,"${") and contains(substring-after(.,"${"),"}")]';
		for (let textNode of TemplateCompiler.evaluateXPaht(template, xPath)) {
			const compiledValue = new Function('', `with (this) return \`${textNode.nodeValue}\`;`);
			textNode.nodeValue = compiledValue.call(scope);
		}
	}
	static *evaluateXPaht(template, xPath) {
		const xPathResult = document.evaluate(
			xPath,
			template.firstElementChild,
			null,
			XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
			null
		);
		for (let index = 0; index < xPathResult.snapshotLength; index += 1) {
			yield xPathResult.snapshotItem(index);
		}
	}
}
```
We look search for all interpolations using xPath. Modern Browser support xPath through `document.evaluate`. But the
interface of `doucment.evaluate` is non standard, so we use a generator to convert the xpath results to an iterable.

The actual text interpolation becomes quite simple: 
  1. we evaluate the xPath `//text()[contains(.,"${") and contains(substring-after(.,"${"),"}")]` which returns all 
     text nodes which contains `${` followed by `}`.
  2. we loop over the matched text nodes
  3. and create a function which evaluates the text nodes content as a string literal in the context of the function
     itself: `with (this) return \``${textNode.nodeValue}\``;`
  4. finally we replace the nodeValue of the text node with the return value of the function evaluated in the context
     of the component class.

Now we need to call the `TemplateCompiler` before we add the template to the shadow dom:
```javascript
import TemplateCompiler from './TemplateCompiler.js'
export default function createComponent(tagName, templateSelector, ComponentClass) {
	const ComponentElement = class extends HTMLElement {
		constructor() {
			super();
			const component = new ComponentClass();
			const template = document.querySelector(templateSelector);
			const stampedTemplate = document.importNode(template.content, true);
			TemplateCompiler.compile(component, stampedTemplate);
			const shadowRoot = this.attachShadow({ mode: 'open' });
			shadowRoot.appendChild(stampedTemplate);
		}
	};
	customElements.define(tagName, ComponentElement);
}

```

## Evaluated Attributes

Besides text interpolation we also want evaluated attributes. Here we take the syntax from [vuejs](http://vuejs.org):
An attribute is evaluated if the name starts with a colon `:`. The attribute value is interpreted as an expression in 
the scope of the component class. I.e. `:title="position"` is replaced with `title="scope.position"`

To achieve this, we extend out template compiler with a `compileAttributeExpressions` method:
```javascript
static compileAttributeExpressions(scope, template) {
	for (let attribute of TemplateCompiler.evaluateXPaht(template, '//@*[starts-with(name(), ":")]')) {
		const compiledValue = new Function('', `with (this) return ${attribute.value};`);
		attribute.ownerElement.setAttribute(attribute.name.substr(1), compiledValue.call(scope));
		attribute.ownerElement.removeAttribute(attribute.name);
	}
}
```
The attribute interpolation does the following: 
  1. we evaluate the xPath `//@*[starts-with(name(), ":")]` which returns all attributes with names starting with a
     colon.
  2. we loop over the matched attributes
  3. and create a function which evaluates the value as an expression in the context of the function itself: 
     `with (this) return ${attribute.value};`
  4. then replace the value of the attribute with the return value of the function evaluated in the context
     of the component class.
  5. remove the original attribute
  
Then we register the `compileAttributeExpressions` in the `compile` function of the `TemplateCompiler`:
```javascript
static compile(scope, template) {
	TemplateCompiler.compileContentExpressions(scope, template);
	TemplateCompiler.compileAttributeExpressions(scope, template);
}
```

## Event Listeners

Event listeners are also missing. The implementation of event listeners are similar to the to the eveluated attributes
we again take the the syntax from [vuejs](http://vuejs.org): An attrubute with a name starting with an `@` is 
interpreded as an event listener. The attribute name is the event name and the attribute value is evaluated as an 
expression every time the dom event is fired. The native event is available as `$event`:
```javascript
static compileEventListeners(scope, template) {
	for (let attribute of TemplateCompiler.evaluateXPaht(template, '//@*[starts-with(name(), "@")]')) {
		const callable = new Function('$event', `with (this) { ${attribute.value}; }`);
		attribute.ownerElement.addEventListener(attribute.name.substr(1), event => callable.call(scope, event));
		attribute.ownerElement.removeAttribute(attribute.name);
	}
}
```
The event listeners are registerd the following: 
  1. we evaluate the xPath `//@*[starts-with(name(), "@")]` which returns all attributes with names starting with a
     `@`.
  2. we loop over the matched attributes
  3. and create a function which evaluates the value as an expression in the context of the function itself:
     `with (this) { ${attribute.value}; }`. To allow several statements we use curly brackets around the attribute
     value.
  4. The created function is registred as a event listener on the ownerElement of the attribute.
  5. remove the original attribute
  
Then we register the `compileEventListeners` in the `compile` function of the `TemplateCompiler`:
```javascript
static compile(scope, template) {
	TemplateCompiler.compileContentExpressions(scope, template);
	TemplateCompiler.compileAttributeExpressions(scope, template);
	TemplateCompiler.compileEventListeners(scope, template);
}
```

### Conclusion

In this part we implemented a component a template compiler for text interpolation, evaluated attributes and event 
listenersé

*  [index.html](./index.html). 
*  [createComponent.js](./createComponent.js). 
*  [TemplateCompiler.js](./TemplateCompiler.js). 

In the [Next Part](../2-reactivity/index.md) we add reactivity to our interpolated and evaluated values. 



























