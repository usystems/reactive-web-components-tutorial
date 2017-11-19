'use strict';

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
