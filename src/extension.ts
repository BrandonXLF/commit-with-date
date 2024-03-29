import * as vscode from 'vscode';
import * as git from './types/git';
import { exec } from 'child_process';
import * as fs from 'fs';
import { EndMessage, StartMessage, WebviewMessage } from './types/messages';
import path from 'path';

function execRepoCmd(repo: git.Repository, cmd: string) {
    return new Promise<string>((resolve) => {
        exec(
            cmd,
            {
                cwd: repo.rootUri.fsPath,
            },
            (_, stdout) => resolve(stdout),
        );
    });
}

async function getDates(repo: git.Repository, hash: string) {
    const out = await execRepoCmd(
        repo,
        `git show -s --format="%aI %cI" ${hash}`,
    );

    if (!out) return;

    const parts = out.trim().split(' ');

    return {
        author: parts[0],
        commit: parts[1],
    };
}

async function getRMFlag(repo: git.Repository, flag: string) {
    const flagUri = vscode.Uri.joinPath(
        repo.rootUri,
        '.git',
        'rebase-merge',
        flag,
    );

    try {
        await fs.promises.access(flagUri.fsPath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function getStartMessage(repo: git.Repository) {
    const mergeDates = await getDates(repo, 'MERGE_HEAD');

    const hasHead = !!repo.state.HEAD?.commit;
    const isRebase = hasHead && !!repo.state.rebaseCommit;
    const isMerge = hasHead && !!mergeDates;

    return {
        hasHead,
        headDates: hasHead
            ? await getDates(repo, repo.state.HEAD.commit)
            : undefined,
        isRebase,
        rebaseHeadDates: isRebase
            ? await getDates(repo, repo.state.rebaseCommit.hash)
            : undefined,
        rebaseADisNow: isRebase
            ? await getRMFlag(repo, 'ignore_date')
            : undefined,
        rebaseCDisAD: isRebase
            ? await getRMFlag(repo, 'cdate_is_adate')
            : undefined,
        rebaseRebaseHeadIsHead: isRebase
            ? repo.state.HEAD.commit === repo.state.rebaseCommit.hash
            : undefined,
        rebaseAmend: isRebase ? await getRMFlag(repo, 'amend') : undefined,
        isMerge,
        mergeHeadDates: isMerge ? mergeDates : undefined,
    } as StartMessage;
}

async function updateAuthorDate(
    repo: git.Repository,
    data: EndMessage,
    authorDate: string,
) {
    if (data.amend || data.rebaseAmend)
        await execRepoCmd(
            repo,
            `git commit -o --no-edit --amend --date="${authorDate}"`,
        );

    if (data.editAuthorScript) {
        try {
            const authorScriptURI = vscode.Uri.joinPath(
                repo.rootUri,
                '.git',
                'rebase-merge',
                'author-script',
            );

            const oldScript = await fs.promises.readFile(
                authorScriptURI.fsPath,
                'utf-8',
            );

            const newScript = oldScript.replace(
                /^GIT_AUTHOR_DATE.+/m,
                "GIT_AUTHOR_DATE='" + authorDate + "'",
            );

            await fs.promises.writeFile(authorScriptURI.fsPath, newScript);
        } catch {
            // Pass
        }
    }
}

async function performCommitWithDate(
    repo: git.Repository,
    ctx: vscode.ExtensionContext,
) {
    const panel = vscode.window.createWebviewPanel(
        'commitWithDate',
        'Commit with Date',
        vscode.ViewColumn.Active,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        },
    );

    panel.iconPath = {
        light: vscode.Uri.joinPath(
            ctx.extensionUri,
            'media',
            'light',
            'icon.svg',
        ),
        dark: vscode.Uri.joinPath(
            ctx.extensionUri,
            'media',
            'dark',
            'icon.svg',
        ),
    };

    const styleURI = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(ctx.extensionUri, 'dist', 'webview.css'),
    );

    const scriptURI = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(ctx.extensionUri, 'dist', 'webview.js'),
    );

    panel.webview.html = `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<link rel="stylesheet" type="text/css" href="${styleURI}" />
			</head>
			<body>
				<h1>Commit with Date</h1>
				<div>
					<label class="checkbox-label">
						<input type="checkbox" id="amend" disabled>
						<span>Amend</span>
					</label>
				</div>
				<git-date-input id="author" label="Author Date" disabled></git-date-input>
				<git-date-input id="commit" label="Commit Date" disabled></git-date-input>
				<div id="rebase-warning">
					NOTE: Commit date will be updated for all modified commits, even those
					that are not manually edited.
				</div>
				<div>
					<vscode-button id="submit" disabled>Loading...</vscode-button>
				</div>
				<script type="module" src="${scriptURI}"></script>
			</body>
		</html>
	`;

    let data = await new Promise<EndMessage>((resolve, reject) => {
        panel.webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
            if (msg.type === 'start-request') {
                panel.webview.postMessage(await getStartMessage(repo));
                return;
            }

            resolve(msg);
        });

        panel.onDidDispose(() => reject());
    });

    panel.dispose();

    process.env.GIT_AUTHOR_DATE = data.authorDate;
    process.env.GIT_COMMITTER_DATE = data.commitDate;

    await updateAuthorDate(repo, data, data.authorDate);

    await vscode.commands.executeCommand(
        data.amend ? 'git.commitAmend' : 'git.commit',
        repo,
    );

    delete process.env.GIT_AUTHOR_DATE;
    delete process.env.GIT_COMMITTER_DATE;
}

async function commitWithDate(
    arg: any,
    git: git.API,
    ctx: vscode.ExtensionContext,
) {
    let repo: git.Repository | null | undefined = git.getRepository(arg);

    if (!repo && git.repositories.length === 1) {
        repo = git.repositories[0];
    }

    if (!repo && git.repositories.length > 1) {
        repo = (
            await vscode.window.showQuickPick(
                git.repositories.map((repo) => ({
                    repo,
                    label: path.basename(repo.rootUri.fsPath),
                })),
                {
                    placeHolder: 'Choose a repository',
                },
            )
        )?.repo;
    }

    if (!repo) {
        vscode.window.showErrorMessage('Could not find git repository.');
        return;
    }

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.SourceControl,
        },
        () => performCommitWithDate(repo!, ctx),
    );
}

export async function activate(ctx: vscode.ExtensionContext) {
    const gitExtension =
        vscode.extensions.getExtension<git.GitExtension>('vscode.git');

    await gitExtension!.activate();

    const git = gitExtension!.exports.getAPI(1);

    ctx.subscriptions.push(
        vscode.commands.registerCommand(
            'commitWithDate.commitWithDate',
            (arg: any) => void commitWithDate(arg, git, ctx),
        ),
    );
}
