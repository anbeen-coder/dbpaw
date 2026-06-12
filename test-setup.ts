import { Window } from "happy-dom";

const w = new Window();

function defineGlobal(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, {
    value,
    writable: true,
    configurable: true,
  });
}

defineGlobal("window", w);
defineGlobal("document", w.document);
defineGlobal("navigator", w.navigator);
defineGlobal("HTMLElement", w.HTMLElement);
defineGlobal("SVGElement", w.SVGElement);
defineGlobal("Node", w.Node);
defineGlobal("Text", w.Text);
defineGlobal("Comment", w.Comment);
defineGlobal("DocumentFragment", w.DocumentFragment);
defineGlobal("Element", w.Element);
defineGlobal("Event", w.Event);
defineGlobal("CustomEvent", w.CustomEvent);
defineGlobal("MutationObserver", w.MutationObserver);
defineGlobal("requestAnimationFrame", w.requestAnimationFrame);
defineGlobal("cancelAnimationFrame", w.cancelAnimationFrame);
