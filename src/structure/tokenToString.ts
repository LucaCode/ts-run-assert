/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import {Object, Token, TokenType, ValueType} from "./structure";

export function tokenToString(token: Token): string {
    switch (token.t) {
        case TokenType.ValueType:
            switch (token.v) {
                case ValueType.Function:
                    return 'Function';
                case ValueType.Boolean:
                    return 'boolean';
                case ValueType.Any:
                    return 'any';
                case ValueType.Null:
                    return 'null';
                case ValueType.Number:
                    return 'number';
                case ValueType.Object:
                    return 'object';
                case ValueType.String:
                    return 'string';
                case ValueType.Undefined:
                    return 'undefined';
            }
            return '';
        case TokenType.Object:
            return (token.v as Object).n;
        case TokenType.Array:
            return `${tokenToString(token.v)}[]`;
        case TokenType.Literal:
            const v = token.v;
            if(typeof token.v === "string"){
                return `'${v}'`;
            }
            else {
                return v;
            }
        case TokenType.Union:
            return `(${token.v.map((v) => tokenToString(v)).join(' | ')})`;
        case TokenType.Intersection:
            return `(${token.v.map((v) => tokenToString(v)).join(' & ')})`;
        case TokenType.Tuple:
            return `[${token.v.map((v) => tokenToString(v)).join(',')}]`;
        case TokenType.Enum:
            return `Enum: ${token.n}(${token.v.join(',')})`;
    }
}