const JSXcreateElement = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-inner-declarations
  createElement<T extends HTMLElement>(tag: string, attrs?: object, ...children: any[]): HTMLElement {
    const element = document.createElement(tag) as T;
    attrs &&
      Object.keys(attrs).forEach((key: string) => {
        // @ts-ignore
        const value: string | null | boolean = attrs[key];
        if (value != null) {
          element.setAttribute(key.toLowerCase(), value.toString());
        }
        // todo attrs children can be here?
      });
    if (children) {
      children.forEach(child => {
        if (child) {
          element.appendChild(child.nodeType == null ? document.createTextNode(child.toString()) : child);
        }
      });
    }
    return element;
  }
};

export default JSXcreateElement;
