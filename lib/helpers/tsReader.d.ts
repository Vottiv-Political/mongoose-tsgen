import { ModelTypes } from "../types";
export declare const getModelTypes: (modelsPaths: string[], maxCommentDepth?: number) => ModelTypes;
export declare const registerUserTs: (basePath: string) => (() => void) | null;
