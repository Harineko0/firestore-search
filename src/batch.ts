// https://github.com/k2wanko/firestore-full-text-search/blob/main/src/utils/firestore.ts

import type {
    Firestore,
    WriteBatch,
    DocumentReference,
    SetOptions,
    Precondition,
    WriteResult,
} from '@google-cloud/firestore';

export type WriteBatch2Options = {
    batch?: WriteBatch;
};

type WriteData<T> = WriteCreateData<T> | WriteSetData<T> | WriteDeleteData;
type WriteCreateData<T> = {
    type: 'create';
    data: Partial<T>;
};
type WriteSetData<T> = {
    type: 'set';
    data: Partial<T>;
    options?: SetOptions;
};
type WriteDeleteData = {
    type: 'delete';
    precondition?: Precondition;
};

function flatDeep(arr: Array<any>, d = 1): Array<any> {
    return d > 0
        ? arr.reduce(
            (acc, val) =>
                acc.concat(Array.isArray(val) ? flatDeep(val, d - 1) : val),
            []
        )
        : arr.slice();
}

// Split more than 500 document writes.
export class WriteBatch2 {
    private readonly externalBatch: WriteBatch | null;
    private db: Firestore;
    private writeDocumentMap = new Map<DocumentReference, WriteData<unknown>>();
    private committed = false;

    constructor(db: Firestore, options?: WriteBatch2Options) {
        this.db = db;
        this.externalBatch = options?.batch ?? null;
        this.committed = false;
    }

    create<T>(documentRef: DocumentReference<T>, data: T): WriteBatch2 {
        this.writeDocumentMap.set(documentRef, {type: 'create', data});
        return this;
    }

    set<T>(
        documentRef: DocumentReference<T>,
        data: Partial<T>,
        options?: SetOptions
    ): WriteBatch2 {
        this.writeDocumentMap.set(documentRef, {type: 'set', data, options});
        return this;
    }

    delete(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        documentRef: DocumentReference<any>,
        precondition?: Precondition
    ): WriteBatch2 {
        this.writeDocumentMap.set(documentRef, {type: 'delete', precondition});
        return this;
    }

    async commit(): Promise<WriteResult[]> {
        if (this.committed) {
            throw new Error('committed');
        }
        this.committed = true;
        const isSmallDocs = this.writeDocumentMap.size <= 499;
        let currentBatch = isSmallDocs
            ? this.externalBatch ?? this.db.batch()
            : this.db.batch();
        const batchs: WriteBatch[] = [currentBatch];
        let i = 0;
        this.writeDocumentMap.forEach((data, ref) => {
            switch (data.type) {
                case 'create':
                    currentBatch.create(ref, data.data);
                    break;
                case 'set':
                    if (data.options) {
                        currentBatch.set(ref, data.data, data.options);
                    } else {
                        currentBatch.set(ref, data.data);
                    }
                    break;
                case 'delete':
                    currentBatch.delete(ref, data.precondition);
                    break;
            }

            if (i % 500 === 0) {
                currentBatch = this.db.batch();
                batchs.push(currentBatch);
            }

            i++;
        });

        if (isSmallDocs && this.externalBatch && batchs.length === 1) {
            return [];
        }

        if (isSmallDocs && this.externalBatch) {
            batchs.shift();
        }

        const results = await Promise.all(batchs.map(batch => batch.commit()));
        return flatDeep(results);
    }
}