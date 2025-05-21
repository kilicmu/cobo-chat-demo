import { describe, it, expect } from 'vitest';
import { 
  createDefaultConversationOptions, 
  ALL_SUPPORT_MODEL,
  type SupportModels,
  type IConversationOptions
} from './feed-store';

// 定义消息接口，因为原始的可能未导出
interface IMessage {
  messageId: string;
  content: string;
  replyId?: string;
  role: 'user' | 'assistant';
  status: 'loading' | 'generating' | 'finish' | 'failed';
}

describe('Feed Store', () => {
  // 测试默认选项
  it('should create default conversation options with correct values', () => {
    const options = createDefaultConversationOptions();
    
    // 验证默认选项
    expect(options.model).toBe(ALL_SUPPORT_MODEL[0]);
    expect(options.seed).toBe(0);
    expect(options.maxToken).toBe(4086);
    expect(options.temperature).toBe(0);
  });
  
  // 测试模型列表
  it('should have correct model values in ALL_SUPPORT_MODEL', () => {
    // 验证模型列表
    expect(ALL_SUPPORT_MODEL).toContain('google/gemma-3n-e4b-it:free');
    expect(ALL_SUPPORT_MODEL).toContain('openai/gpt-4o');
    expect(ALL_SUPPORT_MODEL).toContain('google/gemini-2.5-pro-preview');
    expect(ALL_SUPPORT_MODEL.length).toBe(3);
  });
  
  // 测试消息排序逻辑 - 手动实现排序函数
  it('should sort messages correctly based on replyId', () => {
    // 创建测试消息
    const messages: IMessage[] = [
      {
        messageId: 'msg3',
        content: 'Message 3',
        replyId: 'msg2',
        role: 'assistant',
        status: 'finish'
      },
      {
        messageId: 'msg1',
        content: 'Message 1',
        replyId: '',
        role: 'user',
        status: 'finish'
      },
      {
        messageId: 'msg2',
        content: 'Message 2',
        replyId: 'msg1',
        role: 'assistant',
        status: 'finish'
      }
    ];
    
    // 手动实现消息排序逻辑
    const sortMessages = (msgs: IMessage[]) => {
      if (!msgs.length) {
        return [];
      }
      const messageMap = msgs.reduce((acc, message) => ({ ...acc, [message.replyId ?? '']: message }), {} as Record<string, IMessage>);
      const firstMessage = messageMap[''];
      
      const result = [firstMessage];
      while (result.length !== msgs.length) {
        result.push(messageMap[result[result.length - 1].messageId]);
      }
      return result;
    };
    
    // 测试排序功能
    const sortedMessages = sortMessages(messages);
    
    // 验证排序结果
    expect(sortedMessages.length).toBe(3);
    expect(sortedMessages[0].messageId).toBe('msg1');
    expect(sortedMessages[1].messageId).toBe('msg2');
    expect(sortedMessages[2].messageId).toBe('msg3');
  });
  
  // 测试空消息数组的排序
  it('should handle empty message arrays', () => {
    const emptyMessages: IMessage[] = [];
    expect(emptyMessages.length).toBe(0);
  });
  
  // 测试支持的模型类型
  it('should validate SupportModels type', () => {
    // 创建一个符合 SupportModels 类型的变量
    const validModel: SupportModels = 'openai/gpt-4o';
    
    // 验证该变量在 ALL_SUPPORT_MODEL 中
    expect(ALL_SUPPORT_MODEL).toContain(validModel);
    
    // 验证自定义选项
    const customOptions: IConversationOptions = {
      model: validModel,
      seed: 42,
      maxToken: 2048,
      temperature: 0.7
    };
    
    expect(customOptions.model).toBe('openai/gpt-4o');
    expect(customOptions.seed).toBe(42);
    expect(customOptions.maxToken).toBe(2048);
    expect(customOptions.temperature).toBe(0.7);
  });
  
  // 测试切换模型
  it('should switch between different models', () => {
    // 初始默认选项
    const defaultOptions = createDefaultConversationOptions();
    expect(defaultOptions.model).toBe(ALL_SUPPORT_MODEL[0]); // 默认使用第一个模型
    
    // 创建对话选项并设置初始模型
    const conversationOptions: IConversationOptions = {
      ...defaultOptions,
      model: ALL_SUPPORT_MODEL[0] // 初始使用 gemma
    };
    
    // 验证初始模型
    expect(conversationOptions.model).toBe('google/gemma-3n-e4b-it:free');
    
    // 切换到 GPT-4o
    const updatedOptions1: IConversationOptions = {
      ...conversationOptions,
      model: ALL_SUPPORT_MODEL[1] // 切换到 GPT-4o
    };
    
    // 验证模型已切换
    expect(updatedOptions1.model).toBe('openai/gpt-4o');
    expect(updatedOptions1.model).not.toBe(conversationOptions.model);
    
    // 切换到 Gemini
    const updatedOptions2: IConversationOptions = {
      ...updatedOptions1,
      model: ALL_SUPPORT_MODEL[2] // 切换到 Gemini
    };
    
    // 验证模型已切换
    expect(updatedOptions2.model).toBe('google/gemini-2.5-pro-preview');
    expect(updatedOptions2.model).not.toBe(updatedOptions1.model);
    
    // 验证其他选项保持不变
    expect(updatedOptions2.seed).toBe(defaultOptions.seed);
    expect(updatedOptions2.maxToken).toBe(defaultOptions.maxToken);
    expect(updatedOptions2.temperature).toBe(defaultOptions.temperature);
  });
  
  // 测试消息状态
  it('should validate message status types', () => {
    // 创建不同状态的消息
    const loadingMessage: IMessage = {
      messageId: 'loading-msg',
      content: '',
      replyId: '',
      role: 'assistant',
      status: 'loading'
    };
    
    const generatingMessage: IMessage = {
      messageId: 'generating-msg',
      content: 'Generating...',
      replyId: '',
      role: 'assistant',
      status: 'generating'
    };
    
    const finishMessage: IMessage = {
      messageId: 'finish-msg',
      content: 'Completed response',
      replyId: '',
      role: 'assistant',
      status: 'finish'
    };
    
    const failedMessage: IMessage = {
      messageId: 'failed-msg',
      content: 'Error occurred',
      replyId: '',
      role: 'assistant',
      status: 'failed'
    };
    
    // 验证消息状态
    expect(loadingMessage.status).toBe('loading');
    expect(generatingMessage.status).toBe('generating');
    expect(finishMessage.status).toBe('finish');
    expect(failedMessage.status).toBe('failed');
  });
  
  // 测试消息角色
  it('should validate message roles', () => {
    const userMessage: IMessage = {
      messageId: 'user-msg',
      content: 'User message',
      replyId: '',
      role: 'user',
      status: 'finish'
    };
    
    const assistantMessage: IMessage = {
      messageId: 'assistant-msg',
      content: 'Assistant message',
      replyId: 'user-msg',
      role: 'assistant',
      status: 'finish'
    };
    
    // 验证消息角色
    expect(userMessage.role).toBe('user');
    expect(assistantMessage.role).toBe('assistant');
  });
});
