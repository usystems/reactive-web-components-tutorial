'use strict';

/**
 * Compile a template by replaceing text nodes containing expressions like ${expr}, attributes starting with a colon
 * like :title="expr" and add event handlers for attributes starting with @ like @click="method()"
 */
export default class TemplateCompiler {

	/**
	 * Compile the template running the expressions using the scope
	 *
	 * @param {object} scope scope, the template is compiled in
	 * @param {template} template to compile against the scope
	 * @return {void}
	 */
	static compile(scope, template) {
		TemplateCompiler.compileContentExpressions(scope, template);
		TemplateCompiler.compileAttributeExpressions(scope, template);
		TemplateCompiler.compileEventListeners(scope, template);
	}
	static compileContentExpressions(scope, template) {
		const xPath = '//text()[contains(.,"${") and contains(substring-after(.,"${"),"}")]';
		for (let textNode of TemplateCompiler.evaluateXPaht(template, xPath)) {
			const compiledValue = new Function('', `with (this) return \`${textNode.nodeValue}\`;`);
			textNode.nodeValue = compiledValue.call(scope);
		}
	}
	static compileAttributeExpressions(scope, template) {
		for (let attribute of TemplateCompiler.evaluateXPaht(template, '//@*[starts-with(name(), ":")]')) {
			const compiledValue = new Function('', `with (this) return ${attribute.value};`);
			attribute.ownerElement.setAttribute(attribute.name.substr(1), compiledValue.call(scope));
			attribute.ownerElement.removeAttribute(attribute.name);
		}
	}
	static compileEventListeners(scope, template) {
		for (let attribute of TemplateCompiler.evaluateXPaht(template, '//@*[starts-with(name(), "@")]')) {
			const callable = new Function('$event', `with (this) { ${attribute.value}; }`);
			attribute.ownerElement.addEventListener(attribute.name.substr(1), event => callable.call(scope, event));
			attribute.ownerElement.removeAttribute(attribute.name);
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
