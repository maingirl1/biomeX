type Example = () => string;

function foo(example: () => number): number {
	return bar();
}

// returns the function itself, not the `this` argument.
type ReturnsSelf = (arg: string) => ReturnsSelf;

interface Foo {
	bar: string;
}

interface Bar extends Foo {
	(): void;
}

// multiple call signatures (overloads) is allowed:
interface Overloaded {
	(data: string): number;
	(id: number): string;
}

// this is equivelent to Overloaded interface.
type Intersection = ((data: string) => number) & ((id: number) => string);

interface ReturnsSelf {
	// returns the function itself, not the `this` argument.
	(arg: string): this;
}

// Simple shorthand function type with no arguments
type NoArgFunction = () => void;

// Function type with multiple arguments
type MultiArgFunction = (arg1: string, arg2: number) => boolean;

// Function type with rest parameters
type RestParamsFunction = (...args: number[]) => number;

// Nested function types
type NestedFunction = () => () => number;

// Function type with tuple types as parameters
type TupleFunction = ([a, b]: [string, number]) => boolean;

// Function type in a type union
type UnionFunction = (() => string) | (() => number);

// Using shorthand function type in a generic type
type GenericFunction<T> = (arg: T) => T;

// Function type with optional parameter
type OptionalParamFunction = (arg?: string) => void;
