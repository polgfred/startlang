import { produce } from 'immer';

import type { TextProps } from '../shapes/text.jsx';

import { Cell } from './base.jsx';
import styles from './cells.module.css';

const variantMap = Object.freeze({
  h1: styles.h1,
  h2: styles.h2,
  h3: styles.h3,
  h4: styles.h4,
  h5: styles.h5,
  h6: styles.h6,
  body1: styles.body1,
  body2: styles.body2,
});

type VariantType = keyof typeof variantMap;

export interface ValueProps {
  variant: VariantType;
}

export const initialValueProps: ValueProps = Object.freeze({
  variant: 'body1',
});

export const initialValueTextProps: TextProps = Object.freeze({
  ['font.name']: null,
  ['font.size']: null,
  ['font.weight']: null,
});

export class ValueCell extends Cell {
  constructor(
    readonly value: string,
    readonly valueProps: ValueProps = initialValueProps,
    readonly textProps: TextProps = initialValueTextProps
  ) {
    super();
  }

  get variant() {
    return this.valueProps.variant;
  }

  static mergeProps(props: ValueProps, overrides: Record<string, unknown>) {
    return produce(props, (draft) => {
      for (const [name, value] of Object.entries(overrides)) {
        ValueCell.assignProp(draft, name, value);
      }
    });
  }

  private static assignProp(props: ValueProps, name: string, value: unknown) {
    switch (name) {
      case 'variant': {
        if (!(typeof value === 'string' && value in variantMap)) {
          throw new Error(`invalid variant: ${value}`);
        }
        props.variant = value as VariantType;
        break;
      }
      default: {
        throw new Error(`invalid prop: ${name}`);
      }
    }
  }

  getHTMLElement() {
    return (
      <p
        className={`${styles.text} ${variantMap[this.valueProps.variant]}`}
        style={{
          fontFamily: this.textProps['font.name'] ?? undefined,
          fontSize: this.textProps['font.size'] ?? undefined,
          fontWeight: this.textProps['font.weight'] ?? undefined,
        }}
      >
        {this.value}
      </p>
    );
  }
}
