import GitDateInput from './git-date-input';
import TimezoneInput from './timezone-input';
import {
    StartMessage,
    EndMessage,
    StartRequestMessage,
} from '../types/messages';
import getPresets from './presets';
import {
    provideVSCodeDesignSystem,
    vsCodeButton,
} from '@vscode/webview-ui-toolkit';

customElements.define('timezone-input', TimezoneInput);
customElements.define('git-date-input', GitDateInput);

const vscode = acquireVsCodeApi();

let amendCheck = document.getElementById('amend') as HTMLInputElement;
let submitButton = document.getElementById('submit') as HTMLButtonElement;
let authorDateInput = document.getElementById('author') as GitDateInput;
let commitDateInput = document.getElementById('commit') as GitDateInput;

provideVSCodeDesignSystem().register(vsCodeButton());

window.addEventListener('message', (e: MessageEvent<StartMessage>) => {
    let data = e.data;

    if (data.isRebase && data.rebaseADisNow) {
        const reasonSpan = document.createElement('span');
        reasonSpan.innerHTML = '<code>--ignore-date</code> is being used.';
        authorDateInput.alternativeForced = reasonSpan;

        const nowDateInput = document.createElement(
            'git-date-input',
        ) as GitDateInput;
        nowDateInput.label = 'Commit Time';
        authorDateInput.alternative = nowDateInput;

        setInterval(() => {
            nowDateInput.forcedValue = GitDateInput.now();
        }, 500);
    }

    if (data.isRebase && data.rebaseCDisAD) {
        const reasonSpan = document.createElement('span');
        reasonSpan.innerHTML =
            '<code>--committer-date-is-author-date</code> is being used.';
        commitDateInput.alternativeForced = reasonSpan;
    }

    commitDateInput.alternative = authorDateInput;

    submitButton.addEventListener('click', () => {
        vscode.postMessage({
            authorDate: authorDateInput.value,
            commitDate: commitDateInput.value,
            amend: amendCheck.checked,
            rebaseAmend: data.isRebase && data.rebaseAmend,
            editAuthorScript: data.isRebase,
        } as EndMessage);
    });

    amendCheck.addEventListener('change', () => {
        if (!data?.hasHead) return;

        let amend = amendCheck.checked;

        authorDateInput.forcedValue = amend ? data.headDates.author : undefined;
        commitDateInput.forcedValue = undefined;
        submitButton.textContent = amend ? 'Amend' : 'Commit';

        const presets = getPresets(data, amendCheck.checked);
        authorDateInput.presets = presets;
        commitDateInput.presets = presets;
    });

    if (data.isRebase || !data.hasHead) {
        amendCheck.closest('div')!.style.display = 'none';
    }

    if (data.isRebase) {
        authorDateInput.forcedValue = data.rebaseADisNow
            ? undefined
            : data.rebaseHeadDates.author;
        commitDateInput.forcedValue = data.rebaseCDisAD
            ? data.rebaseHeadDates.author
            : undefined;
        submitButton.textContent = 'Continue';
        document.getElementById('rebase-warning')!.style.display = 'block';
    }

    const presets = getPresets(data, false);
    authorDateInput.presets = presets;
    commitDateInput.presets = presets;

    submitButton.textContent = 'Commit';

    amendCheck.disabled = false;
    submitButton.disabled = false;
    authorDateInput.disabled = false;
    commitDateInput.disabled = false;
});

vscode.postMessage({
    type: 'start-request',
} as StartRequestMessage);
