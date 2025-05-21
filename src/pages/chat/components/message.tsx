import type { IMessage } from "@/models/message-store"
import { useMemo, memo, useRef } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useChatService } from "../services/chat-service";


export const MessageContent = memo(({ message }: { message: IMessage }) => {
  const initialMessageFinished = useRef(message.status)
  const {tryRegenMessage} = useChatService()
  const renderComponents = useMemo<Components>(() => ({
    pre: (({ node, children }) => {
      let language = 'plaintext'
      let codeContent = ''
      if (node?.children?.[0].type === 'element') {
        // @ts-expect-error "get language from child code node"
        language = (node.children?.[0]?.properties?.className?.[0]?.split?.('-')?.[1])
        // @ts-expect-error "accessing value property"
        codeContent = node.children[0].children[0].value || ''
      } else {
        codeContent = String(children).replace(/\n$/, '')
      }

      return <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="pre"
      >
        {codeContent}
      </SyntaxHighlighter>
    })
  }), [])

  if (message.status === 'finish' && initialMessageFinished.current !== 'generating') {
    return <ReactMarkdown components={renderComponents}>{message.content}</ReactMarkdown>
  }

  if (message.status === 'failed') {
    return <div className="card w-full min-h-12 text-error flex flex-col items-end font-bold">
      Something Wrong, please retry!
      <button className="btn btn-sm w-fit p-2 btn-primary" onClick={() =>  tryRegenMessage(message)}>retry</button>
    </div>
  }
  return <ReactMarkdown components={renderComponents}>{message.content}</ReactMarkdown>
})