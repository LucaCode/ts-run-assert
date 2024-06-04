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

export default function register(parsedStructures: Record<string, Structure>) {
    let structure: Structure;
    for(let k in parsedStructures) {
        if(parsedStructures.hasOwnProperty(k)) {
            structure = parsedStructures[k];
            structureMap.set(k,structure);
            validatorMap.set(k,createValidator(structure));
        }
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