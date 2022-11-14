import { SourceFile } from "ts-morph";
import mongoose from "mongoose";
import { ModelTypes } from "../types";
export declare const replaceModelTypes: (sourceFile: SourceFile, modelTypes: ModelTypes, schemas: {
    [modelName: string]: mongoose.Schema<any, mongoose.Model<any, any, any, any>, any, any>;
}) => void;
export declare const addPopulateHelpers: (sourceFile: SourceFile) => void;
export declare const overloadQueryPopulate: (sourceFile: SourceFile) => void;
export declare const createSourceFile: (genPath: string) => SourceFile;
export declare const getSchemaTypes: ({ schema, modelName }: {
    schema: any;
    modelName: string;
}) => string;
export declare const generateTypes: ({ sourceFile, schemas, imports, noMongoose, namespace, custom_module, global }: {
    sourceFile: SourceFile;
    schemas: {
        [modelName: string]: mongoose.Schema<any, mongoose.Model<any, any, any, any>, any, any>;
    };
    imports?: string[] | undefined;
    noMongoose?: boolean | undefined;
    namespace?: string | undefined;
    custom_module?: string | undefined;
    global?: boolean | undefined;
}) => SourceFile;
export declare const saveFile: ({ sourceFile }: {
    sourceFile: SourceFile;
    genFilePath: string;
}) => void;
