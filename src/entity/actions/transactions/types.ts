import type {
  DynamoDBDocumentClient,
  TransactGetCommandInput,
  TransactWriteCommandInput
} from '@aws-sdk/lib-dynamodb'

import type { EntityAction, EntityV2 } from '~/entity/index.js'

type GetTransaction = NonNullable<TransactGetCommandInput['TransactItems']>[number]

export type GetTransactionParams = GetTransaction['Get']

export type GetTransactionItemType = keyof GetTransaction

type WriteTransaction = NonNullable<TransactWriteCommandInput['TransactItems']>[number]

export type WriteTransactionItemType = keyof WriteTransaction

export interface BaseTransaction {
  get: () => {
    documentClient: DynamoDBDocumentClient
    type: GetTransactionItemType | WriteTransactionItemType
    params: Record<string, unknown> | undefined
  }
}

export interface WriteItemTransaction<
  ENTITY extends EntityV2 = EntityV2,
  TRANSACTION_ITEM_TYPE extends WriteTransactionItemType = WriteTransactionItemType
> extends BaseTransaction,
    EntityAction<ENTITY> {
  get: () => {
    documentClient: DynamoDBDocumentClient
    type: TRANSACTION_ITEM_TYPE
    params: WriteTransaction[TRANSACTION_ITEM_TYPE]
  }
}
