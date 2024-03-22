import type { BatchWriteCommandInput } from '@aws-sdk/lib-dynamodb'

import type { EntityV2 } from 'v1/entity/class'
import { EntityOperation } from 'v1/operations/class'

type BatchWriteItemRequestInputRecord = NonNullable<
  BatchWriteCommandInput['RequestItems']
>[string][number]

export type BatchWriteItemRequestType = keyof BatchWriteItemRequestInputRecord

export type BatchWriteItemRequestInput<
  REQUEST_TYPE extends BatchWriteItemRequestType = BatchWriteItemRequestType
> = NonNullable<BatchWriteItemRequestInputRecord[REQUEST_TYPE]>

export const $requestType = Symbol('$requestType')

export interface BatchWriteItemRequest<
  ENTITY extends EntityV2 = EntityV2,
  REQUEST_TYPE extends BatchWriteItemRequestType = BatchWriteItemRequestType
> extends EntityOperation<ENTITY> {
  params: () => BatchWriteItemRequestInput<REQUEST_TYPE>
  [$requestType]: REQUEST_TYPE
}
