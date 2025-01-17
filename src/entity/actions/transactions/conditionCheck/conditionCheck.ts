import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

import type { KeyInput } from '~/entity/actions/parse.js'
import type { Condition } from '~/entity/actions/parseCondition.js'
import { $entity, EntityAction, EntityV2 } from '~/entity/index.js'
import { DynamoDBToolboxError } from '~/errors/index.js'

import type { WriteItemTransaction } from '../types.js'
import { ConditionCheckParams, conditionCheckParams } from './conditionCheckParams/index.js'

export const $key = Symbol('$key')
export type $key = typeof $key

export const $condition = Symbol('$condition')
export type $condition = typeof $condition

export class ConditionCheck<ENTITY extends EntityV2 = EntityV2>
  extends EntityAction<ENTITY>
  implements WriteItemTransaction<ENTITY, 'ConditionCheck'> {
  static actionName = 'conditionCheck' as const

  private [$key]?: KeyInput<ENTITY>
  public key: (keyInput: KeyInput<ENTITY>) => ConditionCheck<ENTITY>
  private [$condition]?: Condition<ENTITY>
  public condition: (keyInput: Condition<ENTITY>) => ConditionCheck<ENTITY>

  constructor(entity: ENTITY, key?: KeyInput<ENTITY>, condition?: Condition<ENTITY>) {
    super(entity)
    this[$key] = key
    this[$condition] = condition

    this.key = nextKey => new ConditionCheck(this[$entity], nextKey, this[$condition])
    this.condition = nexCondition => new ConditionCheck(this[$entity], this[$key], nexCondition)
  }

  params = (): ConditionCheckParams => {
    if (!this[$key]) {
      throw new DynamoDBToolboxError('actions.incompleteAction', {
        message: 'ConditionCheck incomplete: Missing "key" property'
      })
    }

    if (!this[$condition]) {
      throw new DynamoDBToolboxError('actions.incompleteAction', {
        message: 'ConditionCheck incomplete: Missing "condition" property'
      })
    }

    return conditionCheckParams(this[$entity], this[$key], this[$condition])
  }

  get = (): {
    documentClient: DynamoDBDocumentClient
    type: 'ConditionCheck'
    params: ConditionCheckParams
  } => ({
    documentClient: this[$entity].table.getDocumentClient(),
    type: 'ConditionCheck',
    params: this.params()
  })
}

export type ConditionCheckClass = typeof ConditionCheck
