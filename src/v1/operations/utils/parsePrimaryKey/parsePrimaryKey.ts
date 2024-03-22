import type { EntityV2 } from 'v1/entity/class'
import type { Schema } from 'v1/schema/schema'
import type { Extension } from 'v1/schema/attributes'
import type { ParsedValue } from 'v1/schema/actions/parse'
import type { PrimaryKey } from 'v1/table'
import { validatorsByPrimitiveType } from 'v1/utils/validation'
import { DynamoDBToolboxError } from 'v1/errors/dynamoDBToolboxError'

export const parsePrimaryKey = <ENTITY extends EntityV2, EXTENSION extends Extension>(
  entity: ENTITY,
  keyInput: ParsedValue<Schema, { operation: 'key'; extension: EXTENSION }>
): PrimaryKey<ENTITY['table']> => {
  const { table } = entity
  const { partitionKey, sortKey } = table

  const primaryKey: ParsedValue<Schema, { operation: 'key'; extension: EXTENSION }> = {}

  const partitionKeyValidator = validatorsByPrimitiveType[partitionKey.type]
  const partitionKeyValue = keyInput[partitionKey.name]

  if (partitionKeyValidator(partitionKeyValue)) {
    /**
     * @debt type "TODO: Make validator act as primitive typeguard"
     */
    primaryKey[partitionKey.name] = partitionKeyValue as number | string | Buffer
  } else {
    throw new DynamoDBToolboxError('operations.parsePrimaryKey.invalidKeyPart', {
      message: `Invalid partition key: ${partitionKey.name}`,
      path: partitionKey.name,
      payload: {
        expected: partitionKey.type,
        received: partitionKeyValue,
        keyPart: 'partitionKey'
      }
    })
  }

  if (sortKey !== undefined) {
    const sortKeyValidator = validatorsByPrimitiveType[sortKey.type]
    const sortKeyValue = keyInput[sortKey.name]

    if (sortKeyValidator(sortKeyValue)) {
      /**
       * @debt type "TODO: Make validator act as primitive typeguard"
       */
      primaryKey[sortKey.name] = sortKeyValue as number | string | Buffer
    } else {
      throw new DynamoDBToolboxError('operations.parsePrimaryKey.invalidKeyPart', {
        message: `Invalid sort key: ${sortKey.name}`,
        path: sortKey.name,
        payload: {
          expected: sortKey.type,
          received: sortKeyValue,
          keyPart: 'sortKey'
        }
      })
    }
  }

  return primaryKey as PrimaryKey<ENTITY['table']>
}
