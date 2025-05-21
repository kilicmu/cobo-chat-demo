import { createDefaultConversationOptions, useActiveConversation, useFeedStore, type IConversationOptions } from "@/models/feed-store";
import type { IMessage } from "@/models/message-store";
import { createServiceToken } from "@/utils/service-helper";
import { useBoolean, useMemoizedFn } from "ahooks";
import { pick } from "lodash-es";
import { useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { noop } from "rxjs";
import { useShallow } from "zustand/shallow";

// 这里处理和react相关的逻辑模型
export const useChatServiceFactory = () => {
    const [isSending, isSendingController] = useBoolean(false)
    const id = useParams().id
    const { createConversation, updateConversationOptions, sendMessage, removeAfterMessage} = useFeedStore(useShallow((state) => pick(state, ['sendMessage', 'createConversation', 'updateConversationOptions', 'removeAfterMessage'])))
    const navigate = useNavigate()
    const activeConversation = useActiveConversation()
    const [_draftConversationOpts, setDraftConversationOpts] = useState<Partial<IConversationOptions>>({})
    const cancelFnRef = useRef(noop)
    const scrollviewRef = useRef<{ scrollToLastUserMessage: () => void }>(null)

    const handleSendMessage = useMemoizedFn(async (message: string) => {
        if (isSending) {
            return
        }
        const _message = message.trim()
        if (_message === '') return;
        isSendingController.setTrue()

        if (!id) {
            const newConversationId = createConversation(draftConversationOpts)
            await navigate(`/chat/${newConversationId}`)
        }

        setTimeout(scrollviewRef.current?.scrollToLastUserMessage ?? noop)
        try {
            const result = sendMessage(_message)
            if (!result) {
                return
            }
            const [promise, cancel] = result
            cancelFnRef.current = cancel
            await promise
        } finally {
            isSendingController.setFalse()
            cancelFnRef.current = noop
        }
    });

    const handleChangeConversationSetting = useMemoizedFn((setting: Partial<IConversationOptions>) => {
        if (activeConversation) {
            updateConversationOptions(activeConversation.conversationId, setting)
        } else {
            setDraftConversationOpts((state) => ({
                ...state,
                ...setting
            }))
        }
    })

    const draftConversationOpts = useMemo(() => {
        if (activeConversation) {
            return activeConversation.options
        }
        return _draftConversationOpts
    }, [_draftConversationOpts, activeConversation])

    const tryRegenMessage = (msg: IMessage) => {
        const replyMessage = useFeedStore.getState().getMessage(msg.replyId)
        if(!replyMessage) {
            return
        }
        removeAfterMessage(msg.replyId)
        handleSendMessage(replyMessage?.content)
    }

    useEffect(() => {
        if (!activeConversation) {
            setDraftConversationOpts(createDefaultConversationOptions())
        } else {
            setDraftConversationOpts(activeConversation.options)
        }
    }, [activeConversation])

    return { isSending, isSendingController, handleChangeConversationSetting, tryRegenMessage, draftConversationOpts, handleSendMessage, cancelFnRef, scrollviewRef }
}
const ChatServiceToken = createServiceToken(useChatServiceFactory)


export const ChatServiceProvider = ({ value, children }: PropsWithChildren<{ value: ReturnType<typeof useChatServiceFactory> }>) => {
    // const _value = useLatest(value)
    return <ChatServiceToken.Provider value={value}>
        {children}
    </ChatServiceToken.Provider>
}

export const useChatService = () => {
    const ctxRef = useContext(ChatServiceToken)
    if (!ctxRef) {
        throw new Error("must provide context")
    }

    return ctxRef
}