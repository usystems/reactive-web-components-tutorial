# Reactivity

In the last parts we created a tiny framework to create web component with text interpolation, evaluated attributes and
event handlers. In this part we are going to implement reactive text interpolation and attributes.

## How does reactivity works

A reactive expression  - a text interpolation or a reactive attribute - is an expression which is updated if some value 
is updated, which is needet to evaluate the expression. On a high level reactivity works the following

  1. For each text interpolation and each reactive attribute an expression object is created.
  2. During the evaluation of this Expresson, every property access is registred in a list called `dependsOn`. For each
     property access its registred, wich expresson has called the property in a list called `calledBy`.
  3. If a property is updated, for each expression in the `calledBy` we check if the property is still listed in the
     `dependsOn` list. If so, the expression is pushed into the batch queue.
  4. Immediatly after the script has finisched and before the next rendering, each expressin in the update queue 
     is evaluated.
  5. if the evaluated expression pushes again some expressions into the batch queue, they will also be evaluated before
     the next rendering.
     
## The Reactive Expressions

A reactive expression consists of three parts:

### Create an Expression 

An expression needs 
  * a scope in which it's evaluated
  * a callable, the compiled expression from the `TemplateCompiler`
  * an observer which is called, if the expression is updated.

```javascript
export default class Expression {
	constructor(scope, callable, observer) {
		this.observer = observer;
		this.scope = scope;
		this.callable = callable;
		this.update();
	}
	// [...]
}
```
After initalizing the passed values, we call the update function to initally set the expression the first time.

### Calculate the expression value

To track, which expression is currently active we have a static method `Expression.active()`. This is needed to track
which expression access the object properties.

Since es6 classes do not allow to define static properties, we use a local variable in the module to hold the currently
active expresison.

```javascript
let activeExpression = null;
export default class Expression {
	static active() {
		return activeExpression;
	}
	// [...]
}
```

To get the value of the expression we 
  * first initalize the dependsOn list. We use a es6 `Set` to make sure every property only get registred once.
  * The we set the active active expression to this
  * evaluate the interpolated expression in the component scope.
  * reset the activeExpression
  * return the interpolated value. 

```javascript
export default class Expression {
	get() {
		this.dependsOn = new Set();
		activeExpression = this;
		let value = this.callable.call(this.scope);
		activeExpression = null;
        return value;
	}
	// [...]
}
```

### The whole Expression Class

The whole expression class looks the following:

```javascript
let activeExpression = null;
export default class Expression {
	constructor(scope, callable, observer) {
		this.observer = observer;
		this.scope = scope;
		this.callable = callable;
		this.update();
	}
	get() {
		this.dependsOn = new Set();
		activeExpression = this;
		let value = this.callable.call(this.scope);
		activeExpression = null;
        return value;
	}
	update() {
		let value = this.get();
		this.observer(value);
	}
	static active() {
		return activeExpression;
	}
}
```

## Create Expression During Template Compilation

In the `TemplateCompiler` we need to chante the `compileContentExpressions` and the `compileAttributeExpressions`
method:

### Make Interpolated Text Nodes Reactive

In the previous part we evaluated the compiled value and assigned it to the texnode value:

```javascript
static compileContentExpressions(scope, template) {
	const xPath = '//text()[contains(.,"${") and contains(substring-after(.,"${"),"}")]';
	for (let textNode of TemplateCompiler.evaluateXPaht(template, xPath)) {
		const compiledValue = new Function('', `with (this) return \`${textNode.nodeValue}\`;`);
		textNode.nodeValue = compiledValue.call(scope);
	}
}
```

Instead of assining the value to the node value, we create an expression. As observer we create a function which
assigns the value to the text node value.

```javascript
static compileContentExpressions(scope, template) {
	const xPath = '//text()[contains(.,"${") and contains(substring-after(.,"${"),"}")]';
	for (let textNode of TemplateCompiler.evaluateXPaht(template, xPath)) {
		const callable = new Function('', `with (this) return \`${textNode.nodeValue}\`;`);
		const observer = value => {
			textNode.nodeValue = value;
		};
		new Expression(scope, callable, observer);
	}
}
```

### Make Evaluated Attributes Reactive

For the `compileAttributeExpressions` method we need to cache the `ownerElement`, since we remove the original attribute 
after we created an expression. This leads to the new `compileAttributeExpressions` method:

```javascript
static compileAttributeExpressions(scope, template) {
	for (let attribute of TemplateCompiler.evaluateXPaht(template, '//@*[starts-with(name(), ":")]')) {
		const callable = new Function('', `with (this) return ${attribute.value};`);
		const name = attribute.name.substr(1);
		const element = attribute.ownerElement;
		const observer = value => {
			element.setAttribute(name, value);
		};
		new Expression(scope, callable, observer);
		element.removeAttribute(attribute.name);
	}
}
```

Also check the whole [TemplateCompiler.js](./TemplateCompiler.js). 

## Tracking Object Changes

TODO!

```javascript
import Expression from './Expression.js';
import batcher from './batcher.js'
import uuid from './uuid.js'

export default class ComponentProxyHandler {
	constructor() {
		this.calledBy = new Map();
	}
	has(target, key) {
		return Reflect.has(target, key);
	}
	get(target, key, receiver) {
		if (Expression.active() instanceof Expression && typeof key === 'string') {
			if (this.calledBy.has(key)) {
				this.calledBy.get(key).add(Expression.active());
			} else {
				this.calledBy.set(key, new Set([Expression.active()]));
			}
			Expression.active().dependsOn.add(`${uuid(this)}.${key}`);
		}
		return Reflect.get(target, key, receiver);
	}
	set(target, key, value, receiver) {
		this.update(key);
		return Reflect.set(target, key, value, receiver);
	}
	deleteProperty(target, key) {
		this.update(key);
		return Reflect.deleteProperty(target, key);

	}
	apply(target, self, args) {
		return Reflect.apply(target, self, args);
	}
	update(key) {
		if (this.calledBy.has(key)) {
			this.calledBy.get(key).forEach(expression => {
				if (expression.dependsOn.has(`${uuid(this)}.${key}`)) {
					batcher.notify(expression);
				}
			});
		}
	}
}
```


## The Batch Queue

The `Batcher` is our implementation of the batch queue. It consists of three parts:

### A Method to Push Expressions to the Queue

The `Bacher` has a queue in which we can push expressions. The queue is implemented as a `Set`, to make sure every
expression is updated only once

```javascript
class Batcher {
	constructor() {
		this.queue = new Set();
		// [...]
	}
	notify(expression) {
		// [...]
		this.queue.add(expression);
	}
	// [...]
}
```
### A Flush Method 

A method to flush the expression queue. For this we loop over the queue and first remove the expression from the queue
and update it. If during the expresison update more expressions are pushed to the queue we call the `flush` method 
again.

```javascript
class Batcher {
	flush() {
		for (let expression of this.queue) {
			this.queue.delete(expression);
			expression.update();
		}
		if (this.queue.size) {
			this.flush();
		}
	}
	// [...]
}
```

### A Mechanism to Call the Flush Function

To call a function after the current execution has finished, especcially before the next rendering, we have several
options. we can use `postMessage` or a `MutationObserver`. The `MutationObserver` has the advantage, that its hanled as
microtasks and `postMessage` as event. Though `MutationObserver` are evaluated earlier than `postMessage`.

This is implemented by creating a text node and a `MutationObserver` on the text node, which calls the flush function
if the text node is changed.

If an expression is added to the queue and the queue is empty, aka not initalized, we flip the value of the text node
to trigger the `MutationObserver`.

```javascript
class Batcher {
	constructor() {
		this.queue = new Set();
		this.counter = 1;
		this.counterNode = document.createTextNode(String(this.counter));
		let observer = new MutationObserver(() => this.flush());
		observer.observe(this.counterNode, { characterData: true });
	}
	notify(expression) {
		if (!this.queue.size) {
			this.counter = (this.counter + 1) % 2;
			this.counterNode.nodeValue = String(this.counter);
		}
		this.queue.add(expression);
	}
	// [...]
}
```

### The whole Batcher Module

The batch queue is a singletone. To achive this, we export a single instance of the `Bacher`:

```javascript
class Batcher {
	constructor() {
		this.queue = new Set();
		this.counter = 1;
		this.counterNode = document.createTextNode(String(this.counter));
		let observer = new MutationObserver(() => this.flush());
		observer.observe(this.counterNode, { characterData: true });
	}
	notify(expression) {
		if (!this.queue.size) {
			this.counter = (this.counter + 1) % 2;
			this.counterNode.nodeValue = String(this.counter);
		}
		this.queue.add(expression);
	}
	flush() {
		for (let expression of this.queue) {
			this.queue.delete(expression);
			expression.update();
		}
		if (this.queue.size) {
			this.flush();
		}
	}
}
export default new Batcher();
```

### Conclusion

In this part we implemented reactivity. There are many optimizations which can be done on the code, but in principle
this is how the reactivity of [vuejs](http://vuejs.org) conceptually.

*  [index.html](./index.html). 
*  [Expression.js](./Expression.js). 
*  [TemplateCompiler.js](./TemplateCompiler.js). 
*  [uuid.js](./uuid.js). 
*  [ComponentProxyHandler.js](./ComponentProxyHandler.js). 
*  [batcher.js](./batcher.js).
*  [createComponent.js](./createComponent.js). 

There are som more topics to cover in future parts like parameters, loop directives for templates, watcher, browser
evaluated single page files 





