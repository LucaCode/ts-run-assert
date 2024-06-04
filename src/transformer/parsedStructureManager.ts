/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import * as ts from 'typescript';

export default class ParsedStructureManager {

    private structureId: number = 0;

    private readonly idMap: Map<string,ts.Identifier | ts.ObjectLiteralExpression> = new Map();
    private readonly typeIdMap: Map<ts.Node | ts.Type,string> = new Map();

    getParsedStructureId(key: ts.Node | ts.Type): string | undefined {
        const id = this.typeIdMap.get(key);
        if(id !== undefined){
            return id;
        }
        return undefined;
    }

    registerParsedStructure(fromType: ts.Node | ts.Type,root: ts.Identifier | ts.ObjectLiteralExpression): string {
        const key = this.structureId.toString();
        this.idMap.set(key,root);
        this.typeIdMap.set(fromType,key);
        this.structureId++;
        return key;
    }

    getStructurePackagesArgument(): ts.ObjectLiteralExpression {
        const props: ts.PropertyAssignment[] = [];
        for (let [key, value] of this.idMap) {
            props.push(ts.createPropertyAssignment(key,value));
        }
        return ts.createObjectLiteral(props);
    }
}