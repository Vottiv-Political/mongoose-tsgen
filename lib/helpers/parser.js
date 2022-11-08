"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSchemas = exports.parseSchema = exports.getParseKeyFn = exports.convertBaseTypeToTs = exports.parseFunctions = exports.convertToSingular = exports.convertFuncSignatureToType = exports.getShouldLeanIncludeVirtuals = void 0;
const tslib_1 = require("tslib");
const mongoose_1 = tslib_1.__importDefault(require("mongoose"));
const flat_1 = tslib_1.__importStar(require("flat"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const templates = tslib_1.__importStar(require("./templates"));
const getShouldLeanIncludeVirtuals = (schema) => {
    var _a, _b;
    // Check the toObject options to determine if virtual property should be included.
    // See https://mongoosejs.com/docs/api.html#document_Document-toObject for toObject option documentation.
    const toObjectOptions = (_b = (_a = schema.options) === null || _a === void 0 ? void 0 : _a.toObject) !== null && _b !== void 0 ? _b : {};
    if ((!toObjectOptions.virtuals && !toObjectOptions.getters) ||
        (toObjectOptions.virtuals === false && toObjectOptions.getters === true))
        return false;
    return true;
};
exports.getShouldLeanIncludeVirtuals = getShouldLeanIncludeVirtuals;
const formatKeyEntry = ({ key, val, isOptional = false, newline = true }) => {
    let line = "";
    if (key) {
        // If the key contains any special characters, we need to wrap it in quotes
        line += /^\w*$/.test(key) ? key : JSON.stringify(key);
        if (isOptional)
            line += "?";
        line += ": ";
    }
    line += val + ";";
    if (newline)
        line += "\n";
    return line;
};
const convertFuncSignatureToType = (funcSignature, funcType, modelName) => {
    var _a;
    const [, params, returnType] = (_a = funcSignature.match(/\((?:this: \w*(?:, )?)?(.*)\) => (.*)/)) !== null && _a !== void 0 ? _a : [];
    let type;
    if (funcType === "query") {
        type = `(this: ${modelName}Query${(params === null || params === void 0 ? void 0 : params.length) > 0 ? ", " + params : ""}) => ${modelName}Query`;
    }
    else if (funcType === "methods") {
        type = `(this: ${modelName}Document${(params === null || params === void 0 ? void 0 : params.length) > 0 ? ", " + params : ""}) => ${returnType !== null && returnType !== void 0 ? returnType : "any"}`;
    }
    else {
        type = `(this: ${modelName}Model${(params === null || params === void 0 ? void 0 : params.length) > 0 ? ", " + params : ""}) => ${returnType !== null && returnType !== void 0 ? returnType : "any"}`;
    }
    return type;
};
exports.convertFuncSignatureToType = convertFuncSignatureToType;
const convertToSingular = (str) => {
    if (str.endsWith("sses")) {
        // https://github.com/francescov1/mongoose-tsgen/issues/79
        return str.slice(0, -2);
    }
    if (str.endsWith("s") && !str.endsWith("ss")) {
        return str.slice(0, -1);
    }
    return str;
};
exports.convertToSingular = convertToSingular;
const getSubDocName = (path, modelName = "") => {
    const subDocName = modelName +
        path
            .split(".")
            .map((p) => p[0].toUpperCase() + p.slice(1))
            .join("");
    return (0, exports.convertToSingular)(subDocName);
};
// TODO: this could be moved to the generator too, not really relevant to parsing
const parseFunctions = (funcs, modelName, funcType) => {
    let interfaceString = "";
    Object.keys(funcs).forEach(key => {
        if (["initializeTimestamps"].includes(key))
            return;
        const funcSignature = "(...args: any[]) => any";
        const type = (0, exports.convertFuncSignatureToType)(funcSignature, funcType, modelName);
        interfaceString += formatKeyEntry({ key, val: type });
    });
    return interfaceString;
};
exports.parseFunctions = parseFunctions;
const BASE_TYPES = [
    Object,
    String,
    "String",
    Number,
    "Number",
    Boolean,
    "Boolean",
    Date,
    "Date",
    Buffer,
    "Buffer",
    mongoose_1.default.Types.Buffer,
    mongoose_1.default.Schema.Types.Buffer,
    mongoose_1.default.Schema.Types.ObjectId,
    mongoose_1.default.Types.ObjectId,
    mongoose_1.default.Types.Decimal128,
    mongoose_1.default.Schema.Types.Decimal128
];
const convertBaseTypeToTs = (key, val, isDocument, noMongoose = false) => {
    var _a, _b, _c;
    // NOTE: ideally we check actual type of value to ensure its Schema.Types.Mixed (the same way we do with Schema.Types.ObjectId),
    // but this doesnt seem to work for some reason
    // {} is treated as Mixed
    if (val.schemaName === "Mixed" ||
        ((_a = val.type) === null || _a === void 0 ? void 0 : _a.schemaName) === "Mixed" ||
        (val.constructor === Object && lodash_1.default.isEmpty(val)) ||
        (((_b = val.type) === null || _b === void 0 ? void 0 : _b.constructor) === Object && lodash_1.default.isEmpty(val.type))) {
        return "any";
    }
    const mongooseType = val.type === Map ? val.of : val.type;
    switch (mongooseType) {
        case String:
        case "String":
            if (((_c = val.enum) === null || _c === void 0 ? void 0 : _c.length) > 0) {
                const includesNull = val.enum.includes(null);
                const enumValues = val.enum.filter((str) => str !== null);
                let enumString = `"` + enumValues.join(`" | "`) + `"`;
                if (includesNull)
                    enumString += ` | null`;
                return enumString;
            }
            return "string";
        case Number:
        case "Number":
            return key === "__v" ? undefined : "number";
        case mongoose_1.default.Schema.Types.Decimal128:
        case mongoose_1.default.Types.Decimal128:
            return isDocument ? "mongoose.Types.Decimal128" : "number";
        case Boolean:
        case "Boolean":
            return "boolean";
        case Date:
        case "Date":
            return "Date";
        case mongoose_1.default.Types.Buffer:
        case mongoose_1.default.Schema.Types.Buffer:
        case Buffer:
        case "Buffer":
            return isDocument ? "mongoose.Types.Buffer" : "Buffer";
        case mongoose_1.default.Schema.Types.ObjectId:
        case mongoose_1.default.Types.ObjectId:
        case "ObjectId": // _id fields have type set to the string "ObjectId"
            return noMongoose ? "string" : "mongoose.Types.ObjectId";
        case Object:
            return "any";
        default:
            // this indicates to the parent func that this type is nested and we need to traverse one level deeper
            return "{}";
    }
};
exports.convertBaseTypeToTs = convertBaseTypeToTs;
const parseChildSchemas = ({ schema, isDocument, noMongoose, modelName }) => {
    const flatSchemaTree = (0, flat_1.default)(schema.tree, { safe: true });
    let childInterfaces = "";
    const processChild = (rootPath) => {
        return (child) => {
            const path = child.model.path;
            const isSubdocArray = child.model.$isArraySubdocument;
            const name = getSubDocName(path, rootPath);
            child.schema._isReplacedWithSchema = true;
            child.schema._inferredInterfaceName = name;
            child.schema._isSubdocArray = isSubdocArray;
            const requiredValuePath = `${path}.required`;
            if (requiredValuePath in flatSchemaTree && flatSchemaTree[requiredValuePath] === true) {
                child.schema.required = true;
            }
            /**
             * for subdocument arrays, mongoose supports passing `default: undefined` to disable the default empty array created.
             * here we indicate this on the child schema using _isDefaultSetToUndefined so that the parser properly sets the `isOptional` flag
             */
            if (isSubdocArray) {
                const defaultValuePath = `${path}.default`;
                if (defaultValuePath in flatSchemaTree && flatSchemaTree[defaultValuePath] === undefined) {
                    child.schema._isDefaultSetToUndefined = true;
                }
            }
            flatSchemaTree[path] = isSubdocArray ? [child.schema] : child.schema;
            // since we now will process this child by using the schema, we can remove any further nested properties in flatSchemaTree
            for (const key in flatSchemaTree) {
                if (key.startsWith(path) && key.length > path.length && key[path.length] === ".") {
                    delete flatSchemaTree[key];
                }
            }
            let header = "";
            if (isDocument)
                header += isSubdocArray ?
                    templates.getSubdocumentDocs(rootPath, path) :
                    templates.getDocumentDocs(rootPath);
            else
                header += templates.getLeanDocs(rootPath, name);
            header += "\nexport ";
            if (isDocument) {
                header += `type ${name}Document = `;
                if (isSubdocArray) {
                    header += "mongoose.Types.Subdocument";
                }
                // not sure why schema doesnt have `tree` property for typings
                else {
                    let _idType;
                    // get type of _id to pass to mongoose.Document
                    // this is likely unecessary, since non-subdocs are not allowed to have option _id: false (https://mongoosejs.com/docs/guide.html#_id)
                    if (schema.tree._id)
                        _idType = (0, exports.convertBaseTypeToTs)("_id", schema.tree._id, true, noMongoose);
                    // TODO: this should extend `${name}Methods` like normal docs, but generator will only have methods, statics, etc. under the model name, not the subdoc model name
                    // so after this is generated, we should do a pass and see if there are any child schemas that have non-subdoc definitions.
                    // or could just wait until we dont need duplicate subdoc versions of docs (use the same one for both embedded doc and non-subdoc)
                    header += `mongoose.Document<${_idType !== null && _idType !== void 0 ? _idType : "never"}>`;
                }
                header += " & {\n";
            }
            else
                header += `type ${name} = {\n`;
            // TODO: this should not circularly call parseSchema
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            childInterfaces += (0, exports.parseSchema)({
                schema: child.schema,
                modelName: name,
                header,
                isDocument,
                footer: `}\n\n`,
                noMongoose,
                shouldLeanIncludeVirtuals: (0, exports.getShouldLeanIncludeVirtuals)(child.schema)
            });
        };
    };
    schema.childSchemas.forEach(processChild(modelName));
    const schemaTree = (0, flat_1.unflatten)(flatSchemaTree);
    schema.tree = schemaTree;
    return childInterfaces;
};
const getParseKeyFn = (isDocument, shouldLeanIncludeVirtuals, noMongoose) => {
    return (key, valOriginal) => {
        var _a;
        // if the value is an object, we need to deepClone it to ensure changes to `val` aren't persisted in parent function
        let val = lodash_1.default.isPlainObject(valOriginal) ? lodash_1.default.cloneDeep(valOriginal) : valOriginal;
        let valType;
        const requiredValue = Array.isArray(val.required) ? val.required[0] : val.required;
        let isOptional = requiredValue !== true;
        let isArray = Array.isArray(val);
        let isUntypedArray = false;
        let isMapOfArray = false;
        /**
         * If _isDefaultSetToUndefined is set, it means this is a subdoc array with `default: undefined`, indicating that mongoose will not automatically
         * assign an empty array to the value. Therefore, isOptional = true. In other cases, isOptional is false since the field will be automatically initialized
         * with an empty array
         */
        const isArrayOuterDefaultSetToUndefined = Boolean(val._isDefaultSetToUndefined);
        // this means its a subdoc
        if (isArray) {
            val = val[0];
            if (val === undefined && (val === null || val === void 0 ? void 0 : val.type) === undefined) {
                isUntypedArray = true;
                isOptional = isArrayOuterDefaultSetToUndefined !== null && isArrayOuterDefaultSetToUndefined !== void 0 ? isArrayOuterDefaultSetToUndefined : false;
            }
            else {
                isOptional = (_a = val._isDefaultSetToUndefined) !== null && _a !== void 0 ? _a : false;
            }
        }
        else if (Array.isArray(val.type)) {
            val.type = val.type[0];
            isArray = true;
            if (val.type === undefined) {
                isUntypedArray = true;
                isOptional = isArrayOuterDefaultSetToUndefined !== null && isArrayOuterDefaultSetToUndefined !== void 0 ? isArrayOuterDefaultSetToUndefined : false;
            }
            else if (val.type.type) {
                /**
                 * Arrays can also take the following format.
                 * This is used when validation needs to be done on both the element itself and the full array.
                 * This format implies `required: true`.
                 *
                 * ```
                 * friends: {
                 *   type: [
                 *     {
                 *       type: Schema.Types.ObjectId,
                 *       ref: "User",
                 *       validate: [
                 *         function(userId: mongoose.Types.ObjectId) { return !this.friends.includes(userId); }
                 *       ]
                 *     }
                 *   ],
                 *   validate: [function(val) { return val.length <= 3; } ]
                 * }
                 * ```
                 */
                if (val.type.ref)
                    val.ref = val.type.ref;
                val.type = val.type.type;
                isOptional = false;
            }
            else {
                // 2dsphere index is a special edge case which does not have an inherent default value of []
                isOptional = val.index === "2dsphere" ? true : isArrayOuterDefaultSetToUndefined;
            }
        }
        if (BASE_TYPES.includes(val))
            val = { type: val };
        const isMap = (val === null || val === void 0 ? void 0 : val.type) === Map;
        // // handles maps of arrays as per https://github.com/francescov1/mongoose-tsgen/issues/63
        if (isMap && Array.isArray(val.of)) {
            val.of = val.of[0];
            isMapOfArray = true;
            isArray = true;
        }
        if (val === Array || (val === null || val === void 0 ? void 0 : val.type) === Array || isUntypedArray) {
            // treat Array constructor and [] as an Array<Mixed>
            isArray = true;
            valType = "any";
            isOptional = isArrayOuterDefaultSetToUndefined !== null && isArrayOuterDefaultSetToUndefined !== void 0 ? isArrayOuterDefaultSetToUndefined : false;
        }
        else if (val._inferredInterfaceName) {
            valType = val._inferredInterfaceName + (isDocument ? "Document" : "");
        }
        else if (val.path && val.path && val.setters && val.getters) {
            // check for virtual properties
            // skip id property
            if (key === "id")
                return "";
            // if not lean doc and lean docs shouldnt include virtuals, ignore entry
            if (!isDocument && !shouldLeanIncludeVirtuals)
                return "";
            valType = "any";
            isOptional = false;
        }
        else if (key &&
            [
                "get",
                "set",
                "schemaName",
                "defaultOptions",
                "_checkRequired",
                "_cast",
                "checkRequired",
                "cast",
                "__v"
            ].includes(key)) {
            return "";
        }
        else if (val.ref) {
            let docRef;
            docRef = val.ref.replace(`'`, "");
            if (docRef.includes(".")) {
                docRef = getSubDocName(docRef);
            }
            valType = isDocument ?
                `${docRef}Document["_id"] | ${docRef}Document` :
                `${docRef}["_id"] | ${docRef}`;
        }
        else {
            // _ids are always required
            if (key === "_id")
                isOptional = true;
            const convertedType = (0, exports.convertBaseTypeToTs)(key, val, isDocument, noMongoose);
            // TODO: we should detect nested types from unknown types and handle differently.
            // Currently, if we get an unknown type (ie not handled) then users run into a "max callstack exceeded error"
            if (convertedType === "{}") {
                const nestedSchema = lodash_1.default.cloneDeep(val);
                valType = "{\n";
                const parseKey = (0, exports.getParseKeyFn)(isDocument, shouldLeanIncludeVirtuals, noMongoose);
                Object.keys(nestedSchema).forEach((key) => {
                    valType += parseKey(key, nestedSchema[key]);
                });
                valType += "}";
                isOptional = false;
            }
            else {
                valType = convertedType;
            }
        }
        if (!valType)
            return "";
        if (isMap && !isMapOfArray)
            valType = isDocument ? `mongoose.Types.Map<${valType}>` : `Map<string, ${valType}>`;
        if (isArray) {
            if (isDocument)
                valType = `mongoose.Types.${val._isSubdocArray ? "Document" : ""}Array<` + valType + ">";
            else {
                // if valType includes a space, likely means its a union type (ie "number | string") so lets wrap it in brackets when adding the array to the type
                if (valType.includes(" "))
                    valType = `(${valType})`;
                valType = `${valType}[]`;
            }
        }
        // a little messy, but if we have a map of arrays, we need to wrap the value after adding the array info
        if (isMap && isMapOfArray)
            valType = isDocument ? `mongoose.Types.Map<${valType}>` : `Map<string, ${valType}>`;
        return formatKeyEntry({ key, val: valType, isOptional });
    };
};
exports.getParseKeyFn = getParseKeyFn;
const parseSchema = ({ schema: schemaOriginal, modelName, isDocument, header = "", footer = "", noMongoose = false, shouldLeanIncludeVirtuals }) => {
    var _a;
    let template = "";
    const schema = lodash_1.default.cloneDeep(schemaOriginal);
    if (((_a = schema.childSchemas) === null || _a === void 0 ? void 0 : _a.length) > 0 && modelName) {
        template += parseChildSchemas({ schema, isDocument, noMongoose, modelName });
    }
    template += header;
    const schemaTree = schema.tree;
    const parseKey = (0, exports.getParseKeyFn)(isDocument, shouldLeanIncludeVirtuals, noMongoose);
    Object.keys(schemaTree).forEach((key) => {
        const val = schemaTree[key];
        template += parseKey(key, val);
    });
    template += footer;
    return template;
};
exports.parseSchema = parseSchema;
const loadSchemas = (modelsPaths) => {
    const schemas = {};
    const checkAndRegisterModel = (obj) => {
        if (!(obj === null || obj === void 0 ? void 0 : obj.modelName) || !(obj === null || obj === void 0 ? void 0 : obj.schema))
            return false;
        schemas[obj.modelName] = obj.schema;
        return true;
    };
    modelsPaths.forEach((singleModelPath) => {
        var _a;
        let exportedData;
        try {
            exportedData = require(singleModelPath);
        }
        catch (err) {
            if ((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes(`Cannot find module '${singleModelPath}'`))
                throw new Error(`Could not find a module at path ${singleModelPath}.`);
            else
                throw err;
        }
        const prevSchemaCount = Object.keys(schemas).length;
        // NOTE: This was used to find the most likely names of the model based on the filename, and only check those properties for mongoose models. Now, we check all properties, but this could be used as a "strict" option down the road.
        // we check each file's export object for property names that would commonly export the schema.
        // Here is the priority (using the filename as a starting point to determine model name):
        // default export, model name (ie `User`), model name lowercase (ie `user`), collection name (ie `users`), collection name uppercased (ie `Users`).
        // If none of those exist, we assume the export object is set to the schema directly
        /*
        // if exported data has a default export, use that
        if (checkAndRegisterModel(exportedData.default) || checkAndRegisterModel(exportedData)) return;
    
        // if no default export, look for a property matching file name
        const { name: filenameRoot } = path.parse(singleModelPath);
    
        // capitalize first char
        const modelName = filenameRoot.charAt(0).toUpperCase() + filenameRoot.slice(1);
        const collectionNameUppercased = modelName + "s";
    
        let modelNameLowercase = filenameRoot.endsWith("s") ? filenameRoot.slice(0, -1) : filenameRoot;
        modelNameLowercase = modelNameLowercase.toLowerCase();
    
        const collectionName = modelNameLowercase + "s";
    
        // check likely names that schema would be exported from
        if (
          checkAndRegisterModel(exportedData[modelName]) ||
          checkAndRegisterModel(exportedData[modelNameLowercase]) ||
          checkAndRegisterModel(exportedData[collectionName]) ||
          checkAndRegisterModel(exportedData[collectionNameUppercased])
        )
          return;
        */
        // check if exported object is a model
        checkAndRegisterModel(exportedData);
        // iterate through each exported property, check if val is a schema and add to schemas if so
        for (const obj of Object.values(exportedData)) {
            checkAndRegisterModel(obj);
        }
        const schemaCount = Object.keys(schemas).length - prevSchemaCount;
        if (schemaCount === 0) {
            console.warn(`A module was found at ${singleModelPath}, but no new exported models were found. If this file contains a Mongoose schema, ensure it is exported and its name does not conflict with others.`);
        }
    });
    return schemas;
};
exports.loadSchemas = loadSchemas;
