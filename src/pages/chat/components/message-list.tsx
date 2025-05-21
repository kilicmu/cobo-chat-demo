import { TextAnimate } from "@/components/animate-text"
import { useActiveConversationMessages, useFeedStore } from "@/models/feed-store"
import clsx from "clsx"
import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from "react"
import { MessageContent } from "./message"
import { useShallow } from "zustand/shallow"
import { pick } from "lodash-es"
import { useMemoizedFn } from "ahooks"
import { RotateCcwIcon } from "lucide-react"
import { useChatService } from "../services/chat-service"



const HelloTip = memo(() => <div className="h-full w-full flex items-center justify-center">
    <TextAnimate by="character" className="font-extrabold text-4xl bg-clip-text bg-gradient-to-bl from-primary to-secondary text-transparent">Hello! What can I help you?</TextAnimate>
</div>)

// 这里要考虑做一下懒加载或者虚拟列表，现在demo先不做
export const MessageList = memo(forwardRef((_, ref) => {
    const {tryRegenMessage} = useChatService()
    const messages = useActiveConversationMessages()
    const [lastUserMessageHeight, setLastUserMessageHeight] = useState(0)
    const scrollerRef = useRef<HTMLDivElement>(null)
    const { activeConversationId } = useFeedStore(useShallow(state => pick(state, ['activeConversationId', 'removeAfterMessage'])))

    useEffect(() => { setLastUserMessageHeight(0) }, [activeConversationId])

    useEffect(() => {
        setTimeout(() => {
            if (scrollerRef.current)
                scrollerRef.current.scrollTo({ top: scrollerRef.current.scrollHeight, 'behavior': 'smooth' })
        })
    }, [activeConversationId])

    // Scroll to show the latest message at the top of the viewport
    const scrollToLastUserMessage = useMemoizedFn(() => {
        if (!scrollerRef.current) {
            return
        }
        // Find the last message element
        const messageElements = scrollerRef.current.querySelectorAll('#chat-message')
        if (messageElements.length > 0) {
            const lastUserMessage = messageElements[messageElements.length - 2]
            // const lastAsistantMessage = messageElements[messageElements.length - 1] as HTMLDivElement
            setLastUserMessageHeight(lastUserMessage.getBoundingClientRect().height)
            // Scroll to position the last message at the top of the viewport
            setTimeout(() => {
                lastUserMessage.scrollIntoView({ behavior: 'smooth', block: 'start' })
            })
        } else {
            // Fallback to scrolling to bottom if no messages found
            scrollerRef.current.scrollTo({ top: scrollerRef.current.scrollHeight })
        }
    })

    useImperativeHandle(ref, () => ({
        scrollToLastUserMessage
    }), [scrollToLastUserMessage])


    if (!messages.length) {
        return <HelloTip />
    }

    return <div className="flex-1 p-4 overflow-y-scroll" ref={scrollerRef}>
        {messages.map((msg, idx) => (
            <div id="chat-message" style={{
                minHeight: lastUserMessageHeight && idx === messages.length - 1 ? `calc(100dvh - 54px - ${lastUserMessageHeight}px)` : ''
            }} key={msg.messageId} className={clsx(`chat w-full flex group flex-col ${msg.role === 'user' ? 'chat-end' : 'chat-start'} mb-4`, {
            })}>
                <div className="chat-header grow-0">
                    {msg.role === 'user' ? 'User' : 'AI Bot'}
                </div>
                <div id="markdown-preview" className={`chat-bubble break-words ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble'} ${msg.status === 'loading' ? 'bg-transparent' : ''}`}>
                    {
                        msg.status === 'loading' ?
                            <div className="space-y-2">
                                <span className="text-md text-base-content">Thinking...</span>
                                <div className="skeleton w-64 h-4"></div>
                                <div className="skeleton w-64 h-4"></div>
                                <div className="skeleton w-24 h-4"></div>
                            </div>
                            :
                            <MessageContent message={msg}></MessageContent>
                    }
                </div>
                {
                    msg.role !== 'user' && (msg.status === 'finish') && <div className="group-hover:opacity-100 opacity-0 flex jusitfy-end mt-1 ">
                    <button className="btn btn-xs size-7 p-1 btn-ghost rounded-lg" onClick={() => tryRegenMessage(msg)}>
                        <RotateCcwIcon className="size-4" />
                    </button>
                </div>
                }
            </div>
        ))}
    </div>
}))