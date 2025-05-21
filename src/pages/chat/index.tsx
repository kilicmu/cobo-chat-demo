import { ALL_SUPPORT_MODEL, useFeedStore, type SupportModels } from '@/models/feed-store';
import { useBoolean, useMemoizedFn } from 'ahooks';
import clsx from 'clsx';
import { pick } from 'lodash-es';
import React, { memo, useLayoutEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { MessageList } from './components/message-list';
import { Bolt, SendHorizonalIcon, StopCircleIcon } from 'lucide-react';
import { ConversationSettingEditor } from './components/conversation-setting-editor';
import { ChatServiceProvider, useChatService, useChatServiceFactory } from './services/chat-service';


const ConversationNavbar = () => {
  const { activeConversationId, conversations } = useFeedStore(useShallow(state => pick(state, ['activeConversationId', 'createConversation', 'setActiveConversation', 'conversations'])));
  const navigate = useNavigate()



  return <div className="min-w-64 shadow-sm px-2 h-full flex flex-col">
    <button className="btn btn-primary w-full mt-2" onClick={() => {
      navigate(`/chat`)
    }}>New Chat</button>
    <div className="mt-2 space-y-1 overflow-y-scroll flex-1">
      {
        Object.values(conversations).map(i => {
          return <li key={i.conversationId} className={clsx("h-8 rounded-md cursor-pointer hover:bg-primary/20 transition-all flex items-center p-2", {
            'bg-primary/50 hover:bg-primary/50': i.conversationId === activeConversationId
          })} onClick={() => {
            navigate(`/chat/${i.conversationId}`)
          }}>{i.converationLabel}</li>
        })
      }

    </div>
  </div>
}



const _Chat: React.FC = memo(() => {
  const [message, setMessage] = useState('');
  const { isSending, draftConversationOpts, handleSendMessage, cancelFnRef, handleChangeConversationSetting, scrollviewRef } = useChatService()
  const { setActiveConversation } = useFeedStore(useShallow((state) => pick(state, ['setActiveConversation', 'createConversation', 'activeConversationId', 'sendMessage', 'updateConversationOptions'])))

  const [isEditCardOpen, { setTrue: openEditCard, setFalse: closeEditCard }] = useBoolean(false)

  const params = useParams()

  useLayoutEffect(() => {
    setActiveConversation(params.id!)
  }, [params.id, setActiveConversation])


  const toSendMessage = useMemoizedFn(async () => {
    if (isSending) {
      return
    }

    const _message = message.trim()
    setMessage('')
    try {
      await handleSendMessage(_message)
    } catch(e) {
      console.log("send message error:", e)
    }
  });

  const onChangeModel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SupportModels
    handleChangeConversationSetting({
      model: value
    })
  }

  return (
    <div className="flex h-[calc(100vh-56px)] w-screen">
      <ConversationNavbar />
      <div className="flex-1 flex flex-col">
        <MessageList ref={scrollviewRef} />
        <div className="p-4 bg-base-200">
          <div className="w-full flex items-end">
            <textarea
              className="textarea textarea-md flex-1 resize-none overflow-hidden text-lg !min-h-8"
              onChange={(e) => {
                setMessage(e.target.value);
              }}
              value={message}
              placeholder='Enter to send message, and use Shift + Enter to insert new line...'
              onKeyDown={(e) => {
                // fix: 解决一下中文输入法冲突问题。不要使用 key === 'Enter'。输入法 Enter 输入英文时候会误触
                if (e.keyCode === 13) {
                  if (e.shiftKey) {
                    setMessage(prev => prev + '\n');
                    // Resize after adding a new line
                    setTimeout(() => {
                      if (e.target instanceof HTMLTextAreaElement) {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 320)}px`;
                      }
                    }, 0);
                    return;
                  } else {
                    e.preventDefault();
                    toSendMessage();
                  }
                }
              }}
            />

          </div>
          <div className="card mt-2">
            <div className="flex items-center gap-2 justify-between">
              <div><label className="text-md text-base-content">Model: </label>
                <select className="select w-42" value={draftConversationOpts?.model} onChange={onChangeModel}>
                  {ALL_SUPPORT_MODEL.map(i => <option key={i} value={i}>{i}</option>)}
                </select></div>

              <div className="flex gap-2 relative">
                <div className="relative">
                  <button
                    className="btn btn-primary btn-outline btn-circle py-2"
                    onClick={openEditCard}
                    disabled={isSending}
                  >
                    <Bolt className="size-4" />
                  </button>

                  {/* Edit Card Popup */}
                  {isEditCardOpen && (
                    <ConversationSettingEditor options={draftConversationOpts!} onChange={handleChangeConversationSetting} onClose={closeEditCard} />
                  )}
                </div>
                {isSending ? <button className="btn btn-primary btn-outline btn-circle" onClick={cancelFnRef.current}>
                  <StopCircleIcon className="size-4" />
                </button> : <button
                  className="btn btn-primary btn-circle py-2"
                  onClick={toSendMessage}
                  disabled={isSending}
                >
                  <SendHorizonalIcon className="size-4" />
                </button>}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

export const Chat = () => {
  return <ChatServiceProvider value={useChatServiceFactory()}>
    <_Chat />
  </ChatServiceProvider>
}
export default Chat;
