#!/usr/bin/env python3
"""
测试用户打断工具调用场景
"""
import json
from models import ClaudeRequest, ClaudeMessage
from converter import convert_claude_to_codewhisperer_request, codewhisperer_request_to_dict


def test_user_interruption_scenario():
    """测试用户打断工具调用并发送新任务的场景"""
    print("=" * 60)
    print("测试场景：用户打断工具调用并发送新任务")
    print("=" * 60)

    # 模拟完整的对话历史
    messages = [
        # 历史消息 1: 用户初始请求
        ClaudeMessage(
            role="user",
            content="Create a file"
        ),
        # 历史消息 2: 助手响应（包含 tool_use）
        ClaudeMessage(
            role="assistant",
            content=[
                {
                    "type": "text",
                    "text": "I'll create a file for you."
                },
                {
                    "type": "tool_use",
                    "id": "tool-123",
                    "name": "fs_write",
                    "input": {
                        "command": "create",
                        "path": "/test.txt",
                        "file_text": "hello"
                    }
                }
            ]
        ),
        # 历史消息 3: 用户打断，未执行工具，而是发送新任务
        ClaudeMessage(
            role="user",
            content=[
                {
                    "type": "tool_result",
                    "tool_use_id": "tool-123",
                    "content": [{"text": ""}],
                    "status": "success"
                },
                {
                    "type": "text",
                    "text": "Actually, let me ask you something else. What is 2+2?"
                }
            ]
        ),
        # 当前消息: 新任务
        ClaudeMessage(
            role="user",
            content="What is 3+3?"
        )
    ]

    claude_req = ClaudeRequest(
        model="claude-sonnet-4.5",
        messages=messages,
        tools=None,
        stream=True
    )

    # 转换请求
    codewhisperer_req = convert_claude_to_codewhisperer_request(claude_req)
    result = codewhisperer_request_to_dict(codewhisperer_req)

    # 验证结果
    print("\n1. 验证历史记录:")
    history = result['conversationState']['history']
    print(f"   历史记录数量: {len(history)}")

    # 检查历史记录 1 (用户初始请求)
    print(f"\n   历史记录 1 (userInputMessage):")
    print(f"      Content: {history[0]['userInputMessage']['content'][:30]}...")
    print(f"      Has tool results: {'toolResults' in history[0]['userInputMessage']['userInputMessageContext']}")

    # 检查历史记录 2 (助手响应 - 包含 tool_use)
    print(f"\n   历史记录 2 (assistantResponseMessage):")
    print(f"      Content: {history[1]['assistantResponseMessage']['content'][:30]}...")
    print(f"      Has tool uses: {'toolUses' in history[1]['assistantResponseMessage']}")
    if 'toolUses' in history[1]['assistantResponseMessage']:
        print(f"      Tool uses: {len(history[1]['assistantResponseMessage']['toolUses'])}")
        for tool in history[1]['assistantResponseMessage']['toolUses']:
            print(f"         - {tool['name']}: {tool['toolUseId']}")

    # 检查历史记录 3 (用户打断 - 包含 tool_result)
    print(f"\n   历史记录 3 (userInputMessage):")
    print(f"      Content: {history[2]['userInputMessage']['content'][:50]}...")
    print(f"      Has tool results: {'toolResults' in history[2]['userInputMessage']['userInputMessageContext']}")
    if 'toolResults' in history[2]['userInputMessage']['userInputMessageContext']:
        tool_results = history[2]['userInputMessage']['userInputMessageContext']['toolResults']
        print(f"      Tool results: {len(tool_results)}")
        for result in tool_results:
            print(f"         - {result['toolUseId']}: {result['status']}")

    # 检查当前消息
    print("\n2. 验证当前消息:")
    current = result['conversationState']['currentMessage']['userInputMessage']
    print(f"   Content: {current['content'][:50]}...")
    print(f"   Has tool results: {'toolResults' in current['userInputMessageContext']}")

    # 生成完整的请求 JSON（用于调试）
    print("\n3. 完整请求 JSON (简化显示):")
    print(json.dumps(result, indent=2, ensure_ascii=False)[:500] + "...")

    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)


def test_only_tool_result_message():
    """测试只有 tool_result 的消息（无文本内容）"""
    print("\n" + "=" * 60)
    print("测试场景：只有 tool_result 的消息")
    print("=" * 60)

    messages = [
        ClaudeMessage(
            role="user",
            content=[
                {
                    "type": "tool_result",
                    "tool_use_id": "tool-456",
                    "content": [{"text": ""}],
                    "status": "success"
                }
            ]
        )
    ]

    claude_req = ClaudeRequest(
        model="claude-sonnet-4.5",
        messages=messages,
        tools=None,
        stream=True
    )

    codewhisperer_req = convert_claude_to_codewhisperer_request(claude_req)
    result = codewhisperer_request_to_dict(codewhisperer_req)

    print("\n当前消息:")
    current = result['conversationState']['currentMessage']['userInputMessage']
    print(f"   Content: '{current['content']}'")
    print(f"   Uses fallback prompt: {'Please continue based on the tool results.' in current['content']}")
    print(f"   Has tool results: {'toolResults' in current['userInputMessageContext']}")
    if 'toolResults' in current['userInputMessageContext']:
        tool_results = current['userInputMessageContext']['toolResults']
        print(f"   Tool results: {json.dumps(tool_results, indent=2)}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    test_user_interruption_scenario()
    test_only_tool_result_message()
