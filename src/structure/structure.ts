/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

export type Structure = Token;

export interface Object {
    /**
     * name
     */
    n: string;
    /**
     * properties
     */
    p: Record<string,Property>;
}

export interface Property {
    /**
     * definition
     */
    d: Token;
    /**
     * optional
     */
    o?: boolean
}

export const enum TokenType {
    ValueType,
    Literal,
    Object,
    Array,
    Union,
    Intersection,
    Tuple,
    Enum
}

export const enum ValueType {
    String,
    Number,
    Null,
    Boolean,
    Undefined,
    Any,
    Function,
    Object
}

export type Token = ValueToken | LiteralToken | ObjectToken |
    ArrayToken | UnionToken | IntersectionToken | TupleToken | EnumToken;

interface AbstractToken<T,V> {
    /**
     * Type
     */
    t: T
    /**
     * Value
     */
    v: V
}

export interface ValueToken extends AbstractToken<TokenType.ValueType,ValueType> {}
export interface LiteralToken extends AbstractToken<TokenType.Literal,any> {}
export interface ObjectToken extends AbstractToken<TokenType.Object,Object> {}
export interface ArrayToken extends AbstractToken<TokenType.Array,Token> {}
export interface UnionToken extends AbstractToken<TokenType.Union,Token[]> {}
export interface IntersectionToken extends AbstractToken<TokenType.Intersection,Token[]> {}
export interface TupleToken extends AbstractToken<TokenType.Tuple,Token[]> {}
export interface EnumToken extends AbstractToken<TokenType.Enum,any[]> {
    /**
     * Name
     */
    n: string
}