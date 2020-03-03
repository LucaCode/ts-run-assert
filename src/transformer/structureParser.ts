/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import {EnumToken, Object, Property, Token, TokenType, ValueType} from "../structure/structure";
import * as ts from 'typescript';
import {resolveNodeTypeReferences} from "./utils";

export default class StructureParser {
    private readonly typeChecker: ts.TypeChecker;

    private cacheVarId: number = 0;
    private declaredVariableCache: Map<ts.TypeNode | ts.Type,ts.Identifier> = new Map();
    private variables: ts.VariableStatement[] = [];
    private cycleDependencies: ts.Statement[] = [];

    constructor(program: ts.Program) {
        this.typeChecker = program.getTypeChecker();
    }

    public parse(node: ts.TypeNode): ts.CallExpression {
        //reset
        this.cacheVarId = 0;
        this.declaredVariableCache = new Map();
        this.variables = [];
        this.cycleDependencies = [];

        const parsed = this.parseTypeNode(node,[],['Base']);

        return ts.createImmediatelyInvokedArrowFunction([
            ...this.variables,
            ...this.cycleDependencies,
            ts.createReturn(parsed)
        ]);
    }

    private declareVariable(node: ts.TypeNode | ts.Type): ts.Identifier {
        const id = `t_${this.cacheVarId.toString()}`;
        const idIdentifier = ts.createIdentifier(id);
        this.cacheVarId++;
        this.declaredVariableCache.set(node,idIdentifier);
        return idIdentifier;
    }

    private initVariable(identifier: ts.Identifier,object: ts.ObjectLiteralExpression) {
        this.variables.push(
            ts.createVariableStatement(
                [ts.createModifier(ts.SyntaxKind.ConstKeyword)],
                [ts.createVariableDeclaration(identifier,undefined,object)]));
    }

    private parseTypeNode(node: ts.TypeNode,rememberIdentifiers: ts.Identifier[],path: string[]): ts.ObjectLiteralExpression | ts.Identifier {
        const variableCached = this.declaredVariableCache.get(resolveNodeTypeReferences(node,this.typeChecker));
        if(variableCached) return variableCached;

        let expression: ts.ObjectLiteralExpression | ts.Identifier | undefined;
        if(ts.isUnionTypeNode(node)){
            expression = this.parseUnionTypeNode(node,rememberIdentifiers,path);
        }
        else if(ts.isIntersectionTypeNode(node)){
            expression = this.parseIntersectionTypeNode(node,rememberIdentifiers,path);
        }
        else if(ts.isLiteralTypeNode(node)){
            expression = this.parseLiteralTypeNode(node);
        }
        else if(ts.isArrayTypeNode(node)){
            expression = this.parseArrayTypeNode(node,rememberIdentifiers,path);
        }
        else if(ts.isTupleTypeNode(node)) {
            expression = this.parseTupleTypeNode(node,rememberIdentifiers,path);
        }
        else if(ts.isTypeOperatorNode(node)) {
            expression = this.parseTypeOperatorNode(node,path);
        }
        else if(ts.isTypeReferenceNode(node)) {
            expression = this.parseTypeReferenceNode(node,rememberIdentifiers,path);
        }
        else {
            expression = this.parseValueTypes(node);
        }
        if(expression !== undefined){
            return expression;
        }
        throw new Error(`${path.join('.')} unknown action. Expression is undefined.`);
    }

    private parseUnionTypeNode(node: ts.UnionTypeNode,rememberIdentifiers: ts.Identifier[],path: string[]): ts.ObjectLiteralExpression {
        return ts.createObjectLiteral([
            ts.createPropertyAssignment(nameof<Token>(s => s.t),ts.createNumericLiteral(TokenType.Union.toString())),
            ts.createPropertyAssignment(nameof<Token>(s => s.v),ts.createArrayLiteral(node.types.map(node => this.parseTypeNode(node,rememberIdentifiers,path))))
        ]);
    }

    private parseIntersectionTypeNode(node: ts.IntersectionTypeNode,rememberIdentifiers: ts.Identifier[],path: string[]): ts.ObjectLiteralExpression {
        return ts.createObjectLiteral([
            ts.createPropertyAssignment(nameof<Token>(s => s.t),ts.createNumericLiteral(TokenType.Intersection.toString())),
            ts.createPropertyAssignment(nameof<Token>(s => s.v),ts.createArrayLiteral(node.types.map(node => this.parseTypeNode(node,rememberIdentifiers,path))))
        ]);
    }

    private parseTypeReferenceNode(node: ts.TypeReferenceNode,rememberIdentifiers: ts.Identifier[],path: string[])
        : ts.ObjectLiteralExpression | ts.Identifier | undefined
    {
        const type = this.typeChecker.getTypeFromTypeNode(node);
        if(type.isClassOrInterface()) {
            const identifier = this.declareVariable(type);
            this.initVariable(identifier,
                this.parseObject(type,node.typeName.getText(),identifier,[...rememberIdentifiers,identifier],path));
            return identifier;
        }
        else {
            const symbol = this.typeChecker.getSymbolAtLocation(node.typeName);
            const declarations = symbol?.declarations;
            if(declarations && declarations.length === 1){
                const declaration = declarations[0];
                if(ts.isTypeAliasDeclaration(declaration)) {
                    const typeNode = declaration.type;
                    return this.parseTypeNode(typeNode,rememberIdentifiers,
                        [...path,`(${declaration.name.escapedText})`])
                }
                else if(ts.isEnumDeclaration(declaration)){
                    return this.parseEnumDeclarationNode(declaration,node,
                        [...path,`(${declaration.name.escapedText})`]);
                }
            }
        }
        return undefined;
    }

    // noinspection JSMethodCanBeStatic
    private parseLiteralTypeNode(node: ts.LiteralTypeNode): ts.ObjectLiteralExpression {
        const literal = node.literal;
        const text = node.getText();
        let value: ts.LiteralExpression;

        if(ts.isNumericLiteral(literal)) {
            value = ts.createNumericLiteral(text);
        }
        else if(ts.isStringLiteral(literal)) {
            value = ts.createStringLiteral(text.substring(1, text.length-1));
        }
        else {
            value = ts.createStringLiteral(text);
        }

        return ts.createObjectLiteral([
            ts.createPropertyAssignment(nameof<Token>(s => s.t),ts.createNumericLiteral(TokenType.Literal.toString())),
            ts.createPropertyAssignment(nameof<Token>(s => s.v),value)
        ]);
    }

    private parseArrayTypeNode(node: ts.ArrayTypeNode,rememberIdentifiers: ts.Identifier[],path: string[]): ts.ObjectLiteralExpression {
        return ts.createObjectLiteral([
            ts.createPropertyAssignment(nameof<Token>(s => s.t),ts.createNumericLiteral(TokenType.Array.toString())),
            ts.createPropertyAssignment(nameof<Token>(s => s.v),this.parseTypeNode(node.elementType,rememberIdentifiers,path))
        ]);
    }

    private parseTupleTypeNode(node: ts.TupleTypeNode,rememberIdentifiers: ts.Identifier[],path: string[]): ts.ObjectLiteralExpression {
        return ts.createObjectLiteral([
            ts.createPropertyAssignment(nameof<Token>(s => s.t),ts.createNumericLiteral(TokenType.Tuple.toString())),
            ts.createPropertyAssignment(nameof<Token>(s => s.v),ts.createArrayLiteral(
                node.elementTypes.map((element,index) =>
                    this.parseTypeNode(element,rememberIdentifiers,[...path,`[${index}]`]))))
        ]);
    }

    private parseTypeOperatorNode(node: ts.TypeOperatorNode,path: string[]): ts.ObjectLiteralExpression {
        if(node.operator === ts.SyntaxKind.KeyOfKeyword){
            const props = this.typeChecker.getTypeFromTypeNode(node.type).getProperties();
            return ts.createObjectLiteral([
                ts.createPropertyAssignment(nameof<Token>(s => s.t),ts.createNumericLiteral(TokenType.Union.toString())),
                ts.createPropertyAssignment(nameof<Token>(s => s.v),ts.createArrayLiteral(
                    props.map((value) => ts.createObjectLiteral([
                        ts.createPropertyAssignment(nameof<Token>(s => s.t),ts.createNumericLiteral(TokenType.Literal.toString())),
                        ts.createPropertyAssignment(nameof<Token>(s => s.v),ts.createStringLiteral(value.escapedName.toString()))
                    ]))))
            ]);
        }
        else {
            throw new Error(`${path.join('.')} only the key of type operator is supported.`);
        }
    }

    // noinspection JSMethodCanBeStatic
    private parseEnumDeclarationNode(declaration: ts.EnumDeclaration,node: ts.TypeNode,path: string[]): ts.ObjectLiteralExpression {
        const values: (ts.NumericLiteral | ts.StringLiteral)[] = [];
        const members = declaration.members;
        let value: any;
        for(let i = 0; i < members.length; i++) {
            //value of enum member
            value = this.typeChecker.getTypeOfSymbolAtLocation(members[i]['symbol'],node)['value'];

            if(typeof value === 'number'){
                values.push(ts.createNumericLiteral(value.toString()));
            }
            else if(typeof value === 'string'){
                values.push(ts.createStringLiteral(value));
            }
            else {
                throw new Error(`${path.join('.')} unknown enum member value.`);
            }
        }
        return ts.createObjectLiteral([
            ts.createPropertyAssignment(nameof<EnumToken>(s => s.n),ts.createStringLiteral(declaration.name.escapedText.toString())),
            ts.createPropertyAssignment(nameof<EnumToken>(s => s.t),ts.createNumericLiteral(TokenType.Enum.toString())),
            ts.createPropertyAssignment(nameof<EnumToken>(s => s.v),ts.createArrayLiteral(values))
        ]);
    }

    private parseObject(type: ts.Type,name: string,selfIdentifier: ts.Identifier,rememberIdentifiers: ts.Identifier[],path: string[]): ts.ObjectLiteralExpression {
        const props = type.getProperties();
        const propertiesStructure: ts.PropertyAssignment[] = [];

        props.forEach((prop,index) => {
            const valueDeclaration = prop.valueDeclaration;
            const tmpPath = [...path,`(${name})`];

            let propKey;
            if(ts.isPropertySignature(valueDeclaration)){
                if(ts.isComputedPropertyName(valueDeclaration.name)){
                    const expression = valueDeclaration.name.expression;

                    if(ts.isLiteralExpression(expression)){
                        let value: any = expression.getText();
                        if(ts.isNumericLiteral(expression)) {
                            propKey = parseFloat(value);
                        }
                        else if(ts.isStringLiteral(expression)) {
                            propKey = value.substring(1, value.length-1);
                        }
                        else {
                            throw new Error(`${tmpPath.join('.')}.[PropIndex:${index}] computed property literal is not supported.`);
                        }
                    }
                    else if(ts.isIdentifier(expression)){
                        throw new Error(`${tmpPath.join('.')}.[PropIndex:${index}] computed property witch a variable is not supported.`);
                    }
                    else {
                        throw new Error(`${tmpPath.join('.')}.[PropIndex:${index}] specific computed property is not supported.`);
                    }
                }
                else {
                    propKey = prop.escapedName.toString();
                }
            }
            else if(ts.isPropertyDeclaration(valueDeclaration)){
                propKey = prop.escapedName.toString();
            }
            else {
                return;
            }

            if(valueDeclaration.type !== undefined) {
                const parsedValue = this.parseTypeNode(valueDeclaration.type,rememberIdentifiers,[...tmpPath,propKey]);
                const optional = valueDeclaration.questionToken;


                let propValue;
                if(parsedValue.kind === ts.SyntaxKind.Identifier && rememberIdentifiers.includes(parsedValue)) {
                    propValue = undefined;
                    this.cycleDependencies.push(
                        ts.createExpressionStatement(
                            ts.createBinary(
                                ts.createElementAccess(
                                    ts.createElementAccess(
                                        ts.createElementAccess(
                                            ts.createElementAccess(
                                                selfIdentifier,
                                                ts.createStringLiteral(nameof<Token>(s => s.v))
                                            ),
                                            ts.createStringLiteral(nameof<Object>(s => s.p))
                                        ),
                                        ts.createStringLiteral(propKey)
                                    ),
                                    ts.createStringLiteral(nameof<Property>(s => s.d))
                                ),
                                ts.SyntaxKind.EqualsToken,
                                parsedValue
                            )
                        )
                    );
                }
                else {
                    propValue = parsedValue;
                }

                propertiesStructure.push(ts.createPropertyAssignment(propKey,
                    ts.createObjectLiteral([
                        ...(propValue !== undefined ? [
                            ts.createPropertyAssignment(nameof<Property>(s => s.d),propValue)] : []),
                        ...(optional ? [
                            ts.createPropertyAssignment(nameof<Property>(s => s.o),ts.createTrue())
                        ] : [])
                    ])
                ));
            }
        });

        return ts.createObjectLiteral([
            ts.createPropertyAssignment(nameof<Token>(s => s.t),ts.createNumericLiteral(TokenType.Object.toString())),
            ts.createPropertyAssignment(nameof<Token>(s => s.v),ts.createObjectLiteral([
                ts.createPropertyAssignment(nameof<Object>(s => s.n),ts.createStringLiteral(name)),
                ts.createPropertyAssignment(nameof<Object>(s => s.p),ts.createObjectLiteral(propertiesStructure))
            ]))
        ]);
    }

    // noinspection JSMethodCanBeStatic
    private parseValueTypes(node: ts.TypeNode): ts.ObjectLiteralExpression | undefined {
        let valueType: ValueType | undefined;
        switch (node.kind) {
            case ts.SyntaxKind.StringKeyword:
                valueType = ValueType.String;
                break;
            case ts.SyntaxKind.NumberKeyword:
                valueType = ValueType.Number;
                break;
            case ts.SyntaxKind.BooleanKeyword:
                valueType = ValueType.Boolean;
                break;
            case ts.SyntaxKind.FunctionType:
            case ts.SyntaxKind.FunctionKeyword:
            case ts.SyntaxKind.ParenthesizedType:
                valueType = ValueType.Function;
                break;
            case ts.SyntaxKind.ObjectKeyword:
                valueType = ValueType.Object;
                break;
            case ts.SyntaxKind.AnyKeyword:
                valueType = ValueType.Any;
                break;
            case ts.SyntaxKind.NullKeyword:
                valueType = ValueType.Null;
                break;
        }
        if(valueType !== undefined) {
           return this.createValueTypeToken(valueType);
        }
        return undefined;
    }

    // noinspection JSMethodCanBeStatic
    private createValueTypeToken(valueType: ValueType): ts.ObjectLiteralExpression {
        return ts.createObjectLiteral([
            ts.createPropertyAssignment(nameof<Token>(s => s.t),ts.createNumericLiteral(TokenType.ValueType.toString())),
            ts.createPropertyAssignment(nameof<Token>(s => s.v),ts.createNumericLiteral(valueType.toString()))
        ]);
    }
}