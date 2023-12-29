type Dates = {
    author: string;
    commit: string;
};

type HasHead = {
    hasHead: true;
    headDates: Dates;
};

type NoHead = {
    hasHead: false;
    headDates: undefined;
};

type IsRebase = {
    isRebase: true;
    rebaseHeadDates: Dates;
    rebaseADisNow: boolean;
    rebaseCDisAD: boolean;
    rebaseRebaseHeadIsHead: boolean;
    rebaseAmend: boolean;
};

type IsNotRebase = {
    isRebase: false;
    rebaseHeadDates: undefined;
    rebaseADisNow: undefined;
    rebaseCDisAD: undefined;
    rebaseRebaseHeadIsHead: undefined;
    rebaseAmend: undefined;
};

type IsMerge = {
    isMerge: true;
    mergeHeadDates: Dates;
};

type IsNotMerge = {
    isMerge: false;
    mergeHeadDates: undefined;
};

export type StartMessage =
    | (HasHead & (IsRebase | IsNotRebase) & (IsMerge | IsNotMerge))
    | (NoHead & IsNotRebase & IsNotMerge);

export type EndMessage = {
    type: 'end';
    authorDate: string;
    commitDate: string;
    amend: boolean;
    rebaseAmend: boolean;
    editAuthorScript: boolean;
};

export type StartRequestMessage = {
    type: 'start-request';
};

export type WebviewMessage = EndMessage | StartRequestMessage;
