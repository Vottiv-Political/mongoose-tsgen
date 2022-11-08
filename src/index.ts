import { Command, flags } from "@oclif/command";
import cli from "cli-ux";

import * as parser from "./helpers/parser";
import * as tsReader from "./helpers/tsReader";
import * as paths from "./helpers/paths";
import * as formatter from "./helpers/formatter";
import * as generator from "./helpers/generator";

class MongooseTsgen extends Command {
  static description =
    "Generate a Typescript file containing Mongoose Schema typings.\nSpecify the directory of your Mongoose model definitions using `MODEL_PATH`. If left blank, all sub-directories will be searched for `models/*.ts` (ignores `index.ts` files). Files found are expected to export a Mongoose model.";

  static flags = {
    config: flags.string({
      char: "c",
      description:
        "[default: ./] Path of `mtgen.config.json` or its root folder. CLI flag options will take precendence over settings in `mtgen.config.json`."
    }),
    "dry-run": flags.boolean({
      char: "d",
      description: "Print output rather than writing to file."
    }),
    global: flags.boolean({
      char: "g",
      description: "Put in global namespace"
    }),
    namespace: flags.string({
      char: "n",
      description: "Namespace for generated interfaces."
    }),
    help: flags.help({ char: "h" }),
    imports: flags.string({
      char: "i",
      description:
        "Custom import statements to add to the output file. Useful if you use third-party types in your mongoose schema definitions. For multiple imports, specify this flag more than once.",
      multiple: true
    }),
    "no-format": flags.boolean({
      description: "Disable formatting generated files with prettier."
    }),
    output: flags.string({
      char: "o",
      description:
        "[default: ./src/interfaces] Path of output file to write generated typings. If a folder path is passed, the generator will create a `mongoose.gen.ts` file in the specified folder."
    }),
    project: flags.string({
      char: "p",
      description: "[default: ./] Path of `tsconfig.json` or its root folder."
    }),
    debug: flags.boolean({
      description: "Print debug information if anything isn't working"
    }),
    "no-mongoose": flags.boolean({
      description:
        "Don't generate types that reference mongoose (i.e. documents). Replace ObjectId with string."
    }),
    "no-populate-overload": flags.boolean({
      description:
        "Disable augmenting mongoose with Query.populate overloads (the overloads narrow the return type of populated documents queries)."
    })
  };

  // path of mongoose models folder
  static args = [{ name: "model_path" }];

  private getConfig() {
    const { flags: cliFlags, args } = this.parse(MongooseTsgen);

    type FlagConfig = Omit<typeof cliFlags, "config" | "output" | "project"> & {
      output: string;
      project: string;
    };

    const configFileFlags: Partial<FlagConfig> = paths.getConfigFromFile(cliFlags.config);

    // remove "config" since its only used to grab the config file
    delete cliFlags.config;

    // we cant set flags as `default` using the official oclif method since the defaults would overwrite flags provided in the config file.
    // instead, well just set "output" and "project" as default manually if theyre still missing after merge with configFile.
    configFileFlags.output = configFileFlags?.output ?? "./src/interfaces";
    configFileFlags.project = configFileFlags?.project ?? "./";

    return {
      flags: {
        ...configFileFlags,
        ...cliFlags
      } as FlagConfig,
      args
    };
  }

  async run() {
    const { flags, args } = this.getConfig();

    if (flags.debug) {
      this.log("Debug mode enabled");
      process.env.DEBUG = "1";
    }

    cli.action.start("Generating mongoose typescript definitions");

    try {
      const modelsPaths = paths.getModelsPaths(args.model_path);

      const cleanupTs = tsReader.registerUserTs(flags.project);

      const schemas = parser.loadSchemas(modelsPaths);

      const genFilePath = paths.cleanOutputPath(flags.output);
      let sourceFile = generator.createSourceFile(genFilePath);

      const noMongoose = flags["no-mongoose"];
      sourceFile = generator.generateTypes({
        schemas,
        sourceFile,
        imports: flags.imports,
        namespace: flags.namespace,
        global: flags.global,
        noMongoose
      });

      // only get model types (methods, statics, queries & virtuals) if user does not specify `noMongoose`,
      if (noMongoose) {
        this.log("Skipping TS model parsing and sourceFile model type replacement");
      } else {
        const modelTypes = tsReader.getModelTypes(modelsPaths);
        generator.replaceModelTypes(sourceFile, modelTypes, schemas);

        // add populate helpers
        await generator.addPopulateHelpers(sourceFile);
        // add mongoose.Query.populate overloads
        if (!flags["no-populate-overload"]) {
          await generator.overloadQueryPopulate(sourceFile);
        }
      }

      cleanupTs?.();

      cli.action.stop();
      if (flags["dry-run"]) {
        this.log("Dry run detected, generated interfaces will be printed to console:\n");
        this.log(sourceFile.getFullText());
      } else {
        this.log(`Writing interfaces to ${genFilePath}`);

        generator.saveFile({ genFilePath, sourceFile });

        if (!flags["no-format"]) await formatter.format([genFilePath]);
        this.log("Writing complete 🐒");
        process.exit();
      }
    } catch (error) {
      this.error(error as Error, { exit: 1 });
    }
  }
}

export = MongooseTsgen;
