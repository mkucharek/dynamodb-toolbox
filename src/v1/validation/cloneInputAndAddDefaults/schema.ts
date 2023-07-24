import cloneDeep from 'lodash.clonedeep'

import type { Schema, AdditionalResolution, ResolvedItem, ResolvedAttribute } from 'v1/schema'
import type { SchemaDefaultsComputer } from 'v1/entity'
import { isObject } from 'v1/utils/validation'

import { CommandName } from './types'
import { cloneAttributeInputAndAddDefaults } from './attribute'

export const cloneSchemaInputAndAddDefaults = <ADDITIONAL_RESOLUTION extends AdditionalResolution>(
  schema: Schema,
  input: ResolvedItem<ADDITIONAL_RESOLUTION>,
  {
    commandName,
    computeDefaultsContext
  }: {
    commandName?: CommandName
    computeDefaultsContext?: { computeDefaults: SchemaDefaultsComputer }
  } = {}
): ResolvedItem<ADDITIONAL_RESOLUTION> => {
  if (!isObject(input)) {
    return cloneDeep(input)
  }

  const inputWithDefaults: ResolvedItem<ADDITIONAL_RESOLUTION> = {}

  const additionalAttributes: Set<string> = new Set(Object.keys(input))

  const canComputeDefaults = computeDefaultsContext !== undefined

  Object.entries(schema.attributes).forEach(([attributeName, attribute]) => {
    let attributeInputWithDefaults: ResolvedAttribute<ADDITIONAL_RESOLUTION> | undefined = undefined

    if (canComputeDefaults) {
      const { computeDefaults } = computeDefaultsContext

      attributeInputWithDefaults = cloneAttributeInputAndAddDefaults(
        attribute,
        input[attributeName],
        {
          commandName,
          computeDefaultsContext: {
            computeDefaults: computeDefaults && computeDefaults[attributeName],
            /**
             * @debt feature "make computeDefault available for keys & updates"
             */
            // @ts-expect-error
            contextInputs: [input]
          }
        }
      )
    } else {
      attributeInputWithDefaults = cloneAttributeInputAndAddDefaults(
        attribute,
        input[attributeName],
        { commandName }
      )
    }

    if (attributeInputWithDefaults !== undefined) {
      inputWithDefaults[attributeName] = attributeInputWithDefaults
    }

    additionalAttributes.delete(attributeName)
  })

  additionalAttributes.forEach(attributeName => {
    inputWithDefaults[attributeName] = cloneDeep(input[attributeName])
  })

  return inputWithDefaults
}
