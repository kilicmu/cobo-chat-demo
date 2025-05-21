import { create, type StateCreator } from "zustand";
import type { IMessage } from "./message-store";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { produce } from "immer";
import { v6 } from "uuid";
import { llmClient } from "@/api/request-llm";
import { concatMap, interval, of, zipWith } from "rxjs";


type ConversationId = string

export const ALL_SUPPORT_MODEL = [
    'google/gemma-3n-e4b-it:free',
    'openai/gpt-4o',
    'google/gemini-2.5-pro-preview'
] as const


export type SupportModels = typeof ALL_SUPPORT_MODEL[number]

export interface IConversationOptions {
    seed: number,
    maxToken: number,
    model: SupportModels,
    temperature: number,
}
export interface IConversation {
    conversationId: string,
    converationLabel: string,
    messages: IMessage[],
    options: IConversationOptions,
}


export interface IFeedStoreState {
    activeConversationId: string
    conversations: Record<ConversationId, IConversation>
}

export interface IFeedStoreActions {
    createConversation(opts?: Partial<IConversationOptions>): string;
    sendMessage: (content: string) => (readonly [Promise<unknown>, () => void] | null)
    setActiveConversation(conversationId: string): void
    updateConversationOptions(conversationId: string, opts: Partial<IConversationOptions>): void
    removeAfterMessage(messageId: string): void
    getMessage(messageId: string): IMessage | undefined;
}

type IFeedStore = IFeedStoreState & IFeedStoreActions

const initialFeedStore = {
    activeConversationId: '',
    conversations: {}
}

export const createDefaultConversationOptions = () => ({
    model: ALL_SUPPORT_MODEL[0],
    seed: 0,
    maxToken: 4086,
    temperature: 0,
})

const createFeedStore = (params: Parameters<StateCreator<IFeedStore>>) => {
    const [set, get] = params
    return {
        ...initialFeedStore,
        createConversation(opts = {}) {
            const _create = () => {
                // 最好通过接口生成id，但是现在没有后端，所以用uuid代替
                const conversationId = v6()
                set((state) => produce(state, (draft) => {
                    draft.activeConversationId = conversationId
                    draft.conversations[conversationId] = {
                        messages: [],
                        converationLabel: 'New Chat',
                        conversationId,
                        options: {
                            ...createDefaultConversationOptions(),
                            ...opts
                        }
                    }
                }))
                return conversationId
            }
            const { activeConversationId, conversations } = get()
            if (!activeConversationId) {
                return _create()
            }
            const activeConversation = conversations[activeConversationId]
            if (!activeConversation) {
                return _create()
            }

            if (!activeConversation.messages.length) {
                return activeConversationId
            }


            return _create()
        },
        sendMessage(content: string) {
            const lastMessage = getLastestMessage()
            const replyId = lastMessage?.messageId ?? ''
            const questionId = v6()
            const responseId = v6()
            set((state) => produce(state, (draft) => {
                draft.conversations[draft.activeConversationId].messages.push({
                    messageId: questionId,
                    content: content,
                    replyId,
                    role: 'user',
                    status: 'finish'
                })
            }))
            const conversation = getActiveConversationMessage()
            if (!conversation) {
                return null
            }

            const [observable, cancel] = llmClient.requestLLM(conversation)
            set((state) => produce(state, (draft) => {
                draft.conversations[conversation.conversationId].messages.push({
                    messageId: responseId,
                    content: '',
                    replyId: questionId,
                    role: 'assistant',
                    status: 'loading'
                })
            }))


            const char$ = observable
                .pipe(
                    concatMap(str => {
                        if (str.event === 'data') {
                            return of(...(str.data || ''))
                        } else {
                            return of()
                        }
                    })
                )

            const source$ = char$.pipe(zipWith(interval(30)))
            return [
                new Promise((resolve, reject) => {
                    source$.subscribe({
                        'next': ([char]) => {
                            set((state) => produce(state, (draft) => {
                                const msg = draft.conversations[conversation.conversationId].messages.find(msg => msg.messageId === responseId)
                                if (!msg) {
                                    return
                                }
                                msg.content += char
                                if (msg.status === 'loading' && msg.content) {
                                    msg.status = 'generating'
                                }
                            }))
                        },
                        'complete': () => {
                            set((state) => produce(state, (draft) => {
                                const msg = draft.conversations[conversation.conversationId].messages.find(msg => msg.messageId === responseId)
                                if (!msg) {
                                    return
                                }
                                msg.status = 'finish'
                            }))
                            resolve(true)
                        },
                        'error': (err) => {
                            set((state) => produce(state, (draft) => {
                                const msg = draft.conversations[conversation.conversationId].messages.find(msg => msg.messageId === responseId)
                                if (!msg) {
                                    return
                                }
                                msg.status = 'failed'
                            }))
                            reject(err)
                        }
                    })
                }),
                cancel
            ] as const
        },
        setActiveConversation(conversationId: string) {
            if (Object.keys(!get().conversations).includes(conversationId)) {
                // 远程请求
                return
            }
            set((state) => produce(state, (draft) => {
                draft.activeConversationId = conversationId
            }))
        },
        updateConversationOptions(conversationId: string, opts: Partial<IConversationOptions>) {
            set((state) => produce(state, (draft) => {
                const conversation = draft.conversations[conversationId]
                if (!conversation) {
                    return
                }
                Object.keys(opts).forEach(k => {
                    // @ts-expect-error "ts type warning"
                    conversation.options[k] = opts[k]
                })
            }))
        },
        removeAfterMessage(messageId: string) {
            const activeConversation = getActiveConversationMessage()
            if (!activeConversation) {
                return
            }
            const messages = sortMessages(activeConversation.messages)
            const idx = messages.findIndex(i => i.messageId === messageId)
            if (idx < 0) {
                return
            }
            const shouldDeleteMessageIdMap = messages.slice(idx).reduce((acc, n) => Object.assign({}, acc, ({ [n.messageId]: true })), {} as Record<string, boolean>)

            set((state) => produce(state, (draft) => {
                draft.conversations[activeConversation.conversationId].messages = draft.conversations[activeConversation.conversationId].messages.filter(msg => !shouldDeleteMessageIdMap[msg.messageId])
            }))
        },
        getMessage(messageId: string) {
            const conversation = get().conversations[get().activeConversationId]
            if(!conversation) {
                return
            }
            return conversation.messages.find(msg => msg.messageId === messageId)
        }
    }
}

export const useFeedStore = create(subscribeWithSelector(persist<IFeedStore>((...params) => {
    return {
        ...createFeedStore(params)
    }
}, {
    'version': 1,
    'name': "__feed-store"
})))


export const useActiveConversation = () => useFeedStore((state) => state.conversations[state.activeConversationId])

const sortMessages = (messages: IMessage[]) => {
    if (!messages.length) {
        return []
    }
    const messageMap = messages.reduce((acc, message) => ({ ...acc, [message.replyId ?? '']: message }), {} as Record<string, IMessage>)
    const firstMessage = messageMap['']

    const ans = [firstMessage]
    while (ans.length != messages.length) {
        ans.push(messageMap[ans[ans.length - 1].messageId])
    }
    return ans
}

export const useActiveConversationMessages = () => {
    const activeConversation = useActiveConversation()
    if (!activeConversation) {
        return []
    }
    const messages = activeConversation.messages
    if (!messages.length) {
        return []
    }

    return sortMessages(messages)
}

export const getActiveConversationMessage = () => {
    const store = useFeedStore.getState()
    if (!store.activeConversationId || !store.conversations[store.activeConversationId]) {
        return null
    }
    return store.conversations[store.activeConversationId]
}

export const getLastestMessage = () => {
    const store = useFeedStore.getState()
    if (!store.conversations[store.activeConversationId]) {
        return null
    }

    const sortedMessages = sortMessages(store.conversations[store.activeConversationId].messages)
    return sortedMessages[sortedMessages.length - 1]
}