import CommitDateInput, { Preset } from './git-date-input';
import TimezoneInput from './timezone-input';
import {
    StartMessage,
    EndMessage,
    StartRequestMessage,
} from '../types/messages';

customElements.define('timezone-input', TimezoneInput);
customElements.define('git-date-input', CommitDateInput);

const vscode = acquireVsCodeApi();
const contentTemplate = document.getElementById(
    'content',
) as HTMLTemplateElement;

let amendCheck: HTMLInputElement;
let submitButton: HTMLButtonElement;
let authorDateInput: CommitDateInput;
let commitDateInput: CommitDateInput;
let data: StartMessage;

function getPresets() {
    let presets: Preset[] = [];

    presets.push({
        label: 'Now',
        value: () => CommitDateInput.now(),
    });

    if (data.hasHead && data.headAuthorDate === data.headCommitDate) {
        presets.push({
            label: 'HEAD Date',
            tooltip: 'HEAD Author and Commit Date',
            value: data.headAuthorDate,
        });
    } else if (data.hasHead) {
        presets.push(
            {
                label: 'HEAD Author Date',
                value: data.headAuthorDate,
            },
            {
                label: 'HEAD Commit Date',
                value: data.headCommitDate,
            },
        );
    }

    return presets;
}

window.addEventListener('message', (e: MessageEvent<StartMessage>) => {
    data = e.data;

    document.getElementById('loading')!.remove();
    document.body.append(contentTemplate.content);

    amendCheck = document.getElementById('amend') as HTMLInputElement;
    submitButton = document.getElementById('submit') as HTMLButtonElement;
    authorDateInput = document.getElementById('author') as CommitDateInput;
    commitDateInput = document.getElementById('commit') as CommitDateInput;

    commitDateInput.alternative = authorDateInput;

    submitButton.addEventListener('click', () => {
        vscode.postMessage({
            authorDate: authorDateInput.value,
            commitDate: commitDateInput.value,
            amend: amendCheck.checked,
        } as EndMessage);
    });

    amendCheck.addEventListener('change', () => {
        if (!data?.hasHead) return;

        let amend = amendCheck.checked;

        authorDateInput.default = amend ? data.headAuthorDate : undefined;
        commitDateInput.default = undefined;
        submitButton.textContent = amend ? 'Amend' : 'Commit';
    });

    if (data.isRebase || !data.hasHead) {
        amendCheck.closest('div')!.style.display = 'none';
    }

    if (data.isRebase) {
        authorDateInput.default = data.headAuthorDate;
        commitDateInput.default = data.rebaseCDisAD
            ? data.headAuthorDate
            : undefined;
        submitButton.textContent = 'Continue';
    }

    if (data.isRebase && !data.rebaseCDisAD) {
        document.getElementById('rebase-warning')!.style.display = 'block';
    }

    const presets = getPresets();
    authorDateInput.presets = presets;
    commitDateInput.presets = presets;
});

vscode.postMessage({
    type: 'start-request',
} as StartRequestMessage);
