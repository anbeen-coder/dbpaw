import { Window } from "happy-dom";

const window = new Window();
globalThis.window = window as any;
globalThis.document = window.document;
globalThis.navigator = window.navigator;
globalThis.HTMLElement = window.HTMLElement;
globalThis.SVGElement = window.SVGElement;
globalThis.Node = window.Node;
globalThis.Text = window.Text;
globalThis.Comment = window.Comment;
globalThis.DocumentFragment = window.DocumentFragment;
globalThis.Element = window.Element;
globalThis.Event = window.Event;
globalThis.CustomEvent = window.CustomEvent;
globalThis.MutationObserver = window.MutationObserver;
globalThis.requestAnimationFrame = window.requestAnimationFrame;
globalThis.cancelAnimationFrame = window.cancelAnimationFrame;
