export type StartMessage =
    | {
          hasHead: true;
          headAuthorDate: string;
          headCommitDate: string;
          isRebase: true;
          rebaseCDisAD: boolean;
      }
    | {
          hasHead: true;
          headAuthorDate: string;
          headCommitDate: string;
          isRebase: false;
          rebaseCDisAD: undefined;
      }
    | {
          hasHead: false;
          headAuthorDate: undefined;
          headCommitDate: undefined;
          isRebase: false;
          rebaseCDisAD: undefined;
      };

export type EndMessage = {
    type: 'end';
    authorDate: string;
    commitDate: string;
    amend: boolean;
};

export type StartRequestMessage = {
    type: 'start-request';
};

export type WebviewMessage = EndMessage | StartRequestMessage;
