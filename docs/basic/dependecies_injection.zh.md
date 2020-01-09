# 依赖注入
如果你用过 [Angular](https://angular.io) 或者 [NestJS](https://nestjs.com/), 你可能已经对 **依赖注入** 这个概念比较熟悉了。

## Module
在 ayanami 程序中，所有的 **Module** 都是可**依赖注入**的。所以你可以通过将一个 **Module** 注入到另一个 **Module** 里面来达到组合它们的目的。

```ts
@Module('A')
class ModuleA extends Ayanami<AState> {
  defaultState = {}
}

@Module('B')
class ModuleB extends Ayanami<BState> {
  defaultState = {}

  constructor(private readonly moduleA: ModuleA) {
    super()
  }
}
```

### 访问其它 **Module** 的 `AppState`
跟 **Redux** 不一样的是，Ayanami 没有 **全局唯一 Store** 来存储所有的状态。
但是在 **依赖注入** 的帮助下，我们依然可以在一个 **Module** 中访问其它 **Module** 的状态。

<details>
<summary><code>示例代码</code></summary>

```ts
@Module('A')
class ModuleA extends Ayanami<AState> {
  defaultState = {}
}

@Module('B')
class ModuleB extends Ayanami<BState> {
  defaultState = {}

  constructor(private readonly moduleA: ModuleA) {
    super()
  }

  @Effect()
  addAndSync(payload$: Observable<number>) {
    return payload$.pipe(
      withLatestFrom(this.moduleA.state$),
      map(([payload, stateA]) => {
        ...
      })
    )
  }
}
```

</details>

### 触发其它 **Module** 的 `Action`
跟触发自己的 `Action` 一样，我们可以通过其它 **Module** 的 **ActionsCreator** 来触发它们的 `Action`:

<details>
<summary><code>示例代码</code></summary>

```ts
@Module('A')
class ModuleA extends Ayanami<AState> {
  defaultState = {}

  @ImmerReducer()
  set(state: Draft<AState>, payload: string) {
    state.syncFromB = payload
  }
}

@Module('B')
class ModuleB extends Ayanami<BState> {
  defaultState = {}

  constructor(private readonly moduleA: ModuleA) {
    super()
  }

  @Effect()
  addAndSync(payload$: Observable<number>) {
    return payload$.pipe(
      withLatestFrom(this.moduleA.state$),
      map(([payload, stateA]) => {
        return this.moduleA.getActions().set(`${stateA.syncFromB}${payload}`)
      })
    )
  }
}
```

</details>

## Service
如果你想创建一个纯(不包含状态)的 *Service*, 你可以用 **Injectable** 装饰这个 *Service* 类，这样你就可以将它注入到 ayanami **Module** 里面了。

<details>
<summary><code>示例代码</code></summary>

```ts

@Module('Simple')
class SimpleModule extends Ayanami<SimpleState> {
  defaultState = {}

  constructor(private readonly httpClient: HttpClient) {
    super()
  }

  @Effect()
  create(payload$: Observable<CreateEntityPayload>) {
    return payload$.pipe(
      withLatestFrom(this.state$),
      exhaustMap(([payload, state]) => {
        return this.httpClient.post(`/resources/${state.id}`, {
          body: payload,
        })
      })
    )
  }
}
```

```ts
import { Injectable } from 'ayanami'
import { Observable } from 'rxjs'

@Injectable()
export class HttpClient {
  constructor(private readonly tracer: Tracer) {}

  get () {}
  post<T>(config: Config = {}): Observable<T> {
    return this.send<T>({
      ...config,
      method: 'POST',
    })
  }
  delete() {}
  put() {}

  private send<T>(config: Config): Observable<T> {
    return this.tracer.send(config)
  }
}

```

```ts
import { Injectable } from 'ayanami'
import { Observable } from 'rxjs'

export type TraceId = string & {
  readonly traceIdTag: unique symbol
}

@Injectable()
export class Tracer {
  send<T>(config: Config): Observable<T> {
    const traceId = this.generateTraceId()
    this.traceStart(traceId)
    return new Observable<T>((observer) => {
      const { config, abortController } = this.convertConfig(config, traceId)
      fetch(config).then((res) => {
        this.traceEnd(traceId, res)
        return res.json()
      }).then((data) => {
        observer.next(data)
        observer.complete()
      }).catch((e) => {
        observer.error(e)
      })
      return () => {
        abortController.abort()
      }
    })
  }

  private convertConfig(config: Config, traceId: TraceId): { config: FetchInit, abortController: AbortController } {}

  private traceStart(traceId: TraceId) {}

  private traceEnd(traceId: TraceId, res: Response) {}

  private generateTraceId(): TraceId {}
}
```

</details>