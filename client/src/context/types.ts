export const SET_HAS_SETUP_BACKEND = "SET_HAS_SETUP_BACKEND";
export const SET_INTERACTIVE_PARAMS = "SET_INTERACTIVE_PARAMS";
export const SET_ERROR = "SET_ERROR";
export const SET_VISITOR_INFO = "SET_VISITOR_INFO";
export const SET_POLL = "SET_POLL";

export type InteractiveParams = {
  assetId: string;
  displayName: string;
  identityId: string;
  interactiveNonce: string;
  interactivePublicKey: string;
  profileId: string;
  sceneDropId: string;
  uniqueName: string;
  urlSlug: string;
  username: string;
  visitorId: string;
};

export interface InitialState {
  error?: string;
  gameState?: object;
  hasInteractiveParams?: boolean;
  hasSetupBackend?: boolean;
  profileId?: string;
  sceneDropId?: string;
  visitor?: { isAdmin: boolean };
  poll?: {
    question: string;
    answers: string[];
    displayMode: string;
    options?: { [key: string]: { votes: number } };
    results?: { [profileId: string]: { answer: number } };
  };
}

export type ActionType = {
  type: string;
  payload: InitialState;
};
