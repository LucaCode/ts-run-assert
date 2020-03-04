/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

export class CircularDependencyLimitReachedError extends Error {

    private readonly _count: number;

    constructor(count: number) {
        super('Circular dependency limit reached.');
        this._count = count;
    }

    get count(): number {
        return this._count;
    }
}