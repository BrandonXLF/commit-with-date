import { StartMessage } from '../types/messages';
import CommitDateInput, { Preset } from './git-date-input';

export default function getPresets(data: StartMessage, amend: boolean) {
    let presets: Preset[] = [];

    presets.push({
        label: 'Now',
        value: () => CommitDateInput.now(),
    });

    if (
        data.isRebase &&
        !data.rebaseRebaseHeadIsHead &&
        data.rebaseHeadDates.author === data.rebaseHeadDates.commit
    ) {
        presets.push({
            label: `Former Date`,
            tooltip: `Author and commit date for the commit being applied to HEAD`,
            value: data.rebaseHeadDates.author,
        });
    } else if (data.isRebase && !data.rebaseRebaseHeadIsHead) {
        presets.push(
            {
                label: `Former Author Date`,
                tooltip: `Author date for the commit being applied to HEAD`,
                value: data.rebaseHeadDates.author,
            },
            {
                label: `Former Commit Date`,
                tooltip: `Commit date for the commit being applied to HEAD`,
                value: data.rebaseHeadDates.commit,
            },
        );
    }

    const headDateLabel = data.isMerge ? 'Our' : amend ? 'Current' : 'HEAD';

    if (data.hasHead && data.headDates.author === data.headDates.commit) {
        presets.push({
            label: `${headDateLabel} Date`,
            tooltip: `${headDateLabel} author and commit date`,
            value: data.headDates.author,
        });
    } else if (data.hasHead) {
        presets.push(
            {
                label: `${headDateLabel} Author Date`,
                value: data.headDates.author,
            },
            {
                label: `${headDateLabel} Commit Date`,
                value: data.headDates.commit,
            },
        );
    }

    if (
        data.isMerge &&
        data.mergeHeadDates.author === data.mergeHeadDates.commit
    ) {
        presets.push({
            label: `Their Date`,
            tooltip: 'Their author and commit date',
            value: data.mergeHeadDates.author,
        });
    } else if (data.isMerge) {
        presets.push(
            {
                label: `Their Author Date`,
                value: data.mergeHeadDates.author,
            },
            {
                label: `Their Commit Date`,
                value: data.mergeHeadDates.commit,
            },
        );
    }

    return presets;
}
