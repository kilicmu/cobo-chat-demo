import type { Observable } from "rxjs";


export type IPacket<T> = {
    event: 'done' | 'data';
    data?: T;
}

// transport 主要承载题目中 requestLLM 的工作
export interface ITransport<PacketType> {
    // 这里定义了流和非流传输，但是我们仅实现流式返回sse结果
    sendConversation(messages: {role: string, content: string}[], options?: Record<string, unknown>): Promise<string>;
    sendConversationStream(model: string, messages: {role: string, content: string}[], options?: Record<string, unknown>): [Observable<IPacket<PacketType>>, () => void]
}