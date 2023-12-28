import CommitDateInput from './git-date-input';
import TimezoneInput from './timezone-input';
import {
    StartMessage,
    EndMessage,
    StartRequestMessage,
} from '../types/messages';
import getPresets from './presets';

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

        authorDateInput.initialValue = amend
            ? data.headDates.author
            : undefined;
        commitDateInput.initialValue = undefined;
        submitButton.textContent = amend ? 'Amend' : 'Commit';

        const presets = getPresets(data, amendCheck.checked);
        authorDateInput.presets = presets;
        commitDateInput.presets = presets;
    });

    if (data.isRebase || !data.hasHead) {
        amendCheck.closest('div')!.style.display = 'none';
    }

    if (data.isRebase) {
        const defaultCommitDate = data.rebaseHasChanges
            ? undefined
            : data.rebaseHeadDates.commit;
        authorDateInput.initialValue = data.rebaseADisNow
            ? defaultCommitDate
            : data.rebaseHeadDates.author;
        commitDateInput.initialValue = data.rebaseCDisAD
            ? data.rebaseHeadDates.author
            : defaultCommitDate;
        submitButton.textContent = 'Continue';
    }

    const presets = getPresets(data, false);
    authorDateInput.presets = presets;
    commitDateInput.presets = presets;
});

vscode.postMessage({
    type: 'start-request',
} as StartRequestMessage);
