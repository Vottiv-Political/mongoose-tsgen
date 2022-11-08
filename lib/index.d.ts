import { Command } from "@oclif/command";
declare class MongooseTsgen extends Command {
    static description: string;
    static flags: {
        config: any;
        "dry-run": any;
        global: any;
        namespace: any;
        help: any;
        imports: any;
        "no-format": any;
        output: any;
        project: any;
        debug: any;
        "no-mongoose": any;
        "no-populate-overload": any;
    };
    static args: {
        name: string;
    }[];
    private getConfig;
    run(): Promise<void>;
}
export = MongooseTsgen;
