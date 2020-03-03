/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import * as ts from 'typescript';
import {StructurePackage} from "../register";

export default class ParsedStructureManager {

    private structureId: number = 0;

    private readonly idMap: Map<string,ts.CallExpression> = new Map();
    private readonly typeIdMap: Map<ts.Node | ts.Type,string> = new Map();

    getParsedStructureId(key: ts.Node | ts.Type): string | undefined {
        const id = this.typeIdMap.get(key);
        if(id !== undefined){
            return id;
        }
        return undefined;
    }

    registerParsedStructure(fromType: ts.Node | ts.Type,parsedStructure: ts.CallExpression): string {
        const key = this.structureId.toString();
        this.idMap.set(key,parsedStructure);
        this.typeIdMap.set(fromType,key);
        this.structureId++;
        return key;
    }

    getStructurePackagesArgs(): ts.ObjectLiteralExpression[] {
        const structures: ts.ObjectLiteralExpression[] = [];
        for (let [id, callExpression] of this.idMap.entries()) {
            structures.push(ts.createObjectLiteral([
                ts.createPropertyAssignment(nameof<StructurePackage>(s => s.i),ts.createStringLiteral(id)),
                ts.createPropertyAssignment(nameof<StructurePackage>(s => s.s),callExpression)
            ]));
        }
        return structures;
    }
}