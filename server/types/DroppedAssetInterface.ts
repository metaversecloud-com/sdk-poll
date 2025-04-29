import { DroppedAsset } from "@rtsdk/topia";

export interface IDroppedAsset extends DroppedAsset {
  dataObject?: {
    question: string;
    answers: string[];
    displayMode: string;
    options: {};
    results: {};
  };
}
