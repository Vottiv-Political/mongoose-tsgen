import { Command, flags } from "@oclif/command";
declare class MongooseTsgen extends Command {
    static description: string;
    static flags: {
        config: flags.IOptionFlag<string | undefined>;
        "dry-run": import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        global: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        namespace: flags.IOptionFlag<string | undefined>;
        custom_module: flags.IOptionFlag<string | undefined>;
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        imports: flags.IOptionFlag<string[]>;
        "no-format": import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        output: flags.IOptionFlag<string | undefined>;
        project: flags.IOptionFlag<string | undefined>;
        debug: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        "no-mongoose": import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        "no-populate-overload": import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    static args: {
        name: string;
    }[];
    private getConfig;
    run(): Promise<void>;
}
export = MongooseTsgen;
