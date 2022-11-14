import mongoose from "mongoose";
export declare const getShouldLeanIncludeVirtuals: (schema: any) => boolean;
export declare const convertFuncSignatureToType: (funcSignature: string, funcType: "methods" | "statics" | "query", modelName: string) => string;
export declare const convertToSingular: (str: string) => string;
export declare const parseFunctions: (funcs: any, modelName: string, funcType: "methods" | "statics" | "query") => string;
export declare const convertBaseTypeToTs: (key: string, val: any, isDocument: boolean, noMongoose?: boolean) => string | undefined;
export declare const getParseKeyFn: (isDocument: boolean, shouldLeanIncludeVirtuals: boolean, noMongoose: boolean) => (key: string, valOriginal: any) => string;
export declare const parseSchema: ({ schema: schemaOriginal, modelName, isDocument, header, footer, noMongoose, shouldLeanIncludeVirtuals }: {
    schema: any;
    modelName?: string | undefined;
    isDocument: boolean;
    header?: string | undefined;
    footer?: string | undefined;
    noMongoose?: boolean | undefined;
    shouldLeanIncludeVirtuals: boolean;
}) => string;
interface LoadedSchemas {
    [modelName: string]: mongoose.Schema;
}
export declare const loadSchemas: (modelsPaths: string[]) => LoadedSchemas;
export {};
