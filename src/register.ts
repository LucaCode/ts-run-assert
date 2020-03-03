/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import {createValidator, Validator} from "./validation/validator";
// noinspection TypeScriptPreferShortImport
import {Structure} from "./structure/structure";

const structureMap: Map<string,Structure> = new Map<string, Structure>();
const validatorMap: Map<string,Validator> = new Map<string, Validator>();

export interface StructurePackage {
    i: string,
    s: Structure
}

export default function register(...structures: StructurePackage[]) {
    let structurePackage: StructurePackage;
    for(let i = 0; i < structures.length; i++) {
        structurePackage = structures[i];
        structureMap.set(structurePackage.i,structurePackage.s);
        validatorMap.set(structurePackage.i,createValidator(structurePackage.s));
    }
}

export function getPreparedValidator(id: string): Validator {
    const tmp = validatorMap.get(id);
    if(tmp !== undefined) {
        return tmp;
    }
    throw new Error(`Missing validator: '${id}'.`);
}

export function getStructure(id: string): Structure {
    const tmp = structureMap.get(id);
    if(tmp !== undefined) {
        return tmp;
    }
    throw new Error(`Missing structure: '${id}'.`);
}