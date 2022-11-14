"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserTs = exports.getModelTypes = void 0;
const tslib_1 = require("tslib");
const ts_morph_1 = require("ts-morph");
const glob_1 = (0, tslib_1.__importDefault)(require("glob"));
const path_1 = (0, tslib_1.__importDefault)(require("path"));
const fs = (0, tslib_1.__importStar)(require("fs"));
const strip_json_comments_1 = (0, tslib_1.__importDefault)(require("strip-json-comments"));
function getNameAndType(funcDeclaration) {
    const name = funcDeclaration.getName();
    const typeNode = funcDeclaration.getType();
    const type = typeNode.getText(funcDeclaration);
    return { name, type };
}
function findCommentsInFile(sourceFile, modelTypes, maxCommentDepth) {
    var _a;
    // TODO: this is reused from findTypesInFile, should abstract out instead
    const schemaModelMapping = {};
    Object.keys(modelTypes).forEach((modelName) => {
        const { schemaVariableName } = modelTypes[modelName];
        if (schemaVariableName)
            schemaModelMapping[schemaVariableName] = modelName;
    });
    for (const statement of sourceFile.getStatements()) {
        if (!ts_morph_1.Node.isVariableStatement(statement))
            continue;
        const varDeclarationList = statement.getChildAtIndexIfKind(0, ts_morph_1.SyntaxKind.VariableDeclarationList);
        if (!varDeclarationList)
            continue;
        const varDeclaration = varDeclarationList.getFirstChildByKind(ts_morph_1.SyntaxKind.VariableDeclaration);
        if (!varDeclaration)
            continue;
        const schemaName = (_a = varDeclaration.getFirstChildByKind(ts_morph_1.SyntaxKind.Identifier)) === null || _a === void 0 ? void 0 : _a.getText();
        if (!schemaName)
            continue;
        const modelName = schemaModelMapping[schemaName];
        if (!modelName) {
            continue;
        }
        const newExpression = varDeclaration.getFirstChildByKind(ts_morph_1.SyntaxKind.NewExpression);
        if (!newExpression)
            continue;
        const objLiteralExp = newExpression.getFirstChildByKind(ts_morph_1.SyntaxKind.ObjectLiteralExpression);
        if (!objLiteralExp)
            continue;
        const extractComments = (objLiteralExp, rootPath) => {
            const propAssignments = objLiteralExp.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertyAssignment);
            propAssignments.forEach(propAssignment => {
                var _a;
                const propName = (_a = propAssignment.getFirstChildByKind(ts_morph_1.SyntaxKind.Identifier)) === null || _a === void 0 ? void 0 : _a.getText();
                if (!propName)
                    return;
                const path = rootPath ? `${rootPath}.${propName}` : propName;
                propAssignment.getLeadingCommentRanges().forEach(commentRange => {
                    const commentText = commentRange.getText();
                    // skip comments that are not jsdocs
                    if (!commentText.startsWith("/**"))
                        return;
                    modelTypes[modelName].comments.push({
                        path,
                        comment: commentText
                    });
                });
                if (rootPath.split(".").length < maxCommentDepth) {
                    const nestedObjLiteralExp = propAssignment.getFirstChildByKind(ts_morph_1.SyntaxKind.ObjectLiteralExpression);
                    if (nestedObjLiteralExp) {
                        extractComments(nestedObjLiteralExp, path);
                    }
                }
            });
        };
        extractComments(objLiteralExp, "");
    }
    // TODO: get virtual comments
    return modelTypes;
}
function findTypesInFile(sourceFile, modelTypes) {
    var _a, _b, _c, _d, _e, _f, _g;
    const schemaModelMapping = {};
    Object.keys(modelTypes).forEach((modelName) => {
        const { schemaVariableName } = modelTypes[modelName];
        if (schemaVariableName)
            schemaModelMapping[schemaVariableName] = modelName;
    });
    for (const statement of sourceFile.getStatements()) {
        if (!ts_morph_1.Node.isExpressionStatement(statement))
            continue;
        const binaryExpr = statement.getChildAtIndexIfKind(0, ts_morph_1.SyntaxKind.BinaryExpression);
        const callExpr = statement.getChildAtIndexIfKind(0, ts_morph_1.SyntaxKind.CallExpression);
        if (binaryExpr) {
            // left is a propertyaccessexpression, children are [identifier, dottoken, identifier]
            const left = binaryExpr.getLeft();
            const right = binaryExpr.getRight();
            if (left.getKind() !== ts_morph_1.SyntaxKind.PropertyAccessExpression)
                continue;
            if (right.getKind() !== ts_morph_1.SyntaxKind.AsExpression &&
                right.getKind() !== ts_morph_1.SyntaxKind.ObjectLiteralExpression &&
                right.getKind() !== ts_morph_1.SyntaxKind.TypeAssertionExpression)
                continue;
            const leftChildren = left.getChildren();
            let modelName;
            const hasSchemaIdentifier = leftChildren.some(child => {
                if (child.getKind() !== ts_morph_1.SyntaxKind.Identifier)
                    return false;
                modelName = schemaModelMapping[child.getText()];
                if (!modelName)
                    return false;
                return true;
            });
            const hasDotToken = leftChildren.some(child => child.getKind() === ts_morph_1.SyntaxKind.DotToken);
            if (!hasSchemaIdentifier || !hasDotToken)
                continue;
            const hasMethodsIdentifier = leftChildren.some(child => child.getKind() === ts_morph_1.SyntaxKind.Identifier && child.getText() === "methods");
            const hasStaticsIdentifier = leftChildren.some(child => child.getKind() === ts_morph_1.SyntaxKind.Identifier && child.getText() === "statics");
            const hasQueryIdentifier = leftChildren.some(child => child.getKind() === ts_morph_1.SyntaxKind.Identifier && child.getText() === "query");
            let rightFuncDeclarations = [];
            if (right.getKind() === ts_morph_1.SyntaxKind.ObjectLiteralExpression) {
                rightFuncDeclarations = right.getChildrenOfKind(ts_morph_1.SyntaxKind.MethodDeclaration);
            }
            else if (right.getKind() === ts_morph_1.SyntaxKind.AsExpression) {
                const objLiteralExp = right.getFirstChildByKind(ts_morph_1.SyntaxKind.ObjectLiteralExpression);
                if (objLiteralExp)
                    rightFuncDeclarations = objLiteralExp.getChildrenOfKind(ts_morph_1.SyntaxKind.MethodDeclaration);
            }
            else if (right.getKind() === ts_morph_1.SyntaxKind.TypeAssertionExpression) {
                const objLiteralExp = right.getFirstChildByKind(ts_morph_1.SyntaxKind.ObjectLiteralExpression);
                if (objLiteralExp) {
                    rightFuncDeclarations = objLiteralExp.getChildrenOfKind(ts_morph_1.SyntaxKind.MethodDeclaration);
                }
            }
            else {
                rightFuncDeclarations = right.getChildrenOfKind(ts_morph_1.SyntaxKind.MethodDeclaration);
            }
            if (hasMethodsIdentifier) {
                rightFuncDeclarations.forEach((declaration) => {
                    const { name, type } = getNameAndType(declaration);
                    modelTypes[modelName].methods[name] = type;
                });
            }
            else if (hasStaticsIdentifier) {
                rightFuncDeclarations.forEach((declaration) => {
                    const { name, type } = getNameAndType(declaration);
                    modelTypes[modelName].statics[name] = type;
                });
            }
            else if (hasQueryIdentifier) {
                rightFuncDeclarations.forEach((declaration) => {
                    const { name, type } = getNameAndType(declaration);
                    modelTypes[modelName].query[name] = type;
                });
            }
        }
        else if (callExpr) {
            // virtual property
            let propAccessExpr = callExpr.getFirstChildByKind(ts_morph_1.SyntaxKind.PropertyAccessExpression);
            if ((propAccessExpr === null || propAccessExpr === void 0 ? void 0 : propAccessExpr.getName()) === "set") {
                propAccessExpr = (_a = propAccessExpr
                    .getFirstChildByKind(ts_morph_1.SyntaxKind.CallExpression)) === null || _a === void 0 ? void 0 : _a.getFirstChildByKind(ts_morph_1.SyntaxKind.PropertyAccessExpression);
            }
            if ((propAccessExpr === null || propAccessExpr === void 0 ? void 0 : propAccessExpr.getName()) !== "get")
                continue;
            const schemaVariableName = (_d = (_c = (_b = propAccessExpr
                .getFirstChildByKind(ts_morph_1.SyntaxKind.CallExpression)) === null || _b === void 0 ? void 0 : _b.getFirstChildByKind(ts_morph_1.SyntaxKind.PropertyAccessExpression)) === null || _c === void 0 ? void 0 : _c.getFirstChildByKind(ts_morph_1.SyntaxKind.Identifier)) === null || _d === void 0 ? void 0 : _d.getText();
            if (schemaVariableName) {
                if (process.env.DEBUG)
                    console.log("tsreader: Found virtual on schema: " + schemaVariableName);
            }
            else
                continue;
            const modelName = schemaModelMapping[schemaVariableName];
            if (!modelName) {
                if (process.env.DEBUG)
                    console.warn("tsreader: Associated model name not found for schema: " + schemaVariableName);
                continue;
            }
            const funcExpr = (_e = propAccessExpr === null || propAccessExpr === void 0 ? void 0 : propAccessExpr.getParent()) === null || _e === void 0 ? void 0 : _e.getFirstChildByKind(ts_morph_1.SyntaxKind.FunctionExpression);
            const type = (_f = funcExpr === null || funcExpr === void 0 ? void 0 : funcExpr.getType()) === null || _f === void 0 ? void 0 : _f.getText(funcExpr);
            const callExpr2 = propAccessExpr.getFirstChildByKind(ts_morph_1.SyntaxKind.CallExpression);
            const stringLiteral = callExpr2 === null || callExpr2 === void 0 ? void 0 : callExpr2.getArguments()[0];
            const propAccessExpr2 = callExpr2 === null || callExpr2 === void 0 ? void 0 : callExpr2.getFirstChildByKind(ts_morph_1.SyntaxKind.PropertyAccessExpression);
            if ((propAccessExpr2 === null || propAccessExpr2 === void 0 ? void 0 : propAccessExpr2.getName()) !== "virtual")
                continue;
            const virtualName = stringLiteral === null || stringLiteral === void 0 ? void 0 : stringLiteral.getText();
            let returnType = (_g = type === null || type === void 0 ? void 0 : type.split("=> ")) === null || _g === void 0 ? void 0 : _g[1];
            if (!returnType || !virtualName) {
                if (process.env.DEBUG)
                    console.warn("tsreader: virtualName or returnType not found: ", {
                        virtualName,
                        returnType
                    });
                continue;
            }
            /**
             * @experimental trying this out since certain virtual types are indeterminable and get set to void, which creates incorrect TS errors
             * This should be a fine workaround because virtual properties shouldn't return solely `void`, they return real values.
             */
            if (returnType === "void")
                returnType = "any";
            const virtualNameSanitized = virtualName.slice(1, virtualName.length - 1);
            modelTypes[modelName].virtuals[virtualNameSanitized] = returnType;
        }
    }
    return modelTypes;
}
const parseModelInitializer = (d, isModelNamedImport) => {
    const callExpr = d.getFirstChildByKind(ts_morph_1.SyntaxKind.CallExpression);
    if (!callExpr)
        return undefined;
    const callExprStr = callExpr.getText().replace(/[\r\n\t ]/g, "");
    // if model is a named import, we can match this without `mongoose.` prefix
    const pattern = isModelNamedImport ?
        /model(?:<\w+,\w+(?:,\w+)?>)?\(["'`](\w+)["'`],(\w+),?\)/ :
        /mongoose\.model(?:<\w+,\w+(?:,\w+)?>)?\(["'`](\w+)["'`],(\w+),?\)/;
    const modelInitMatch = callExprStr.match(pattern);
    if (!modelInitMatch) {
        if (process.env.DEBUG) {
            console.warn(`tsreader: Could not find model name in Mongoose model initialization: ${callExprStr}`);
        }
        return undefined;
    }
    const [, modelName, schemaVariableName] = modelInitMatch;
    return { modelName, schemaVariableName };
};
function initModelTypes(sourceFile, filePath) {
    if (process.env.DEBUG)
        console.log("tsreader: Searching file for Mongoose schemas: " + filePath);
    const modelTypes = {};
    const mongooseImport = sourceFile.getImportDeclaration("mongoose");
    let isModelNamedImport = false;
    mongooseImport === null || mongooseImport === void 0 ? void 0 : mongooseImport.getNamedImports().forEach(importSpecifier => {
        if (importSpecifier.getText() === "model")
            isModelNamedImport = true;
    });
    sourceFile.getVariableDeclarations().forEach(d => {
        var _a;
        if (!d.hasExportKeyword())
            return;
        const { modelName, schemaVariableName } = (_a = parseModelInitializer(d, isModelNamedImport)) !== null && _a !== void 0 ? _a : {};
        if (!modelName || !schemaVariableName)
            return;
        const modelVariableName = d.getName();
        modelTypes[modelName] = {
            schemaVariableName,
            modelVariableName,
            filePath,
            methods: {},
            statics: {},
            query: {},
            virtuals: {},
            comments: []
        };
    });
    const defaultExportAssignment = sourceFile.getExportAssignment(d => !d.isExportEquals());
    if (defaultExportAssignment) {
        const defaultModelInit = parseModelInitializer(defaultExportAssignment, isModelNamedImport);
        if (defaultModelInit) {
            modelTypes[defaultModelInit.modelName] = {
                schemaVariableName: defaultModelInit.schemaVariableName,
                filePath,
                methods: {},
                statics: {},
                query: {},
                virtuals: {},
                comments: []
            };
        }
    }
    if (process.env.DEBUG) {
        const schemaNames = Object.keys(modelTypes);
        if (schemaNames.length === 0)
            console.warn(`tsreader: No schema found in file. If a schema exists & is exported, it will still be typed but will use generic types for methods, statics, queries & virtuals`);
        else
            console.log("tsreader: Schemas found: " + schemaNames);
    }
    return modelTypes;
}
const getModelTypes = (modelsPaths, maxCommentDepth = 2) => {
    const project = new ts_morph_1.Project({});
    project.addSourceFilesAtPaths(modelsPaths);
    let allModelTypes = {};
    // TODO: ideally we only parse the files that we know have methods, statics, or virtuals.
    // Would save a lot of time
    modelsPaths.forEach(modelPath => {
        const sourceFile = project.getSourceFileOrThrow(modelPath);
        let modelTypes = initModelTypes(sourceFile, modelPath);
        modelTypes = findTypesInFile(sourceFile, modelTypes);
        modelTypes = findCommentsInFile(sourceFile, modelTypes, maxCommentDepth);
        allModelTypes = Object.assign(Object.assign({}, allModelTypes), modelTypes);
    });
    return allModelTypes;
};
exports.getModelTypes = getModelTypes;
const registerUserTs = (basePath) => {
    var _a;
    let pathToSearch;
    if (basePath.endsWith(".json"))
        pathToSearch = basePath;
    else
        pathToSearch = path_1.default.join(basePath, "**/tsconfig.json");
    const files = glob_1.default.sync(pathToSearch, { ignore: "**/node_modules/**" });
    if (files.length === 0)
        throw new Error(`No tsconfig.json file found at path "${basePath}"`);
    else if (files.length > 1)
        throw new Error(`Multiple tsconfig.json files found. Please specify a more specific --project value.\nPaths found: ${files}`);
    const foundPath = path_1.default.join(process.cwd(), files[0]);
    require("ts-node").register({ transpileOnly: true, project: foundPath });
    // handle path aliases
    const tsConfigString = fs.readFileSync(foundPath, "utf8");
    try {
        const tsConfig = JSON.parse((0, strip_json_comments_1.default)(tsConfigString));
        if ((_a = tsConfig === null || tsConfig === void 0 ? void 0 : tsConfig.compilerOptions) === null || _a === void 0 ? void 0 : _a.paths) {
            const cleanup = require("tsconfig-paths").register({
                baseUrl: process.cwd(),
                paths: tsConfig.compilerOptions.paths
            });
            return cleanup;
        }
        return null;
    }
    catch (_b) {
        throw new Error("Error parsing your tsconfig.json file, please ensure the format is valid");
    }
};
exports.registerUserTs = registerUserTs;
