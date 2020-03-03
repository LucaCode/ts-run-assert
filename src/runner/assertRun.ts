/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import {getPreparedValidator} from "../register";
import {TypeAssertionError} from "../validation/typeAssertionError";

export default function run(id: string, value: any){
    const errors = getPreparedValidator(id)(value);
    if(errors.length > 0){
        throw new TypeAssertionError(errors);
    }
};