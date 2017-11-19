'use strict';

import ComponentProxyHandler from './ComponentProxyHandler.js'
import TemplateCompiler from './TemplateCompiler.js';

/**
 * Create a custom tag with shadow dom with the passed tagName
 *
 * @param {string} tagName name of the tag to register
 * @param {string} templateSelector query selector for the template element
 * @param {class} componentFactory function get a component class
 * @return {void}
 */
export default function createComponent(tagName, templateSelector, componentFactory) {

	let proxyHandler = new ComponentProxyHandler();
	let Base = class {
		constructor() {
			return new Proxy(this, proxyHandler);
		}
	};

	let ComponentClass = componentFactory(Base);

	// create a class for the custom element
	const ComponentElement = class extends HTMLElement {
		constructor() {

			// initalize the HTMLElement base class
			super();

			// create an instance of the component class
			const component = new ComponentClass();

			// query the template element from the selector
			const template = document.querySelector(templateSelector);

			// stamp the template content in the current document
			const stampedTemplate = document.importNode(template.content, true);

			// compile the template
			TemplateCompiler.compile(component, stampedTemplate);

			// create a shadow dom root for the component
			const shadowRoot = this.attachShadow({ mode: 'open' });

			// append the imported template into the shadow dom root
			shadowRoot.appendChild(stampedTemplate);
		}
	};

	// register the custom element
	customElements.define(tagName, ComponentElement);
}
