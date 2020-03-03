/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import 'ts-nameof';
import {Structure} from "./structure/structure";
import {createValidator} from "./validation/validator";
import {TypeAssertionError} from "./validation/typeAssertionError";
import {default as assertRun} from "./runner/assertRun";
import {default as structureRun} from "./runner/structureRun";
import {runKey} from "./runner/key";
import {ValidationErrorType} from "./validation/validationErrorType";

export function structure<T>(): Structure {throw new Error(`Use the ts-run-assert transformer.`)}
structure[runKey] = structureRun;

export function assert<T>(value: any): asserts value is T {throw new Error(`Use the ts-run-assert transformer.`)}
assert[runKey] = assertRun;
export {
    createValidator,
    TypeAssertionError,
    Structure,
    ValidationErrorType
}