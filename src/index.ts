import * as faqtor from "faqtor";
import * as fs from "fs";
import * as util from "util";
import { spawn } from "child_process";

const readDir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

const pathExists = (p: string) => new Promise<boolean>((resolve) => {
    fs.access(p, (err) => resolve(err === null));
});

export class ErrorDistFolderDoesNotExist extends Error {
    constructor(distPath: string) {
        super(`Distribution path ${distPath} does not exist`);
    }
}

export class ErrorDistFolderIsEmpty extends Error {
    constructor(distPath: string) {
        super(`Distribution folder ${distPath} is empty`);
    }
}

export class ErrorFileIsAbsent extends Error {
    constructor(fileName: string) {
        super(`Distribution file ${fileName} is absent`);
    }
}

export const lock = (distFolder: string = "./dist", lockFile: string = "./dist-lock.json"): faqtor.IFactor => {
    const run = async (): Promise<Error> => {
        try {
            if (!await pathExists(distFolder)) {
                return new ErrorDistFolderDoesNotExist(distFolder);
            }

            const files = await readDir(distFolder).catch((e) => Error(e));
            if (Array.isArray(files)) {
                if (!files.length) {
                    return new ErrorDistFolderIsEmpty(distFolder);
                }
                const r = await writeFile(lockFile, JSON.stringify(files), { encoding: "utf8"})
                    .catch((e) => Error(e));
                if (typeof r !== "undefined") {
                    return r;
                }
            } else {
                return files;
            }
        } catch (e) {
            return Error(e);
        }
        return null;
    }

    return faqtor.func(run);
}

async function runCommand(extCmd: string, ...args: string[]): Promise<Error> {
    return await new Promise((resolve) => {
        const proc = spawn(extCmd, args, {stdio: [process.stdin, process.stdout, process.stderr]});
        proc.on("exit", () => resolve(null));
        proc.on("error", (err) => resolve(err));
    });
}

export const publish = (
    distFolder: string = "./dist",
    lockFile: string = "./dist-lock.json",
    isDebug: boolean = false): faqtor.IFactor => {

    const run = async (): Promise<Error> => {
        try {
            if (!await pathExists(distFolder)) {
                return new ErrorDistFolderDoesNotExist(distFolder);
            }

            const files = await readDir(distFolder).catch((e) => Error(e));
            if (Array.isArray(files)) {
                if (!files.length) {
                    return new ErrorDistFolderIsEmpty(distFolder);
                }
                const tab = {};
                for (const f of files) {
                    tab[f] = true;
                }
                const r = await readFile(lockFile, { encoding: "utf8"})
                    .catch((e) => Error(e));
                if (typeof r === "string") {
                    const lockedFiles = JSON.parse(r) as string[];
                    for (const f of lockedFiles) {
                        if (!(f in tab)) {
                            return new ErrorFileIsAbsent(f);
                        }
                    }
                } else {
                    return r;
                }
                if (!isDebug) {
                    return await runCommand("npm", "publish");
                }
            } else {
                return files;
            }
        } catch (e) {
            return Error(e);
        }
        return null;
    }
    return faqtor.func(run);
}