// jsdom lacks these browser APIs. The app only needs harmless stubs.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = window.matchMedia || ((q) => ({
  matches: /reduce/.test(q), // the sweep animation runs fast under "reduce"
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
}));
window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function () {};
