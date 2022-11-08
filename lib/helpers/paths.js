"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanOutputPath = exports.getModelsPaths = exports.getConfigFromFile = void 0;
const tslib_1 = require("tslib");
const glob_1 = tslib_1.__importDefault(require("glob"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs = tslib_1.__importStar(require("fs"));
const getConfigFromFile = (configPath) => {
    // if no path provided, check root path for mtgen.config.json file. If doesnt exist, return empty object.
    if (!configPath) {
        const defaultPath = path_1.default.join(process.cwd(), "mtgen.config.json");
        if (glob_1.default.sync(defaultPath).length === 0)
            return {};
        configPath = defaultPath;
    }
    const { dir, base } = path_1.default.parse(configPath);
    if (!base)
        configPath = path_1.default.join(dir, "mtgen.config.json");
    else if (base !== "mtgen.config.json")
        throw new Error(`${base} is not a valid config filename. Ensure to provide a path to a mtgen.config.json file or its parent folder.`);
    const rawConfig = fs.readFileSync(configPath, "utf8");
    return JSON.parse(rawConfig);
};
exports.getConfigFromFile = getConfigFromFile;
const getModelsPaths = (basePath) => {
    let modelsPaths;
    if (basePath && basePath !== "") {
        // base path, only check that path
        const { ext } = path_1.default.parse(basePath);
        // if path points to a folder, search for ts files in folder.
        const modelsFolderPath = ext === "" ? path_1.default.join(basePath, "*.ts") : basePath;
        modelsPaths = glob_1.default.sync(modelsFolderPath, {
            ignore: "**/node_modules/**"
        });
        if (modelsPaths.length === 0) {
            throw new Error(`No model files found found at path "${basePath}".`);
        }
        // Put any index files at the end of the array. This ensures that if an index.ts file re-exports models, the parser
        // picks up the models from the individual files and not the index.ts file so that the tsReader will also pick them up properly
        modelsPaths.sort((_a, b) => (b.endsWith("index.ts") ? -1 : 0));
    }
    else {
        // no base path, recursive search files in a `models/` folder
        const modelsFolderPath = `**/models/!(index).ts`;
        modelsPaths = glob_1.default.sync(modelsFolderPath, {
            ignore: "**/node_modules/**"
        });
        if (modelsPaths.length === 0) {
            throw new Error(`Recursive search could not find any model files at "**/models/!(index).ts". Please provide a path to your models folder.`);
        }
    }
    return modelsPaths.map((filename) => path_1.default.join(process.cwd(), filename));
};
exports.getModelsPaths = getModelsPaths;
const cleanOutputPath = (outputPath) => {
    const { dir, base, ext } = path_1.default.parse(outputPath);
    // if `ext` is not empty (meaning outputPath references a file and not a directory) and `ext` != ".ts", means user provided an ivalid filetype (must be a `.ts` file to support typescript interfaces and types)/
    if (ext !== "" && ext !== ".ts") {
        throw new Error("Invalid --ouput argument. Please provide either a folder pah or a Typescript file path.");
    }
    // if extension is empty, means a folder path was provided. Join dir and base to create that path. If filepath was passed, sets to enclosing folder.
    const folderPath = ext === "" ? path_1.default.join(dir, base) : dir;
    const genFileName = ext === "" ? "mongoose.gen.ts" : base;
    return path_1.default.join(folderPath, genFileName);
};
exports.cleanOutputPath = cleanOutputPath;
