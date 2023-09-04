import { WHRect } from "./annotator-utils";

export interface Highlight {
    id: any;
    type: string;
    color: any;
    rects: { [pageNum: number]: WHRect[] };
}