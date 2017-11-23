'use strict';

/**
 * Create a custom tag with shadow dom with the passed tagName
 *
 * @param {string} tagName name of the tag to register
 * @param {string} templateSelector query selector for the template element
 * @return {void}
 */
export default function createComponent(tagName, templateSelector) {

	// create a class for the custom element
	const ComponentElement = class extends HTMLElement {
		constructor() {

			// initalize the HTMLElement base class
			super();

			// query the template element from the selector
			const template = document.querySelector(templateSelector);

			// stamp the template content in the current document
			const stampedTemplate = document.importNode(template.content, true);

			// create a shadow dom root for the component
			const shadowRoot = this.attachShadow({ mode: 'open' });

			// append the imported template into the shadow dom root
			shadowRoot.appendChild(stampedTemplate);
		}
	};

	// register the custom element
	customElements.define(tagName, ComponentElement);
}
