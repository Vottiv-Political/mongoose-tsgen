"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.format = void 0;
const tslib_1 = require("tslib");
const fs_1 = (0, tslib_1.__importDefault)(require("fs"));
const prettier_1 = (0, tslib_1.__importDefault)(require("prettier"));
// I removed ESLINT usage since it doesnt seem to add much value and adds room for bugs.
// If we want to re-add it, we need to add a check to ensure someone has an eslint config before linting files
// and set eslint as an optional dependency
// import { ESLint } from "eslint";
// NOTE: this could be sped up by formatting the generated file string prior to writing (no need to write file then read it again here and re-write it)
const prettifyFiles = (filePaths) => {
    var _a;
    const config = (_a = prettier_1.default.resolveConfig.sync(process.cwd(), { useCache: true, editorconfig: true })) !== null && _a !== void 0 ? _a : {};
    filePaths.forEach((filePath) => {
        const ogContent = fs_1.default.readFileSync(filePath);
        const formattedContent = prettier_1.default.format(ogContent.toString(), Object.assign(Object.assign({}, config), { parser: "typescript" }));
        fs_1.default.writeFileSync(filePath, formattedContent);
    });
};
// const fixFiles = async (_filePaths: string[]) => {
// const eslint = new ESLint({ fix: true });
// const results = await eslint.lintFiles(filePaths);
// await ESLint.outputFixes(results);
// };
const format = async (filePaths) => {
    prettifyFiles(filePaths);
    // await fixFiles(filePaths);
};
exports.format = format;
