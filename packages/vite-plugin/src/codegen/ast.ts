// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { print } from "esrap";
import ts from "esrap/languages/ts";
import type {
    ArrayExpression,
    ArrowFunctionExpression,
    CallExpression,
    Comment,
    Declaration,
    ExportDefaultDeclaration,
    ExportNamedDeclaration,
    Expression,
    FunctionDeclaration,
    Identifier,
    ImportDeclaration,
    ImportExpression,
    Literal,
    MemberExpression,
    NewExpression,
    ObjectExpression,
    Program,
    Property,
    ReturnStatement,
    Statement,
    SwitchCase,
    SwitchStatement,
    TemplateLiteral,
    ThrowStatement,
    UnaryExpression,
    VariableDeclaration
} from "estree";

/**
 * Prints the given ESTree program as JavaScript source code.
 * `leadingComments` attached to nodes are emitted before the node.
 */
export function printProgram(body: Program["body"]): string {
    const program: Program = { type: "Program", sourceType: "module", body };
    const language = ts({
        quotes: "double",
        getLeadingComments: (node) => (node as Program).leadingComments
    });
    return print(program, language, { indent: "    " }).code;
}

/** Converts an arbitrary JSON value into an equivalent expression. */
export function jsonToExpression(json: unknown): Expression {
    if (json == null) {
        return literal(null);
    }
    if (typeof json === "string" || typeof json === "number" || typeof json === "boolean") {
        return literal(json);
    }
    if (Array.isArray(json)) {
        return array(json.map(jsonToExpression));
    }
    if (typeof json === "object") {
        return object(
            Object.entries(json).map(([key, value]) => property(key, jsonToExpression(value)))
        );
    }
    throw new Error(`Unexpected value while serializing JSON: ${json}.`);
}

export interface NodeOptions {
    /** A line comment that is emitted directly before the node. */
    comment?: string;
}

export function literal(value: string | number | boolean | null): Literal {
    // JSON.stringify produces a valid JavaScript literal with all necessary escapes
    return { type: "Literal", value, raw: JSON.stringify(value) };
}

/** `void 0` */
export function undefinedValue(): UnaryExpression {
    return { type: "UnaryExpression", operator: "void", prefix: true, argument: literal(0) };
}

export function identifier(name: string): Identifier {
    return { type: "Identifier", name };
}

/** Template literal, e.g. `` template`Hello ${identifier("name")}` `` */
export function template(
    strings: TemplateStringsArray,
    ...expressions: Expression[]
): TemplateLiteral {
    return {
        type: "TemplateLiteral",
        quasis: strings.raw.map((raw, index) => ({
            type: "TemplateElement",
            value: { raw, cooked: raw },
            tail: index === strings.raw.length - 1
        })),
        expressions
    };
}

export function array(elements: Expression[]): ArrayExpression {
    return { type: "ArrayExpression", elements };
}

export function object(properties: Property[]): ObjectExpression {
    return { type: "ObjectExpression", properties };
}

/** Creates an object property with a (quoted) string key. */
export function property(key: string, value: Expression, options?: NodeOptions): Property {
    return {
        type: "Property",
        key: literal(key),
        value,
        kind: "init",
        computed: false,
        shorthand: false,
        method: false,
        leadingComments: leadingComments(options)
    };
}

/** `object.name` */
export function member(object: Expression, name: string): MemberExpression {
    return {
        type: "MemberExpression",
        object,
        property: identifier(name),
        computed: false,
        optional: false
    };
}

/** `callee(...args)` */
export function call(callee: Expression, args: Expression[]): CallExpression {
    return { type: "CallExpression", callee, arguments: args, optional: false };
}

/** `new Callee(...args)` */
export function newExpression(callee: string, args: Expression[]): NewExpression {
    return { type: "NewExpression", callee: identifier(callee), arguments: args };
}

/** `import("moduleId")` */
export function dynamicImport(moduleId: string): ImportExpression {
    return { type: "ImportExpression", source: literal(moduleId) };
}

/** `(...params) => body` */
export function arrow(params: string[], body: Expression): ArrowFunctionExpression {
    return {
        type: "ArrowFunctionExpression",
        params: params.map(identifier),
        body,
        expression: true
    };
}

export function returnStatement(argument: Expression): ReturnStatement {
    return { type: "ReturnStatement", argument };
}

export function throwStatement(argument: Expression): ThrowStatement {
    return { type: "ThrowStatement", argument };
}

export function switchStatement(discriminant: Expression, cases: SwitchCase[]): SwitchStatement {
    return { type: "SwitchStatement", discriminant, cases };
}

export function switchCase(test: Expression, consequent: Statement[]): SwitchCase {
    return { type: "SwitchCase", test, consequent };
}

/** `const name = init;` */
export function constDeclaration(
    name: string,
    init: Expression,
    options?: NodeOptions
): VariableDeclaration {
    return {
        type: "VariableDeclaration",
        kind: "const",
        declarations: [{ type: "VariableDeclarator", id: identifier(name), init }],
        leadingComments: leadingComments(options)
    };
}

/** `function name(...params) { ...body }` */
export function functionDeclaration(
    name: string,
    params: string[],
    body: Statement[]
): FunctionDeclaration {
    return {
        type: "FunctionDeclaration",
        id: identifier(name),
        params: params.map(identifier),
        body: { type: "BlockStatement", body }
    };
}

/** `import { imported as local } from "moduleId";` */
export function importNamed(imported: string, local: string, moduleId: string): ImportDeclaration {
    return {
        type: "ImportDeclaration",
        specifiers: [
            { type: "ImportSpecifier", imported: identifier(imported), local: identifier(local) }
        ],
        source: literal(moduleId),
        attributes: []
    };
}

/** `export <declaration>` */
export function exportNamed(
    declaration: Declaration,
    options?: NodeOptions
): ExportNamedDeclaration {
    return {
        type: "ExportNamedDeclaration",
        declaration,
        specifiers: [],
        attributes: [],
        leadingComments: leadingComments(options)
    };
}

/** `export default <expression>;` */
export function exportDefault(
    declaration: Expression,
    options?: NodeOptions
): ExportDefaultDeclaration {
    return {
        type: "ExportDefaultDeclaration",
        declaration,
        leadingComments: leadingComments(options)
    };
}

function leadingComments(options: NodeOptions | undefined): Comment[] | undefined {
    if (options?.comment == null) {
        return undefined;
    }
    return [{ type: "Line", value: ` ${options.comment}` }];
}
