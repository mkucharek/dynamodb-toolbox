import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, BatchGetCommand as _BatchGetCommand } from '@aws-sdk/lib-dynamodb'
import { AwsStub, mockClient } from 'aws-sdk-client-mock'
import { pick } from 'lodash'
import type { A } from 'ts-toolbelt'

import {
  BatchGetRequest,
  DynamoDBToolboxError,
  EntityV2,
  FormattedItem,
  KeyInput,
  SavedItem,
  TableV2,
  number,
  schema,
  string
} from '~/index.js'

import { BatchGetCommand } from './batchGetCommand.js'
import { execute, getCommandInput } from './execute.js'

const dynamoDbClient = new DynamoDBClient({ region: 'eu-west-1' })
const documentClient = DynamoDBDocumentClient.from(dynamoDbClient)
let documentClientMock: AwsStub<object, unknown, unknown>

const TestTable1 = new TableV2({
  name: 'test-table-1',
  partitionKey: { type: 'string', name: 'pk' },
  sortKey: { type: 'string', name: 'sk' },
  documentClient
})

const EntityA = new EntityV2({
  name: 'EntityA',
  schema: schema({
    pkA: string().key().savedAs('pk'),
    skA: string().key().savedAs('sk'),
    commonAttribute: string(),
    name: string()
  }),
  table: TestTable1
})
const keyA: KeyInput<typeof EntityA> = { pkA: 'a', skA: 'a' }
const savedItemA: SavedItem<typeof EntityA> = {
  _et: 'EntityA',
  _ct: '2021-09-01T00:00:00.000Z',
  _md: '2021-09-01T00:00:00.000Z',
  pk: 'a',
  sk: 'a',
  name: 'foo',
  commonAttribute: 'bar'
}
const formattedItemA: FormattedItem<typeof EntityA> = {
  created: '2021-09-01T00:00:00.000Z',
  modified: '2021-09-01T00:00:00.000Z',
  pkA: 'a',
  skA: 'a',
  name: 'foo',
  commonAttribute: 'bar'
}

const EntityB = new EntityV2({
  name: 'EntityB',
  schema: schema({
    pkB: string().key().savedAs('pk'),
    skB: string().key().savedAs('sk'),
    commonAttribute: string(),
    age: number()
  }),
  table: TestTable1
})
const keyB: KeyInput<typeof EntityB> = { pkB: 'b', skB: 'b' }
const savedItemB: SavedItem<typeof EntityB> = {
  _et: 'EntityB',
  _ct: '2021-09-01T00:00:00.000Z',
  _md: '2021-09-01T00:00:00.000Z',
  pk: 'b',
  sk: 'b',
  age: 42,
  commonAttribute: 'bar'
}
const formattedItemB: FormattedItem<typeof EntityB> = {
  created: '2021-09-01T00:00:00.000Z',
  modified: '2021-09-01T00:00:00.000Z',
  pkB: 'b',
  skB: 'b',
  age: 42,
  commonAttribute: 'bar'
}

const TestTable2 = new TableV2({
  name: 'test-table-2',
  partitionKey: { type: 'string', name: 'pk' },
  sortKey: { type: 'string', name: 'sk' },
  documentClient
})

const EntityC = new EntityV2({
  name: 'EntityC',
  schema: schema({
    pkC: string().key().savedAs('pk'),
    skC: string().key().savedAs('sk')
  }),
  table: TestTable2
})
const keyC: KeyInput<typeof EntityC> = { pkC: 'c', skC: 'c' }
const savedItemC: SavedItem<typeof EntityC> = {
  _et: 'EntityC',
  _ct: '2021-09-01T00:00:00.000Z',
  _md: '2021-09-01T00:00:00.000Z',
  pk: 'c',
  sk: 'c'
}
const formattedItemC: FormattedItem<typeof EntityC> = {
  created: '2021-09-01T00:00:00.000Z',
  modified: '2021-09-01T00:00:00.000Z',
  pkC: 'c',
  skC: 'c'
}

describe('execute (batchGet)', () => {
  beforeAll(() => {
    documentClientMock = mockClient(documentClient)
  })

  afterAll(() => {
    documentClientMock.restore()
  })

  beforeEach(() => {
    documentClientMock.reset()
  })

  test('throws if no command has been provided', () => {
    const invalidCall = () => getCommandInput([])

    expect(invalidCall).toThrow(DynamoDBToolboxError)
    expect(invalidCall).toThrow(expect.objectContaining({ code: 'actions.incompleteAction' }))
  })

  test('throws if two commands have the same Table', () => {
    const invalidCall = () =>
      getCommandInput([
        TestTable1.build(BatchGetCommand).requests(EntityA.build(BatchGetRequest).key(keyA)),
        TestTable1.build(BatchGetCommand).requests(EntityB.build(BatchGetRequest).key(keyB))
      ])

    expect(invalidCall).toThrow(DynamoDBToolboxError)
    expect(invalidCall).toThrow(expect.objectContaining({ code: 'actions.incompleteAction' }))
  })

  test('writes valid input otherwise', () => {
    const input = getCommandInput([
      TestTable1.build(BatchGetCommand).requests(
        EntityA.build(BatchGetRequest).key(keyA),
        EntityB.build(BatchGetRequest).key(keyB)
      ),
      TestTable2.build(BatchGetCommand).requests(EntityC.build(BatchGetRequest).key(keyC))
    ])

    expect(input).toStrictEqual({
      RequestItems: {
        'test-table-1': {
          Keys: [
            { pk: 'a', sk: 'a' },
            { pk: 'b', sk: 'b' }
          ]
        },
        'test-table-2': { Keys: [{ pk: 'c', sk: 'c' }] }
      }
    })
  })

  test('returns correct response', async () => {
    documentClientMock.on(_BatchGetCommand).resolves({
      Responses: {
        'test-table-1': [savedItemA, savedItemB],
        'test-table-2': [savedItemC]
      }
    })

    const { Responses } = await execute(
      TestTable1.build(BatchGetCommand).requests(
        EntityA.build(BatchGetRequest).key(keyA),
        EntityB.build(BatchGetRequest).key(keyB)
      ),
      TestTable2.build(BatchGetCommand).requests(EntityC.build(BatchGetRequest).key(keyC))
    )

    type AssertResponse = A.Equals<
      typeof Responses,
      [
        [FormattedItem<typeof EntityA> | undefined, FormattedItem<typeof EntityB> | undefined],
        [FormattedItem<typeof EntityC> | undefined]
      ]
    >
    const assertResponse: AssertResponse = 1
    assertResponse

    expect(Responses).toStrictEqual([[formattedItemA, formattedItemB], [formattedItemC]])
  })

  test('infers correct type even with arrays of request', async () => {
    documentClientMock.on(_BatchGetCommand).resolves({
      Responses: {
        'test-table-1': [savedItemA, savedItemB],
        'test-table-2': [savedItemC]
      }
    })

    const requests1 = [
      EntityA.build(BatchGetRequest).key(keyA),
      EntityB.build(BatchGetRequest).key(keyB)
    ]

    const requests2 = [EntityC.build(BatchGetRequest).key(keyC)]

    const commands = [
      TestTable1.build(BatchGetCommand).requests(...requests1),
      TestTable2.build(BatchGetCommand).requests(...requests2)
    ]

    const { Responses } = await execute(...commands)

    type AssertResponse = A.Equals<
      typeof Responses,
      (
        | (FormattedItem<typeof EntityA> | FormattedItem<typeof EntityB> | undefined)[]
        | (FormattedItem<typeof EntityC> | undefined)[]
      )[]
    >
    const assertResponse: AssertResponse = 1
    assertResponse

    expect(Responses).toStrictEqual([[formattedItemA, formattedItemB], [formattedItemC]])
  })

  test('formats response', async () => {
    documentClientMock.on(_BatchGetCommand).resolves({
      Responses: {
        'test-table-1': [savedItemA, savedItemB],
        'test-table-2': [savedItemC]
      }
    })

    const { Responses } = await execute(
      TestTable1.build(BatchGetCommand)
        .requests(
          EntityA.build(BatchGetRequest).key(keyA),
          EntityB.build(BatchGetRequest).key(keyB)
        )
        .options({ attributes: ['commonAttribute'] }),
      TestTable2.build(BatchGetCommand)
        .requests(EntityC.build(BatchGetRequest).key(keyC))
        .options({ attributes: ['pkC'] })
    )

    type AssertResponse = A.Equals<
      typeof Responses,
      [
        [
          FormattedItem<typeof EntityA, { attributes: 'commonAttribute' }> | undefined,
          FormattedItem<typeof EntityB, { attributes: 'commonAttribute' }> | undefined
        ],
        [FormattedItem<typeof EntityC, { attributes: 'pkC' }> | undefined]
      ]
    >
    const assertResponse: AssertResponse = 1
    assertResponse

    expect(Responses).toStrictEqual([
      [pick(formattedItemA, 'commonAttribute'), pick(formattedItemB, 'commonAttribute')],
      [pick(formattedItemC, 'pkC')]
    ])
  })

  test('re-orders response items if needed', async () => {
    documentClientMock.on(_BatchGetCommand).resolves({
      Responses: {
        'test-table-1': [savedItemB, savedItemA],
        'test-table-2': [savedItemC]
      }
    })

    const { Responses } = await execute(
      TestTable1.build(BatchGetCommand).requests(
        EntityA.build(BatchGetRequest).key(keyA),
        EntityB.build(BatchGetRequest).key(keyB)
      ),
      TestTable2.build(BatchGetCommand).requests(EntityC.build(BatchGetRequest).key(keyC))
    )

    expect(Responses).toStrictEqual([[formattedItemA, formattedItemB], [formattedItemC]])
  })

  test('passes correct options', async () => {
    documentClientMock.on(_BatchGetCommand).resolves({
      Responses: { 'test-table-1': [savedItemA] }
    })

    const { Responses } = await execute(
      { documentClient, capacity: 'TOTAL' },
      TestTable1.build(BatchGetCommand).requests(EntityA.build(BatchGetRequest).key(keyA))
    )

    type AssertResponse = A.Equals<typeof Responses, [[FormattedItem<typeof EntityA> | undefined]]>
    const assertResponse: AssertResponse = 1
    assertResponse

    expect(documentClientMock.calls()).toHaveLength(1)
    expect(documentClientMock.commandCalls(_BatchGetCommand)[0].args[0].input).toMatchObject({
      ReturnConsumedCapacity: 'TOTAL'
    })
  })
})
