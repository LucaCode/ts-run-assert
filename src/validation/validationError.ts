/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import {ValidationErrorType} from "./validationErrorType";

export default class ValidationError extends Error {

    private readonly _path: string[];
    private readonly _type: ValidationErrorType;

    constructor(message: string, path: string[], type: ValidationErrorType) {
        super(message);
        this._path = path;
        this._type = type;
    }

    get path(): string[] {
        return this._path;
    }

    get type(): ValidationErrorType {
        return this._type;
    }
}