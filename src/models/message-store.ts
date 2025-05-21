
type Role = 'user' | 'assistant'

// message 可以从 feed 中解耦，因为 feed 中使用列表存储message，访问效率很低，且feed本身不应该关注message 内容，只要有一个message的引用就好了。
// 但是现在系统比较简单，时间也比较有限，所以暂时先放在一起。
export interface IMessage {
    // TODO： messageid 先用客户端生成的，正常应该客户端生成localMessageId, 等拿到服务端的reply消息，替换localid为messageId
    // 使用 replyid + messageid。可以保证消息之间顺序一致性。扩展多端同步，消息也不会乱
    messageId: string,
    replyId: string,
    // localMessageId?: string,
    // localReplyId?: string,
    content: string,
    role: Role,
    status: 'finish' | 'loading' | 'failed' | 'generating'
}
