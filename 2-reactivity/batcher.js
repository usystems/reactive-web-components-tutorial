'use strict';

class Batcher {
	constructor() {
		// use set, to avoid double notify
		this.queue = new Set();

		// use MutationObserver instead of postMessage, since MutationObserver callbacks are hanled as microtasks and
		// postMessage as event. Though MutationObserver are evaluated earlyer than postMessage
		// https://stackoverflow.com/questions/14564617/when-are-mutationobserver-callbacks-fired
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
