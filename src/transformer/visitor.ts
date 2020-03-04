/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import * as ts from 'typescript';
import * as path from "path";
import StructureParser from "./structureParser";
import ParsedStructureManager from "./parsedStructureManager";
import {runKey} from "../runner/key";
import {resolveNodeTypeReferences} from "./utils";

const rootDir = path.join(__dirname, '..');
const index = path.join(__dirname, '../index.d.ts');
const registerJs = path.join(__dirname, '../register.js');

export default class Visitor {

    private readonly program: ts.Program;
    private readonly typeChecker: ts.TypeChecker;
    private readonly context: ts.TransformationContext;
    private readonly structureParser: StructureParser;
    private readonly sourceFile: ts.SourceFile;
    private readonly parsedStructureManager: ParsedStructureManager = new ParsedStructureManager();

    private constructor(sourceFile: ts.SourceFile,program: ts.Program,context: ts.TransformationContext) {
        this.program = program;
        this.typeChecker = program.getTypeChecker();
        this.context = context;
        this.structureParser = new StructureParser(program);
        this.sourceFile = sourceFile;
    }

    static start(sourceFile: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile {

        if(sourceFile.fileName.indexOf(rootDir) !== -1) {
            //module file...
            return sourceFile;
        }

        const visitor = new Visitor(sourceFile,program,context);
        sourceFile = visitor.start();

        sourceFile = ts.updateSourceFileNode(sourceFile, [
            ts.createExpressionStatement(
                ts.createCall(ts.createPropertyAccess(ts.createCall(
                    ts.createIdentifier('require'),[],[
                        ts.createStringLiteral(registerJs)
                    ]),ts.createIdentifier('default'))
                    ,[],[...visitor.parsedStructureManager.getStructurePackagesArgs()])
            )
            ,...sourceFile.statements]);

        return sourceFile;
    }

    private start (): ts.SourceFile {
        return ts.visitEachChild(this.sourceFile,
            (n) => this.visitNodeAndChildren(n),this.context);
    }

    private visitNodeAndChildren(node: ts.Node): ts.Node {
        return ts.visitEachChild(this.startVisitNode(node),
                childNode => this.visitNodeAndChildren(childNode), this.context);
    }

    private startVisitNode(node: ts.Node): ts.Node {
        try {
            return this.visitNode(node);
        }
        catch(e) {
            const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(node.pos);
            e.message = `Failed at: ${this.sourceFile.fileName}:${line + 1}:${character + 1}: ${e.message}`;
            throw e;
        }
    }

    private getTypeStructureId(node: ts.TypeNode): string {
        const resolved = resolveNodeTypeReferences(node,this.typeChecker);

        const cachedStructureId = this.parsedStructureManager.getParsedStructureId(resolved);

        if(cachedStructureId !== undefined){
            return cachedStructureId;
        }
        else {
            const parsed = this.structureParser.parse(node);
            return this.parsedStructureManager.registerParsedStructure(resolved,parsed);
        }
    }

    private visitNode(node: ts.Node): ts.Node {
        if (this.isSpecialCallExpression(node,'structure')) {
            if (!node.typeArguments) {
                return ts.createObjectLiteral();
            }
            else {
                const oldIdentifier = node.expression;

                if(oldIdentifier.kind === ts.SyntaxKind.Identifier){
                    const structureIdentifier = this.getTypeStructureId(node.typeArguments[0]);

                    return ts.updateCall(node, ts.createPropertyAccess(
                        node.expression as ts.Identifier,
                        ts.createIdentifier(runKey)
                        ),[],
                        [ts.createStringLiteral(structureIdentifier)]);
                }
                else {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new Error('Identifier expected error');
                }
            }
        }
        else if(this.isSpecialCallExpression(node,'assert')) {
            if (!node.typeArguments) {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error("Assert function needs a type argument.");
            }
            if((node.arguments && node.arguments.length < 1)){
                // noinspection ExceptionCaughtLocallyJS
                throw new Error("Assert function needs at least one argument.")
            }

            const oldIdentifier = node.expression;

            if(oldIdentifier.kind === ts.SyntaxKind.Identifier){
                const structureIdentifier = this.getTypeStructureId(node.typeArguments[0]);

                return ts.updateCall(node, ts.createPropertyAccess(
                    node.expression as ts.Identifier,
                    ts.createIdentifier(runKey)
                ),[],
                    [ts.createStringLiteral(structureIdentifier),...node.arguments]);
            }
            else {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error('Identifier expected error');
            }
        }
        return node;
    }

    private isSpecialCallExpression(node: ts.Node,functionName: string): node is ts.CallExpression  {
        if (!ts.isCallExpression(node)) {
            return false;
        }
        const signature = this.typeChecker.getResolvedSignature(node);
        if (typeof signature === 'undefined') {
            return false;
        }

        const { declaration } = signature;
        return (!!declaration && !ts.isJSDocSignature(declaration) &&
            index.indexOf(path.join(declaration.getSourceFile().fileName)) !== -1 &&
            !!declaration.name && declaration.name.getText() === functionName);
    }
}