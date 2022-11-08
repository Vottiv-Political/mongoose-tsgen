"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveFile = exports.generateTypes = exports.getSchemaTypes = exports.createSourceFile = exports.overloadQueryPopulate = exports.addPopulateHelpers = exports.replaceModelTypes = void 0;
const tslib_1 = require("tslib");
const ts_morph_1 = require("ts-morph");
const parser = tslib_1.__importStar(require("./parser"));
const templates = tslib_1.__importStar(require("./templates"));
// this strips comments of special tokens since ts-morph generates jsdoc tokens automatically
const cleanComment = (comment) => {
    return comment
        .replace(/^\/\*\*[^\S\r\n]?/, "")
        .replace(/[^\S\r\n]+\*\s/g, "")
        .replace(/(\n)?[^\S\r\n]+\*\/$/, "");
};
const replaceModelTypes = (sourceFile, modelTypes, schemas) => {
    Object.entries(modelTypes).forEach(([modelName, types]) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        const { methods, statics, query, virtuals, comments } = types;
        // methods
        if (Object.keys(methods).length > 0) {
            (_b = (_a = sourceFile === null || sourceFile === void 0 ? void 0 : sourceFile.getTypeAlias(`${modelName}Methods`)) === null || _a === void 0 ? void 0 : _a.getFirstChildByKind(ts_morph_1.SyntaxKind.TypeLiteral)) === null || _b === void 0 ? void 0 : _b.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertySignature).forEach(prop => {
                const signature = methods[prop.getName()];
                if (signature) {
                    const funcType = parser.convertFuncSignatureToType(signature, "methods", modelName);
                    prop.setType(funcType);
                }
            });
        }
        // statics
        if (Object.keys(statics).length > 0) {
            (_d = (_c = sourceFile === null || sourceFile === void 0 ? void 0 : sourceFile.getTypeAlias(`${modelName}Statics`)) === null || _c === void 0 ? void 0 : _c.getFirstChildByKind(ts_morph_1.SyntaxKind.TypeLiteral)) === null || _d === void 0 ? void 0 : _d.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertySignature).forEach(prop => {
                const signature = statics[prop.getName()];
                if (signature) {
                    const funcType = parser.convertFuncSignatureToType(signature, "statics", modelName);
                    prop.setType(funcType);
                }
            });
        }
        // queries
        if (Object.keys(query).length > 0) {
            (_f = (_e = sourceFile === null || sourceFile === void 0 ? void 0 : sourceFile.getTypeAlias(`${modelName}Queries`)) === null || _e === void 0 ? void 0 : _e.getFirstChildByKind(ts_morph_1.SyntaxKind.TypeLiteral)) === null || _f === void 0 ? void 0 : _f.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertySignature).forEach(prop => {
                const signature = query[prop.getName()];
                if (signature) {
                    const funcType = parser.convertFuncSignatureToType(signature, "query", modelName);
                    prop.setType(funcType);
                }
            });
        }
        // virtuals
        const virtualNames = Object.keys(virtuals);
        if (virtualNames.length > 0) {
            const documentProperties = (_j = (_h = (_g = sourceFile === null || sourceFile === void 0 ? void 0 : sourceFile.getTypeAlias(`${modelName}Document`)) === null || _g === void 0 ? void 0 : _g.getFirstChildByKind(ts_morph_1.SyntaxKind.IntersectionType)) === null || _h === void 0 ? void 0 : _h.getFirstChildByKind(ts_morph_1.SyntaxKind.TypeLiteral)) === null || _j === void 0 ? void 0 : _j.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertySignature);
            const leanProperties = parser.getShouldLeanIncludeVirtuals(schemas[modelName]) &&
                ((_l = (_k = sourceFile === null || sourceFile === void 0 ? void 0 : sourceFile.getTypeAlias(`${modelName}`)) === null || _k === void 0 ? void 0 : _k.getFirstChildByKind(ts_morph_1.SyntaxKind.TypeLiteral)) === null || _l === void 0 ? void 0 : _l.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertySignature));
            if (documentProperties || leanProperties) {
                virtualNames.forEach(virtualName => {
                    const virtualNameComponents = virtualName.split(".");
                    let nestedDocProps;
                    let nestedLeanProps;
                    virtualNameComponents.forEach((nameComponent, i) => {
                        var _a, _b, _c, _d;
                        if (i === virtualNameComponents.length - 1) {
                            if (documentProperties) {
                                const docPropMatch = (nestedDocProps !== null && nestedDocProps !== void 0 ? nestedDocProps : documentProperties).find(prop => prop.getName() === nameComponent);
                                docPropMatch === null || docPropMatch === void 0 ? void 0 : docPropMatch.setType(virtuals[virtualName]);
                            }
                            if (leanProperties) {
                                const leanPropMatch = (nestedLeanProps !== null && nestedLeanProps !== void 0 ? nestedLeanProps : leanProperties).find(prop => prop.getName() === nameComponent);
                                leanPropMatch === null || leanPropMatch === void 0 ? void 0 : leanPropMatch.setType(virtuals[virtualName]);
                            }
                            return;
                        }
                        if (documentProperties) {
                            nestedDocProps = (_b = (_a = (nestedDocProps !== null && nestedDocProps !== void 0 ? nestedDocProps : documentProperties)
                                .find(prop => prop.getName() === nameComponent)) === null || _a === void 0 ? void 0 : _a.getFirstChildByKind(ts_morph_1.SyntaxKind.TypeLiteral)) === null || _b === void 0 ? void 0 : _b.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertySignature);
                        }
                        if (leanProperties) {
                            nestedLeanProps = (_d = (_c = (nestedLeanProps !== null && nestedLeanProps !== void 0 ? nestedLeanProps : leanProperties)
                                .find(prop => prop.getName() === nameComponent)) === null || _c === void 0 ? void 0 : _c.getFirstChildByKind(ts_morph_1.SyntaxKind.TypeLiteral)) === null || _d === void 0 ? void 0 : _d.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertySignature);
                        }
                    });
                });
            }
        }
        // TODO: this section is almost identical to the virtual property section above, refactor
        if (comments.length > 0) {
            const documentProperties = (_p = (_o = (_m = sourceFile === null || sourceFile === void 0 ? void 0 : sourceFile.getTypeAlias(`${modelName}Document`)) === null || _m === void 0 ? void 0 : _m.getFirstChildByKind(ts_morph_1.SyntaxKind.IntersectionType)) === null || _o === void 0 ? void 0 : _o.getFirstChildByKind(ts_morph_1.SyntaxKind.TypeLiteral)) === null || _p === void 0 ? void 0 : _p.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertySignature);
            const leanProperties = (_r = (_q = sourceFile === null || sourceFile === void 0 ? void 0 : sourceFile.getTypeAlias(`${modelName}`)) === null || _q === void 0 ? void 0 : _q.getFirstChildByKind(ts_morph_1.SyntaxKind.TypeLiteral)) === null || _r === void 0 ? void 0 : _r.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertySignature);
            comments.forEach(({ path, comment }) => {
                const pathComponents = path.split(".");
                let nestedDocProps;
                let nestedLeanProps;
                pathComponents.forEach((nameComponent, i) => {
                    var _a, _b, _c, _d;
                    if (i === pathComponents.length - 1) {
                        if (documentProperties) {
                            const docPropMatch = (nestedDocProps !== null && nestedDocProps !== void 0 ? nestedDocProps : documentProperties).find(prop => prop.getName() === nameComponent);
                            docPropMatch === null || docPropMatch === void 0 ? void 0 : docPropMatch.addJsDoc(cleanComment(comment));
                        }
                        if (leanProperties) {
                            const leanPropMatch = (nestedLeanProps !== null && nestedLeanProps !== void 0 ? nestedLeanProps : leanProperties).find(prop => prop.getName() === nameComponent);
                            leanPropMatch === null || leanPropMatch === void 0 ? void 0 : leanPropMatch.addJsDoc(cleanComment(comment));
                        }
                        return;
                    }
                    if (documentProperties) {
                        nestedDocProps = (_b = (_a = (nestedDocProps !== null && nestedDocProps !== void 0 ? nestedDocProps : documentProperties)
                            .find(prop => prop.getName() === nameComponent)) === null || _a === void 0 ? void 0 : _a.getFirstChildByKind(ts_morph_1.SyntaxKind.TypeLiteral)) === null || _b === void 0 ? void 0 : _b.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertySignature);
                    }
                    if (leanProperties) {
                        nestedLeanProps = (_d = (_c = (nestedLeanProps !== null && nestedLeanProps !== void 0 ? nestedLeanProps : leanProperties)
                            .find(prop => prop.getName() === nameComponent)) === null || _c === void 0 ? void 0 : _c.getFirstChildByKind(ts_morph_1.SyntaxKind.TypeLiteral)) === null || _d === void 0 ? void 0 : _d.getChildrenOfKind(ts_morph_1.SyntaxKind.PropertySignature);
                    }
                });
            });
        }
    });
};
exports.replaceModelTypes = replaceModelTypes;
const addPopulateHelpers = (sourceFile) => {
    sourceFile.addStatements("\n" + templates.POPULATE_HELPERS);
};
exports.addPopulateHelpers = addPopulateHelpers;
const overloadQueryPopulate = (sourceFile) => {
    sourceFile.addStatements("\n" + templates.QUERY_POPULATE);
};
exports.overloadQueryPopulate = overloadQueryPopulate;
const createSourceFile = (genPath) => {
    const project = new ts_morph_1.Project();
    const sourceFile = project.createSourceFile(genPath, "", { overwrite: true });
    return sourceFile;
};
exports.createSourceFile = createSourceFile;
const getSchemaTypes = ({ schema, modelName }) => {
    var _a;
    let schemaTypes = "";
    // add type alias to modelName so that it can be imported without clashing with the mongoose model
    schemaTypes += templates.getObjectDocs(modelName);
    schemaTypes += `\nexport type ${modelName}Object = ${modelName}\n\n`;
    schemaTypes += templates.getQueryDocs();
    schemaTypes += `\nexport type ${modelName}Query = mongoose.Query<any, ${modelName}Document, ${modelName}Queries> & ${modelName}Queries\n\n`;
    schemaTypes += templates.getQueryHelpersDocs(modelName);
    schemaTypes += `\nexport type ${modelName}Queries = {\n`;
    schemaTypes += parser.parseFunctions((_a = schema.query) !== null && _a !== void 0 ? _a : {}, modelName, "query");
    schemaTypes += "}\n";
    schemaTypes += `\nexport type ${modelName}Methods = {\n`;
    schemaTypes += parser.parseFunctions(schema.methods, modelName, "methods");
    schemaTypes += "}\n";
    schemaTypes += `\nexport type ${modelName}Statics = {\n`;
    schemaTypes += parser.parseFunctions(schema.statics, modelName, "statics");
    schemaTypes += "}\n\n";
    const modelExtend = `mongoose.Model<${modelName}Document, ${modelName}Queries>`;
    schemaTypes += templates.getModelDocs(modelName);
    schemaTypes += `\nexport type ${modelName}Model = ${modelExtend} & ${modelName}Statics\n\n`;
    schemaTypes += templates.getSchemaDocs(modelName);
    schemaTypes += `\nexport type ${modelName}Schema = mongoose.Schema<${modelName}Document, ${modelName}Model, ${modelName}Methods, ${modelName}Queries>\n\n`;
    return schemaTypes;
};
exports.getSchemaTypes = getSchemaTypes;
const generateTypes = ({ sourceFile, schemas, imports = [], noMongoose, namespace, global }) => {
    sourceFile.addStatements(writer => {
        writer.write(templates.MAIN_HEADER).blankLine();
        // mongoose import
        if (!noMongoose)
            writer.write(templates.MONGOOSE_IMPORT);
        // Global and namespace
        if (global)
            writer.write(templates.GLOBAL_NAMESPACE);
        if (namespace)
            writer.write(templates.CUSTOM_NAMESPACE(namespace));
        // custom, user-defined imports
        if (imports.length > 0)
            writer.write(imports.join("\n"));
        writer.blankLine();
        // writer.write("if (true)").block(() => {
        //     writer.write("something;");
        // });
        Object.keys(schemas).forEach(modelName => {
            const schema = schemas[modelName];
            const shouldLeanIncludeVirtuals = parser.getShouldLeanIncludeVirtuals(schema);
            // passing modelName causes childSchemas to be processed
            const leanInterfaceStr = parser.parseSchema({
                schema,
                modelName,
                isDocument: false,
                header: templates.getLeanDocs(modelName) + `\nexport type ${modelName} = {\n`,
                footer: "}",
                noMongoose,
                shouldLeanIncludeVirtuals
            });
            writer.write(leanInterfaceStr).blankLine();
            // if noMongoose, skip adding document types
            if (noMongoose)
                return;
            // get type of _id to pass to mongoose.Document
            // not sure why schema doesnt have `tree` property for typings
            let _idType;
            if (schema.tree._id) {
                _idType = parser.convertBaseTypeToTs("_id", schema.tree._id, true, noMongoose);
            }
            const mongooseDocExtend = `mongoose.Document<${_idType !== null && _idType !== void 0 ? _idType : "never"}, ${modelName}Queries>`;
            let documentInterfaceStr = "";
            documentInterfaceStr += (0, exports.getSchemaTypes)({ schema, modelName });
            documentInterfaceStr += parser.parseSchema({
                schema,
                modelName,
                isDocument: true,
                header: templates.getDocumentDocs(modelName) +
                    `\nexport type ${modelName}Document = ${mongooseDocExtend} & ${modelName}Methods & {\n`,
                footer: "}",
                shouldLeanIncludeVirtuals
            });
            writer.write(documentInterfaceStr).blankLine();
        });
        if (namespace)
            writer.write("}");
        if (global)
            writer.write("}");
    });
    return sourceFile;
};
exports.generateTypes = generateTypes;
const saveFile = ({ sourceFile }) => {
    try {
        sourceFile.saveSync();
        // fs.writeFileSync(genFilePath, sourceFile.getFullText(), "utf8");
    }
    catch (err) {
        // if folder doesnt exist, create and then write again
        // if (err.message.includes("ENOENT: no such file or directory")) {
        //   console.log(`Path ${genFilePath} not found; creating...`);
        //   const { dir } = path.parse(genFilePath);
        //   mkdirp.sync(dir);
        //   fs.writeFileSync(genFilePath, sourceFile.getFullText(), "utf8");
        // }
        console.error(err);
        throw err;
    }
};
exports.saveFile = saveFile;
