import { StartlangParserVisitor } from './StartlangParserVisitor';

const flowMarker = {
  repeat: 'loop',
  for: 'loop',
  forIn: 'loop',
  while: 'loop',
  call: 'call',
};

const inspectMarker = {
  repeat: 'loop',
  for: 'loop',
  forIn: 'loop',
  while: 'loop',
  if: 'stmt',
  begin: 'stmt',
  call: 'stmt',
  exit: 'stmt',
  break: 'stmt',
  next: 'stmt',
  return: 'stmt',
  literal: 'expr',
  var: 'expr',
  let: 'stmt',
  index: 'expr',
  letIndex: 'stmt',
  logicalOp: 'expr',
  binaryOp: 'expr',
  unaryOp: 'expr',
};

export class StartlangVisitor extends StartlangParserVisitor {
  // build an object for this node
  buildNode(type, attrs, options = {}) {
    // if we're a block with one statement, just return the statement itself
    if (type === 'block' && attrs.elems.length === 1) {
      return attrs.elems[0];
    }

    // show the type first
    const node = { type };

    // then the flow marker
    if (flowMarker[type]) {
      node.flow = flowMarker[type];
    }

    // then the inspect marker
    if (inspectMarker[type]) {
      node.inspect = inspectMarker[type];
    }

    // then the passed-in attributes
    Object.assign(node, attrs);

    // then the source metadata
    if (options.meta) {
      node.meta = {
        // text: text(),
        // location: location(),
      };
    }

    return node;
  }

  visitProg(ctx) {
    return ctx.block().accept(this);
  }

  visitBlock(ctx) {
    return this.buildNode('block', {
      elems: ctx.statement().map(stmt => stmt.accept(this)),
    });
  }

  visitStatement(ctx) {
    return ctx.children[0].accept(this);
  }

  visitIfStatement(ctx) {
    return this.buildNode('if', {
      cond: ctx.value().accept(this),
      tbody: ctx.statement(0).accept(this),
      fbody: ctx.statement(1) ? ctx.statement(1).accept(this) : null,
    });
  }

  visitIfBlock(ctx) {
    const values = ctx.value().map(val => val.accept(this));
    const bodies = ctx.ifBody().map(body => body.accept(this));
    return values.reduceRight(
      (acc, val, i) =>
        this.buildNode('if', {
          cond: val,
          tbody: bodies[i],
          fbody: acc || bodies[i + 1] || null,
        }),
      null
    );
  }

  visitIfBody(ctx) {
    return (ctx.statement() || ctx.block()).accept(this);
  }

  visitRepeatLoop(ctx) {
    return this.buildNode('repeat', {
      times: ctx.value() ? ctx.value().accept(this) : null,
      body: ctx.loopBody().accept(this),
    });
  }

  visitForLoop(ctx) {
    return this.buildNode('for', {
      name: ctx.SYMBOL().getText(),
      from: ctx.value(0).accept(this),
      to: ctx.value(1).accept(this),
      by: ctx.value(2) ? ctx.value(2).accept(this) : null,
      body: ctx.loopBody().accept(this),
    });
  }

  visitForInLoop(ctx) {
    return this.buildNode('forIn', {
      name: ctx.SYMBOL().getText(),
      range: ctx.value(0).accept(this),
      body: ctx.loopBody().accept(this),
    });
  }

  visitWhileLoop(ctx) {
    return this.buildNode('while', {
      cond: ctx.value().getText(),
      body: ctx.loopBody().accept(this),
    });
  }

  visitBeginBlock(ctx) {
    return this.buildNode('begin', {
      name: ctx.SYMBOL().getText(),
      params: ctx.params() ? ctx.params().accept(this) : null,
      body: ctx.loopBody().accept(this),
    });
  }

  visitLoopBody(ctx) {
    return (ctx.statement() || ctx.block()).accept(this);
  }

  visitParams(ctx) {
    return ctx.SYMBOL().map(name => name.getText());
  }

  visitAssignment(ctx) {
    if (ctx.indexes()) {
      return this.buildNode('letIndex', {
        name: ctx.SYMBOL().getText(),
        indexes: ctx.indexes().accept(this),
        value: ctx.value().accept(this),
      });
    } else {
      return this.buildNode('let', {
        name: ctx.SYMBOL().getText(),
        value: ctx.value().accept(this),
      });
    }
  }

  visitLocalAssignment(ctx) {
    return this.buildNode('let', {
      name: ctx.SYMBOL().getText(),
      value: ctx.value()
        ? ctx.value().accept(this)
        : this.buildNode('literal', {
            value: undefined,
          }),
      top: true,
    });
  }

  visitFunctionCall(ctx) {
    return this.buildNode('call', {
      name: ctx.SYMBOL().getText(),
      args: ctx.values() ? ctx.values().accept(this) : null,
    });
  }

  visitValues(ctx) {
    return ctx.value().map(val => val.accept(this));
  }

  visitNestValue(ctx) {
    return ctx.value().accept(this);
  }

  visitVarValue(ctx) {
    if (ctx.indexes()) {
      return this.buildNode('index', {
        name: ctx.SYMBOL().getText(),
        indexes: ctx.indexes().accept(this),
      });
    } else {
      return this.buildNode('var', {
        name: ctx.SYMBOL().getText(),
      });
    }
  }

  visitCallValue(ctx) {
    return this.buildNode('call', {
      name: ctx.SYMBOL().getText(),
      args: ctx.values() ? ctx.values().accept(this) : null,
    });
  }

  visitUnaryOpValue(ctx) {
    return this.buildNode('unaryOp', {
      op: ctx.op.text,
      right: ctx.value().accept(this),
    });
  }

  visitBinaryOpValue(ctx) {
    return this.buildNode('binaryOp', {
      op: ctx.op.text,
      left: ctx.value(0).accept(this),
      right: ctx.value(1).accept(this),
    });
  }

  visitStringValue(ctx) {
    return ctx.string().accept(this);
  }

  visitLiteralValue(ctx) {
    return ctx.literal().accept(this);
  }

  visitIndexes(ctx) {
    return Array.prototype.concat(
      ...ctx.indexSegment().map(segment => segment.accept(this))
    );
  }

  visitIndexSegment(ctx) {
    if (ctx.SYMBOL()) {
      return this.buildNode('literal', {
        value: ctx.SYMBOL().getText(),
      });
    } else {
      return ctx.value().map(val => val.accept(this));
    }
  }

  visitString(ctx) {
    const parts = ctx.stringSegment().map(segment => segment.accept(this));
    if (
      parts.length === 0 ||
      parts[0].type !== 'literal' ||
      typeof parts[0].value !== 'string'
    ) {
      parts.unshift(
        this.buildNode('literal', {
          value: '',
        })
      );
    }
    return parts.reduce((acc, part) =>
      this.buildNode('binaryOp', {
        op: '$',
        left: acc,
        right: part,
      })
    );
  }

  visitStringSegment(ctx) {
    if (ctx.value()) {
      return ctx.value().accept(this);
    } else {
      return this.buildNode('literal', {
        value: ctx
          .CHAR()
          .map(char => {
            const ch = char.getText();
            return ch === '""' ? '"' : ch === '``' ? '`' : ch;
          })
          .join(''),
      });
    }
  }

  visitLiteral(ctx) {
    const text = ctx.getText();
    if (ctx.NUMBER()) {
      return this.buildNode('literal', {
        value: Number(text),
      });
    } else if (text === 'none') {
      return this.buildNode('literal', {
        value: null,
      });
    } else if (text === 'true') {
      return this.buildNode('literal', {
        value: true,
      });
    } else if (text === 'false') {
      return this.buildNode('literal', {
        value: false,
      });
    } else if (text === 'infinity') {
      return this.buildNode('literal', {
        value: Infinity,
      });
    }
  }
}
