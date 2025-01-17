import type { PutCommandInput } from '@aws-sdk/lib-dynamodb'

import { EntityParser } from '~/entity/actions/parse.js'
import type { EntityV2 } from '~/entity/index.js'

import type { PutItemOptions } from '../options.js'
import type { PutItemInput } from '../types.js'
import { parsePutItemOptions } from './parsePutItemOptions.js'

export const putItemParams = <ENTITY extends EntityV2, OPTIONS extends PutItemOptions<ENTITY>>(
  entity: ENTITY,
  input: PutItemInput<ENTITY>,
  putItemOptions: OPTIONS = {} as OPTIONS
): PutCommandInput => {
  const { item } = entity.build(EntityParser).parse(input)
  const options = parsePutItemOptions(entity, putItemOptions)

  return {
    TableName: entity.table.getName(),
    Item: item,
    ...options
  }
}
