'use strict';

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
