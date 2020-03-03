/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import * as ts from 'typescript';

export function resolveNodeTypeReferences(node: ts.TypeNode, checker: ts.TypeChecker): ts.TypeNode | ts.Type  {
    if(ts.isTypeReferenceNode(node)){
        return checker.getTypeFromTypeNode(node);
    }
    else {
        return node;
    }
}