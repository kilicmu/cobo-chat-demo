import { SSETransport } from "./transports/sse-transport";
import type { ITransport } from "./transports/transport";
import type { IConversation } from "@/models/feed-store";


export class LLMClient {
    private tp: ITransport<string>

    constructor() {
        // 这个 token 限金 1刀，可以用来测试。
        this.tp = new SSETransport({
            registry: import.meta.env.VITE_API_REGISTRY,
            token: import.meta.env.VITE_API_TOKEN
        })
    }

    requestLLM(conversation: IConversation) {
        return this.tp.sendConversationStream(
            conversation.options.model, 
            conversation.messages.map(msg => ({role: msg.role, content: msg.content})),
            {
                ...(conversation.options ?? {})
            }
        )
    }
}

const llmClient = new LLMClient()

export {
    llmClient
}