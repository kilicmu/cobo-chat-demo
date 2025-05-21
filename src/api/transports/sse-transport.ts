// import type { IConversation } from "../models/feed-store";
import { Observable } from 'rxjs';
import type { IPacket, ITransport } from "./transport";
import { omit } from 'lodash-es';

export interface SSEOptions<T>{
  headers?: Record<string, string>;
  method?: string;
  body?: Record<string, unknown>;
  onMessage?: (data: IPacket<T>) => void;
  onError?: (error: unknown) => void;
  onOpen?: () => void;
  withCredentials?: boolean;
}

export class SSEClient<T> {
  private controller: AbortController | null = null;
  private url: string;
  private options: SSEOptions<T>;
  private connected: boolean = false;

  constructor(url: string, options: SSEOptions<T>= {}) {
    this.url = url;
    this.options = options;
  }

  async connect(): Promise<void> {
    if (this.controller) {
      this.disconnect();
    }

    const { 
      // withCredentials = true, 
      headers = {}, 
      method = 'GET',
      body 
    } = this.options;

    this.controller = new AbortController();
    
    try {
      // const credentials = withCredentials ? 'include' : 'same-origin';
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Accept': 'text/event-stream',
          ...headers
        },
        signal: this.controller.signal,
        // credentials
      };
      
      if (body && method !== 'GET') {
        requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      } else if(body && method === 'GET') {
        const urlParams = new URLSearchParams();
        for (const key in body) {
            urlParams.append(key, '' + body[key]);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this.url.includes('?') ? this.url += '&' : this.url += '?';
        this.url += urlParams.toString();
      }
      
      const response = await fetch(this.url, requestOptions);
      if (!response.ok) {
        throw new Error(`SSE request failed: ${response.status} ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      this.connected = true;
      this.options.onOpen?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const processChunk = async () => {
        try {
          const { done, value } = await reader.read();
          
          if (done) {
            this.connected = false;
            return;
          }
          
          const str = decoder.decode(value, { stream: true }).trim()
          const chunks = str.split('\n').filter(Boolean);

          for (const chunk of chunks) {
            if(chunk === ': OPENROUTER PROCESSING') {
              console.log("skip ping packet")
              continue
            }
            if(chunk.startsWith('data: ')) {
              const data = chunk.slice(6)
              if(data === '[DONE]') {
                this.options?.onMessage?.({
                  event: 'done',
                })
                return
              }

              this.options.onMessage?.({
                event: 'data',
                data: JSON.parse(data)?.choices[0].delta.content
              })
            }
          }
          
          if (!this.controller?.signal.aborted) {
            processChunk();
          }
        } catch (error: unknown) {
          console.log("error", error)
          if (!this.controller?.signal.aborted && (error as { name: string }).name !== 'AbortError') {
            this.options.onError?.(error);
            this.connected = false;
          } else {
            this.options.onMessage?.({
              event: 'done'
            })
          }
        }
      };
      
      processChunk();
    } catch (error) {
      this.options.onError?.(error);
      this.connected = false;
    }
  }

  disconnect(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Creates an observable that emits SSE messages
   */
  public createObservable(): Observable<IPacket<T>> {
    return new Observable<IPacket<T>>(subscriber => {
      // Store previous handlers to chain them
      const prevOnMessage = this.options.onMessage;
      const prevOnError = this.options.onError;
      const prevOnOpen = this.options.onOpen;
      
      // Override handlers to include observable emissions
      this.options.onMessage = (data) => {
        subscriber.next(data);
        prevOnMessage?.(data);
        if(data.event === "done") {
          subscriber.complete();
          this.disconnect();
        }
      };
      
      this.options.onError = (error) => {
        subscriber.error(error);
        prevOnError?.(error);
      };
      
      this.options.onOpen = () => {
        prevOnOpen?.();
      };
      
      // Connect if not already connected
      if (!this.isConnected()) {
        this.connect().catch(error => {
          subscriber.error(error);
        });
      }
      
      // Return cleanup function
      return () => {
        this.disconnect();
        subscriber.unsubscribe();
      };
    });
  }
}

/**
 * create sse result packets observable
 */
export function createSSEObservable<T>(url: string, options: SSEOptions<T> = {}): [Observable<IPacket<T>>, () => void] {
  const client = new SSEClient(url, options);
  
  return [client.createObservable(), () => client.disconnect()];
}


type SSETransportOptions = {
  registry: string,
  token: string
}

// transport 只负责运输数据包，具体上层数据怎么从业务数据转换的不管！
export class SSETransport<T> implements ITransport<T> {
    private registry: string
    private token: string
    constructor(options: SSETransportOptions) {
      this.registry = options.registry
      this.token = options.token
    }
    // 我们先不实现非流式
    sendConversation(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    sendConversationStream(model: string, messages: {role: string, content: string}[], opts: Record<string, unknown>): [Observable<IPacket<T>>, () => void] {
      return createSSEObservable(this.registry, {
        method: 'POST',
        headers: {
          // 这个token
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: {
          model,
          messages,
          stream: true,
          ...omit(opts, ['stream', 'message', 'model']),
        }
      })
    }
}

