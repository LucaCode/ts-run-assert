/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import {
    ArrayToken, EnumToken,
    IntersectionToken,
    LiteralToken,
    Object,
    ObjectToken,
    Property,
    Structure,
    Token,
    TokenType,
    TupleToken,
    UnionToken,
    ValueToken,
    ValueType
} from "../structure/structure";
import {tokenToString} from "../structure/tokenToString";
import ValidationError from "./validationError";
import {ValidationErrorType} from "./validationErrorType";

export type Validator = (value: any) => ValidationError[];

export function createValidator(structure: Structure): Validator {
    const tokenValidator = createTokenValidator(structure);
    return (value) => {
        const errors: ValidationError[] = [];
        tokenValidator(value,['Base'],errors);
        return errors;
    };
}

type InternalValidator = (value: any,path: string[],errors: ValidationError[]) => void;

function createTokenValidator(token: Token): InternalValidator {
    switch (token.t) {
        case TokenType.ValueType:
             return createValueTypeValidator(token);
        case TokenType.Object:
             return createObjectValidator(token);
        case TokenType.Array:
             return createArrayValidator(token);
        case TokenType.Literal:
             return createLiteralValidator(token);
        case TokenType.Union:
             return createUnionValidator(token);
        case TokenType.Intersection:
            return createIntersectionValidator(token);
        case TokenType.Tuple:
            return createTupleValidator(token);
        case TokenType.Enum:
            return createEnumValidator(token);
        default:
            throw new Error(`Unknown token: ${token}`);
    }
}

function createValueTypeValidator(token: ValueToken): InternalValidator {
    switch (token.v) {
        case ValueType.String:
            return (value, path,errors) =>
                typeof value !== 'string' ? errors.push(new ValidationError(
                    `${path.join('.')} is not a string.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined;
        case ValueType.Number:
            return (value, path,errors) =>
                typeof value !== 'number' ? errors.push(new ValidationError(
                    `${path.join('.')} is not a number.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined;
        case ValueType.Boolean:
            return (value, path,errors) =>
                typeof value !== 'boolean' ? errors.push(new ValidationError(
                    `${path.join('.')} is not a boolean.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined;
        case ValueType.Function:
            return (value, path,errors) =>
                typeof value !== 'function' ? errors.push(new ValidationError(
                    `${path.join('.')} is not a function.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined;
        case ValueType.Object:
            return (value, path,errors) =>
                typeof value !== 'object' ? errors.push(new ValidationError(
                    `${path.join('.')} is not an object.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined;
        case ValueType.Any:
            return () => {};
        case ValueType.Undefined:
            return (value, path,errors) =>
                value !== undefined ? errors.push(new ValidationError(
                    `${path.join('.')} is not undefined.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined;
        case ValueType.Null:
            return (value, path,errors) =>
                value !== null ? errors.push(new ValidationError(
                    `${path.join('.')} is not null.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined;
    }
}

function createLiteralValidator(token: LiteralToken): InternalValidator {
    const literal = token.v;
    return (value, path,errors) =>
        value !== literal ? errors.push(new ValidationError(
            `${path.join('.')} is not matching with ${literal}.`,path,ValidationErrorType.LiteralMismatch)) : undefined;
}

function createUnionValidator(token: UnionToken): InternalValidator {
    const innerTokens = token.v;
    const tokenLength = innerTokens.length;
    const tokenValidators: InternalValidator[] = [];

    const possibilities = innerTokens.map((t) => tokenToString(t)).join(', ');

    for(let i = 0; i < tokenLength; i++) {
        tokenValidators[i] = createTokenValidator(innerTokens[i]);
    }

    return (value, path,errors) => {
        let foundToken = false;
        let tmpErrors: ValidationError[];
        for(let i = 0; i < tokenLength; i++) {
            tmpErrors = [];
            tokenValidators[i](value,path,tmpErrors);
            if(tmpErrors.length === 0) {
                foundToken = true;
                break;
            }
        }

        if(!foundToken) {
            errors.push(new ValidationError(
                `${path.join('.')} value not matches with any item. Possibilities: ${possibilities}.`,
                path,ValidationErrorType.UnionMismatch));
        }
    };
}

function createIntersectionValidator(token: IntersectionToken): InternalValidator {
    const innerTokens = token.v;
    const tokenLength = innerTokens.length;
    const tokenValidators: InternalValidator[] = [];

    for(let i = 0; i < tokenLength; i++) {
        tokenValidators[i] = createTokenValidator(innerTokens[i]);
    }

    return (value, path,errors) => {
        for(let i = 0; i < tokenLength; i++) {
            tokenValidators[i](value,path,errors);
        }
    };
}

function createTupleValidator(token: TupleToken): InternalValidator {
    const innerTokens = token.v;
    const tokenLength = innerTokens.length;
    const tokenValidators: InternalValidator[] = [];
    const tupleString = tokenToString(token);

    for(let i = 0; i < tokenLength; i++) {
        tokenValidators[i] = createTokenValidator(innerTokens[i]);
    }

    return (value, path,errors) => {
        if(Array.isArray(value)){
            if(value.length !== tokenLength){
                errors.push(new ValidationError(
                    `${path.join('.')} tuple length is not matching. Tuple: ${tupleString} is expected.`,
                    path,ValidationErrorType.TupleMismatch));
            }
            else {
                for(let i = 0; i < tokenLength; i++) {
                    tokenValidators[i](value[i],path,errors);
                }
            }
        }
        else {
            errors.push(new ValidationError(
                `${path.join('.')} is not an array, but a tuple: ${tupleString} is expected.`,
                path,ValidationErrorType.TupleMismatch));
        }
    };
}

function createObjectValidator(token: ObjectToken): InternalValidator {
    const properties = token.v.p;
    const propertyKeys = Object.keys(properties);
    const keysLength = propertyKeys.length;
    const propertyValidator: InternalValidator[] = [];

    const objName = token.v.n;
    const object = tokenToString(token);

    for(let i = 0; i < keysLength; i++) {
        propertyValidator[i] = createPropertyValidator(properties[propertyKeys[i]]);
    }

    return (value, path,errors) => {
        if(typeof value === 'object') {
            path = [...path,`(${objName})`];
            let tmpKey;
            for(let i = 0; i < keysLength; i++) {
                tmpKey = propertyKeys[i];
                propertyValidator[i](value[tmpKey],[...path,`${tmpKey}`],errors);
            }
            //check for unknown keys
            for(let k in value){
                if(propertyKeys.indexOf(k) === -1) {
                    errors.push(new ValidationError(
                        `${path.join('.')} unknown object key: '${k}'. Object: ${object} expected.`,
                        path,ValidationErrorType.PropertyMismatch));
                }
            }
        }
        else {
            errors.push(new ValidationError(
                `${path.join('.')} value is not an object. Object: ${object} expected.`,
                path,ValidationErrorType.ObjectMismatch));
        }
    };
}

function createPropertyValidator(property: Property): InternalValidator {
    const optional = property.o;
    const tokenValidator = createTokenValidator(property.d);
    const propString = tokenToString(property.d);

    return (value, path,errors) => {
        if(value !== undefined) {
            tokenValidator(value,path,errors);
        }
        else if(!optional) {
            errors.push(new ValidationError(
                `${path.join('.')} is not optional, ${propString} expected.`,
                path,ValidationErrorType.PropertyMismatch))
        }
    };
}

function createArrayValidator(token: ArrayToken): InternalValidator {
    const arrayTypeToken = token.v;
    const tokenValidator = createTokenValidator(arrayTypeToken);

    return (value, path,errors) => {
        if(Array.isArray(value)) {
            const length = value.length;
            for(let i = 0; i < length; i++) {
                tokenValidator(value[i],[...path,`.[${i}]`],errors);
            }
        }
        else {
            errors.push(new ValidationError(
                `${path.join('.')} value is not an array.`,
                path,ValidationErrorType.ArrayMismatch));
        }
    };
}

function createEnumValidator(token: EnumToken): InternalValidator {
    const values = token.v;
    const valuesLength = values.length;

    return (value, path,errors) => {
        let foundMember = false;
        for(let i = 0; i < valuesLength; i++) {
            if(value === values[i]) {
                foundMember = true;
                break;
            }
        }

        if(!foundMember) {
            errors.push(new ValidationError(
                `${path.join('.')} value not matches with any Enum(${token.n}) member. Possibilities: ${values}.`,
                path,ValidationErrorType.EnumMismatch));
        }
    };
}