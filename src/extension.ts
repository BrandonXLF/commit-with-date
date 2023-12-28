import * as vscode from 'vscode';
import * as git from './types/git';
import { exec } from 'child_process';
import * as fs from 'fs';
import { StartMessage, WebviewMessage } from './types/messages';
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

async function isCommitDateAuthorDate(repo: git.Repository) {
    const flagUri = vscode.Uri.joinPath(
        repo.rootUri,
        '.git',
        'rebase-merge',
        'cdate_is_adate',
    );

    try {
        await fs.promises.access(flagUri.fsPath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function getStartMessage(repo: git.Repository) {
    const hasHead = !!repo.state.HEAD?.commit;
    const isRebase = !!repo.state.rebaseCommit;

    return {
        hasHead,
        headAuthorDate: hasHead
            ? await execRepoCmd(
                  repo,
                  `git show -s --format="%aI" ${repo.state.HEAD.commit}`,
              )
            : undefined,
        headCommitDate: hasHead
            ? await execRepoCmd(
                  repo,
                  `git show -s --format="%cI" ${repo.state.HEAD.commit}`,
              )
            : undefined,
        isRebase,
        rebaseCDisAD: isRebase ? await isCommitDateAuthorDate(repo) : undefined,
    } as StartMessage;
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
				<template id="content">
					<h1>Commit with Date</h1>
					<div>
						<label class="checkbox-label">
							<input type="checkbox" id="amend">
							<span>Amend</span>
						</label>
					</div>
					<commit-date-input id="author" label="Author Date"></commit-date-input>
                    <commit-date-input id="commit" label="Commit Date"></commit-date-input>
					<div id="rebase-warning">
						WARNING: The commit date will be updated for all subsequent commits
                        unless <code>--committer-date-is-author-date</code> is used.
					</div>
					<div>
						<button id="submit">Commit</button>
					</div>
				</template>
				<div id="loading">Loading...</div>
				<script type="module" src="${scriptURI}"></script>
			</body>
		</html>
	`;

    let amend = false;

    await new Promise<void>((resolve, reject) => {
        panel.webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
            if (msg.type === 'start-request') {
                panel.webview.postMessage(await getStartMessage(repo));
                return;
            }

            process.env.GIT_AUTHOR_DATE = msg.authorDate;
            process.env.GIT_COMMITTER_DATE = msg.commitDate;
            amend = msg.amend;

            resolve();
        });

        panel.onDidDispose(() => reject());
    });

    panel.dispose();

    if (amend)
        await execRepoCmd(
            repo,
            `git commit -o --no-edit --amend --date="${process.env.GIT_AUTHOR_DATE}"`,
        );

    await vscode.commands.executeCommand(
        amend ? 'git.commitAmend' : 'git.commit',
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
