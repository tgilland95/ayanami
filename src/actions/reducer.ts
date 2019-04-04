import { logStateAction } from '../dev-helper'
import { Ayanami } from '../ayanami'
import { BasicState } from '../state'
import { reducerSymbols } from './symbols'
import { createActionDecorator, getActionNames, updateActions } from './utils'

export const Reducer = createActionDecorator(reducerSymbols)

export const setupReducerActions = <M extends Ayanami<S>, S>(
  ayanami: M,
  basicState: BasicState<S>,
): void => {
  getActionNames(reducerSymbols, ayanami.constructor).forEach((methodName) => {
    const reducer = (ayanami as any)[methodName] as Function

    updateActions(reducerSymbols, ayanami, {
      [methodName](payload: any) {
        const nextState = reducer.call(ayanami, payload, basicState.getState())
        basicState.setState(nextState)
        logStateAction(ayanami, {
          actionName: methodName,
          params: payload,
          state: nextState,
        })
      },
    })
  })
}
