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
import {CircularDependencyLimitReachedError} from "./circularDependencyLimitReachedError";

export type Validator = (value: any, maxCircularDependency?: number) => ValidationError[];

export function createValidator(structure: Structure): Validator {
    return (new ValidatorCreator(structure)).create();
}

type CircularRunMemory = {
    rememberDependencies: Token[],
    circularDependencyLimit: number,
    circularCount: number
}
type InternalValidator = (value: any,path: string[],errors: ValidationError[],circularRunMemory : CircularRunMemory) => void;
type InternalValidatorWrapper = {run: InternalValidator};

class ValidatorCreator {

    private readonly structure: Structure;
    private readonly buildCache: Map<Token,InternalValidatorWrapper> = new Map();

    constructor(structure: Structure) {
        this.structure = structure;
    }

    create(): Validator {
        const tokenValidator = this.createTokenValidator(this.structure);
        return (value, maxCircularDependency) => {
            const errors: ValidationError[] = [];
            tokenValidator.run(value,['Base'],errors,{
                rememberDependencies: [],
                circularDependencyLimit: maxCircularDependency || 0,
                circularCount: 0
            });
            return errors;
        };
    }

    private createTokenValidator(token: Token): InternalValidatorWrapper {
        const cachedInternalValidator = this.buildCache.get(token);
        if(cachedInternalValidator !== undefined){
            return cachedInternalValidator;
        }

        const placeholder: InternalValidatorWrapper = {
            run: () => {throw new Error('Call of an not created validator.')}
        };
        this.buildCache.set(token,placeholder);

        let validator: InternalValidatorWrapper;
        switch (token.t) {
            case TokenType.ValueType:
                validator = this.createValueTypeValidator(token);
                break;
            case TokenType.Object:
                validator = this.createObjectValidator(token);
                break;
            case TokenType.Array:
                validator = this.createArrayValidator(token);
                break;
            case TokenType.Literal:
                validator = this.createLiteralValidator(token);
                break;
            case TokenType.Union:
                validator = this.createUnionValidator(token);
                break;
            case TokenType.Intersection:
                validator = this.createIntersectionValidator(token);
                break;
            case TokenType.Tuple:
                validator = this.createTupleValidator(token);
                break;
            case TokenType.Enum:
                validator = this.createEnumValidator(token);
                break;
            default:
                throw new Error(`Unknown token: ${token}`);
        }

        placeholder.run = validator.run;
        return validator;
    }

    private createValueTypeValidator(token: ValueToken): InternalValidatorWrapper {
        switch (token.v) {
            case ValueType.String:
                return {run: (value, path, errors) =>
                        typeof value !== 'string' ? errors.push(new ValidationError(
                            `${path.join('.')} is not a string.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined};
            case ValueType.Number:
                return {run: (value, path, errors) =>
                        typeof value !== 'number' ? errors.push(new ValidationError(
                            `${path.join('.')} is not a number.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined};
            case ValueType.Boolean:
                return {run: (value, path, errors) =>
                        typeof value !== 'boolean' ? errors.push(new ValidationError(
                            `${path.join('.')} is not a boolean.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined};
            case ValueType.Function:
                return {run: (value, path, errors) =>
                        typeof value !== 'function' ? errors.push(new ValidationError(
                            `${path.join('.')} is not a function.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined};
            case ValueType.Object:
                return {run: (value, path, errors) =>
                        typeof value !== 'object' ? errors.push(new ValidationError(
                            `${path.join('.')} is not an object.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined};
            case ValueType.Any:
                return {run: () => {}};
            case ValueType.Undefined:
                return {run: (value, path, errors) =>
                        value !== undefined ? errors.push(new ValidationError(
                            `${path.join('.')} is not undefined.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined};
            case ValueType.Null:
                return {run: (value, path, errors) =>
                        value !== null ? errors.push(new ValidationError(
                            `${path.join('.')} is not null.`,path,ValidationErrorType.ValueTypeMismatch)) : undefined};
        }
    }

    private createLiteralValidator(token: LiteralToken): InternalValidatorWrapper {
        const literal = token.v;
        return {run: (value, path, errors) =>
                value !== literal ? errors.push(new ValidationError(
                    `${path.join('.')} is not matching with ${literal}.`,path,ValidationErrorType.LiteralMismatch)) : undefined};
    }

    private createUnionValidator(token: UnionToken): InternalValidatorWrapper {
        const innerTokens = token.v;
        const tokenLength = innerTokens.length;
        const tokenValidators: InternalValidatorWrapper[] = [];

        const possibilities = innerTokens.map((t) => tokenToString(t)).join(', ');

        for(let i = 0; i < tokenLength; i++) {
            tokenValidators[i] = this.createTokenValidator(innerTokens[i]);
        }

        return {run: (value, path, errors, circularRunMemory) =>
            {
                let foundToken = false;
                let tmpErrors: ValidationError[];
                for(let i = 0; i < tokenLength; i++) {
                    tmpErrors = [];
                    tokenValidators[i].run(value,path,tmpErrors,circularRunMemory);
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
            }};
    }

    private createIntersectionValidator(token: IntersectionToken): InternalValidatorWrapper {
        const innerTokens = token.v;
        const tokenLength = innerTokens.length;
        const tokenValidators: InternalValidatorWrapper[] = [];

        for(let i = 0; i < tokenLength; i++) {
            tokenValidators[i] = this.createTokenValidator(innerTokens[i]);
        }

        return {run: (value, path,errors,circularRunMemory) => {
            for(let i = 0; i < tokenLength; i++) {
                tokenValidators[i].run(value,path,errors,circularRunMemory);
            }
        }};
    }

    private createTupleValidator(token: TupleToken): InternalValidatorWrapper {
        const innerTokens = token.v;
        const tokenLength = innerTokens.length;
        const tokenValidators: InternalValidatorWrapper[] = [];
        const tupleString = tokenToString(token);

        for(let i = 0; i < tokenLength; i++) {
            tokenValidators[i] = this.createTokenValidator(innerTokens[i]);
        }

        return {run: (value, path,errors,circularRunMemory) =>
        {
            if(Array.isArray(value)){
                if(value.length !== tokenLength){
                    errors.push(new ValidationError(
                        `${path.join('.')} tuple length is not matching. Tuple: ${tupleString} is expected.`,
                        path,ValidationErrorType.TupleMismatch));
                }
                else {
                    for(let i = 0; i < tokenLength; i++) {
                        tokenValidators[i].run(value[i],path,errors,circularRunMemory);
                    }
                }
            }
            else {
                errors.push(new ValidationError(
                    `${path.join('.')} is not an array, but a tuple: ${tupleString} is expected.`,
                    path,ValidationErrorType.TupleMismatch));
            }
        }};
    }

    private createObjectValidator(token: ObjectToken): InternalValidatorWrapper {
        const properties = token.v.p;
        const propertyKeys = Object.keys(properties);
        const keysLength = propertyKeys.length;
        const propertyValidator: InternalValidatorWrapper[] = [];

        const objName = token.v.n;
        const object = tokenToString(token);

        for(let i = 0; i < keysLength; i++) {
            propertyValidator[i] = this.createPropertyValidator(properties[propertyKeys[i]]);
        }

        return {run: (value, path,errors,circularRunMemory) =>
        {
            if(typeof value === 'object') {
                path = [...path,`(${objName})`];

                let {rememberDependencies,circularCount,circularDependencyLimit} = circularRunMemory;
                if(rememberDependencies.includes(token)){
                    circularCount++;
                    if(circularCount > circularDependencyLimit){
                        throw new CircularDependencyLimitReachedError(circularCount);
                    }
                }
                else {
                    rememberDependencies = [...rememberDependencies,token];
                }
                circularRunMemory = {
                    circularDependencyLimit: circularDependencyLimit,
                    circularCount,
                    rememberDependencies
                };

                let tmpKey;
                for(let i = 0; i < keysLength; i++) {
                    tmpKey = propertyKeys[i];
                    propertyValidator[i].run(value[tmpKey],[...path,`${tmpKey}`],errors,circularRunMemory);
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
        }};
    }

    private createPropertyValidator(property: Property): InternalValidatorWrapper {
        const optional = property.o;
        const tokenValidator = this.createTokenValidator(property.d);
        const propString = tokenToString(property.d);

        return {run: (value, path,errors,circularRunMemory) =>
        {
            if(value !== undefined) {
                tokenValidator.run(value,path,errors,circularRunMemory);
            }
            else if(!optional) {
                errors.push(new ValidationError(
                    `${path.join('.')} is not optional, ${propString} expected.`,
                    path,ValidationErrorType.PropertyMismatch))
            }
        }};
    }

    private createArrayValidator(token: ArrayToken): InternalValidatorWrapper {
        const arrayTypeToken = token.v;
        const tokenValidator = this.createTokenValidator(arrayTypeToken);

        return {run: (value, path,errors,circularRunMemory) =>
        {
            if(Array.isArray(value)) {
                const length = value.length;
                for(let i = 0; i < length; i++) {
                    tokenValidator.run(value[i],[...path,`.[${i}]`],errors,circularRunMemory);
                }
            }
            else {
                errors.push(new ValidationError(
                    `${path.join('.')} value is not an array.`,
                    path,ValidationErrorType.ArrayMismatch));
            }
        }};
    }

    private createEnumValidator(token: EnumToken): InternalValidatorWrapper {
        const values = token.v;
        const valuesLength = values.length;

        return {run: (value, path,errors) => {
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
        }};
    }
}