import { CollectionReference, DocumentReference, DocumentData, WriteBatch } from '@google-cloud/firestore';
import firebase from "firebase";
import { SearchQuery } from "./firestore";
export interface IndexEntity {
    __ref: DocumentReference;
    __tokens: Map<string, string | boolean>;
    values: object;
}
export declare const fieldPaths: {
    tokens: string;
    field: string;
};
export declare type Options = {
    n?: number;
};
export declare type SetOptions = {
    batch?: WriteBatch;
    data?: DocumentData;
    fields?: string[];
};
export declare type DeleteOptions = {
    batch?: WriteBatch;
    data?: DocumentData;
    fields?: string[];
};
export declare type SearchOptions = {
    fields?: string[];
    searchByChar?: boolean;
};
export declare type HitData = {
    ref: DocumentReference;
    count: number;
    data: DocumentData;
};
export declare type SearchResult = {
    hits: HitData[];
};
export default class FirestoreNGramSearch {
    private readonly db?;
    private readonly indexRef;
    private readonly isAdmin;
    private readonly n;
    constructor(ref: CollectionReference | firebase.firestore.CollectionReference, options?: Options);
    set(docRef: DocumentReference, options?: SetOptions): Promise<void>;
    delete(docRef: DocumentReference, options?: DeleteOptions): Promise<void>;
    query(): SearchQuery;
}
