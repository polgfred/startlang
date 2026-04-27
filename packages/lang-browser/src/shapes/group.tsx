import { produce } from 'immer';

import { Shape, ShapeElement, ShapeProps } from './base.jsx';

export class ShapeGroup extends Shape {
  readonly children: readonly Shape[] = Object.freeze([]);

  addChild(child: Shape) {
    return produce(this, (draft) => {
      draft.children.push(child);
    });
  }

  getSVGElement() {
    return (
      <g {...this.getSVGProps({ useAnchor: false })}>
        {this.children.map((child, i) => (
          <ShapeElement key={i} shape={child} />
        ))}
      </g>
    );
  }
}

class RootShapeGroup extends ShapeGroup {
  constructor() {
    super(Object.freeze({}) as ShapeProps);
  }

  getSVGElement() {
    return <></>;
  }
}

export const rootShapeGroup = new RootShapeGroup();
