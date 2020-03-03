/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import ValidationError from "./validationError";

export class TypeAssertionError extends Error {

    private readonly _errors: ValidationError[];

    constructor(errors: ValidationError[]) {
        super(`Errors: \n${errors.join('\n')}`);
        this._errors = errors;
    }

    get errors(): ValidationError[] {
        return this._errors;
    }

    get errorCount(): number {
        return this._errors.length;
    }
}