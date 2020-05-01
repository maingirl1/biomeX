/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Mapping} from '@romejs/codec-source-map';
import {
  Number0,
  Number1,
  ob1Get0,
  ob1Inc,
  ob1Number0,
  ob1Number1,
} from '@romejs/ob1';
import {Token} from './tokens';

export type PrinterOptions = {
  indentWidth: number;
  printWidth: number;
  rootIndent: number;
};

export type PrinterOutput = {
  code: string;
  mappings: Array<Mapping>;
};

type State = {
  flat: boolean;
  indent: Box<number>;
  pendingSpaces: Box<number>;
  generatedIndex: Box<Number0>;
  generatedLine: Box<Number1>;
  generatedColumn: Box<Number0>;
  buffer: Array<string>;
  mappings: Array<Mapping>;
  lineSuffixes: Array<[Token, State]>;
};

class BreakError extends Error {
  constructor() {
    super(
      "This error represents a point in the formatter where we should line break. If you're seeing this something went wrong.",
    );
  }
}

class Box<T> {
  constructor(value: T) {
    this.value = value;
  }

  value: T;
}

function forkState(parent: State, callback: (state: State) => void): void {
  const bufferLength = parent.buffer.length;
  const mappingsLength = parent.mappings.length;

  const state: State = {
    ...parent,
    generatedIndex: new Box(parent.generatedIndex.value),
    generatedLine: new Box(parent.generatedLine.value),
    generatedColumn: new Box(parent.generatedColumn.value),
    pendingSpaces: new Box(parent.pendingSpaces.value),
  };

  try {
    callback(state);
  } catch (err) {
    // Discard dirty outputs
    if (parent.buffer.length !== bufferLength) {
      parent.buffer.length = bufferLength;
    }

    // Discard dirty mappings
    if (parent.mappings.length !== mappingsLength) {
      parent.mappings.length = mappingsLength;
    }

    throw err;
  }

  // Merge the states together
  parent.generatedIndex.value = state.generatedIndex.value;
  parent.generatedLine.value = state.generatedLine.value;
  parent.generatedColumn.value = state.generatedColumn.value;
  parent.pendingSpaces.value = state.pendingSpaces.value;
}

function write(str: string, state: State): void {
  for (const ch of str) {
    state.generatedIndex.value = ob1Inc(state.generatedIndex.value);
    if (ch === '\n') {
      state.generatedLine.value = ob1Inc(state.generatedLine.value);
      state.generatedColumn.value = ob1Number0;
    } else {
      state.generatedColumn.value = ob1Inc(state.generatedColumn.value);
    }
  }
  state.buffer.push(str);
}

function print(token: Token, state: State, options: PrinterOptions): void {
  const stack: Array<[Token, State]> = [[token, state]];

  while (stack.length > 0) {
    const [token, state] = stack.pop()!;

    if (typeof token === 'string') {
      if (token !== '') {
        // Print pending spaces
        if (state.pendingSpaces.value > 0) {
          write(' '.repeat(state.pendingSpaces.value), state);
          state.pendingSpaces.value = 0;
        }

        write(token, state);

        // If the line is too long, break the group if it is possible
        if (
          state.flat &&
          ob1Get0(state.generatedColumn.value) > options.printWidth
        ) {
          throw new BreakError();
        }
      }
    } else {
      switch (token.type) {
        case 'Comment': {
          stack.push([token.value, state]);
          break;
        }

        case 'Concat': {
          for (let i = token.parts.length - 1; i >= 0; i--) {
            stack.push([token.parts[i], state]);
          }
          break;
        }

        case 'Group': {
          if (token.shouldBreak) {
            if (state.flat) {
              throw new BreakError();
            } else {
              stack.push([token.contents, state]);
              break;
            }
          }

          if (state.flat) {
            stack.push([token.contents, state]);
          } else {
            try {
              forkState(
                state,
                (next) => {
                  // Try to print the group contents on a single line.
                  // If it fails, break the group.
                  next.flat = true;
                  print(token.contents, next, options);
                },
              );
            } catch (err) {
              if (err instanceof BreakError) {
                stack.push([token.contents, state]);
              } else {
                // This should not happen!
                // Let the error propagate.
                throw err;
              }
            }
          }
          break;
        }

        case 'IfBreak': {
          if (state.flat) {
            if (token.flatContents) {
              stack.push([token.flatContents, state]);
            }
          } else {
            stack.push([token.breakContents, state]);
          }
          break;
        }

        case 'Indent': {
          stack.push([
            token.contents,
            {
              ...state,
              indent: new Box(state.indent.value + options.indentWidth),
            },
          ]);
          break;
        }

        case 'Line': {
          if (state.flat) {
            switch (token.mode) {
              case 'space': {
                state.pendingSpaces.value++;
                break;
              }

              case 'soft':
                // Soft lines are not printed in flat mode.
                break;

              case 'hard':
                // Hard lines are always printed.
                // In flat mode, the current group be broken.
                throw new BreakError();
            }
          } else {
            if (state.lineSuffixes.length > 0) {
              stack.push([token, state]);
              while (state.lineSuffixes.length > 0) {
                stack.push(state.lineSuffixes.pop()!);
              }
            } else {
              write('\n', state);

              // Enqueue the indentation
              state.pendingSpaces.value = state.indent.value;
            }
          }
          break;
        }

        case 'LineSuffix': {
          if (state.flat) {
            throw new BreakError();
          } else {
            state.lineSuffixes.push([token.contents, state]);
          }
          break;
        }

        case 'PositionMarker': {
          if (
            state.mappings.length > 0 &&
            state.mappings[state.mappings.length - 1].generated.index ===
            state.generatedIndex.value
          ) {
            break;
          }

          state.mappings.push({
            generated: {
              line: state.generatedLine.value,
              column: state.generatedColumn.value,
              index: state.generatedIndex.value,
            },
            original: {
              line: token.loc[token.prop].line,
              column: token.loc[token.prop].column,
            },
            name: token.loc.identifierName,
            source: token.loc.filename,
          });
          break;
        }

        case 'Space': {
          state.pendingSpaces.value++;
          break;
        }
      }
    }
  }
}

export function printTokenToString(
  token: Token,
  options: PrinterOptions,
): PrinterOutput {
  const state: State = {
    flat: false,
    indent: new Box(options.rootIndent * options.indentWidth),
    pendingSpaces: new Box(0),
    generatedIndex: new Box(ob1Number0),
    generatedLine: new Box(ob1Number1),
    generatedColumn: new Box(ob1Number0),
    buffer: [],
    mappings: [],
    lineSuffixes: [],
  };

  print(token, state, options);

  return {
    code: state.buffer.join(''),
    mappings: state.mappings,
  };
}
