/**
 * JSX runtime for node-zpl. TypeScript and bundlers load this module when a
 * project sets `"jsx": "react-jsx"` and `"jsxImportSource": "node-zpl"`.
 *
 * Elements are lazy: they record what to draw and are applied to a Label
 * builder by build(). This lets the same element be reused in labels with
 * different resolutions, since millimeters are converted to dots only once
 * the element ends up in a label.
 */
import ZplError from "./ZplError.js";
import type Label from "./Label.js";

const ELEMENT = Symbol.for("node-zpl.element");

type ZplElement = {
  readonly [ELEMENT]: true;
  /** Draw the element on a label */
  readonly apply: (label: Label) => void;
};

/** Anything that can appear as a child of <Label> */
type ZplNode = ZplElement | ZplNode[] | boolean | null | undefined;

const isElement = (value: unknown): value is ZplElement =>
  typeof value === "object" && value !== null && ELEMENT in value;

const element = (apply: (label: Label) => void): ZplElement => ({
  [ELEMENT]: true,
  apply,
});

/**
 * Apply children in order, skipping false, null and undefined so that
 * `{condition && <Text>…</Text>}` works
 */
const applyChildren = (label: Label, children: unknown): void => {
  if (Array.isArray(children)) {
    for (const child of children) applyChildren(label, child);
  } else if (isElement(children)) {
    children.apply(label);
  } else if (
    children !== undefined &&
    children !== null &&
    typeof children !== "boolean"
  ) {
    throw new ZplError(
      `Unexpected child ${JSON.stringify(
        children
      )}: text has to be wrapped in <Text>`
    );
  }
};

const Fragment = (props: { children?: ZplNode }): ZplElement =>
  element((label) => applyChildren(label, props.children));

type Component<P> = (props: P) => ZplElement;

const jsx = <P>(type: Component<P>, props: P): ZplElement => type(props);

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace JSX {
  type Element = ZplElement;
  // Only function components are supported, there are no built-in tags
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface IntrinsicElements {}
  // Accepted on every element so lists can be written as in React; unused
  interface IntrinsicAttributes {
    key?: string | number;
  }
  interface ElementChildrenAttribute {
    // eslint-disable-next-line @typescript-eslint/ban-types
    children: {};
  }
}

export type { ZplElement, ZplNode, JSX };
export { jsx, jsx as jsxs, Fragment, element, isElement, applyChildren };
