#!/usr/bin/env python3
"""
测试 tool result 处理逻辑
"""
import asyncio
import json
from models import ClaudeRequest, ClaudeMessage, ClaudeTool
from converter import convert_claude_to_codewhisperer_request, codewhisperer_request_to_dict


def test_tool_result_handling():
    """测试 tool result 消息处理"""
    print("=" * 60)
    print("测试 Tool Result 消息处理")
    print("=" * 60)

    # 场景 1: 正常用户消息（包含文本）
    print("\n场景 1: 正常用户消息")
    messages = [
        ClaudeMessage(role="user", content="Hello, world!")
    ]
    claude_req = ClaudeRequest(
        model="claude-sonnet-4.5",
        messages=messages,
        tools=None,
        stream=True
    )
    codewhisperer_req = convert_claude_to_codewhisperer_request(claude_req)
    result = codewhisperer_request_to_dict(codewhisperer_req)

    print(f"Content: {result['conversationState']['currentMessage']['userInputMessage']['content'][:50]}...")
    print(f"Has tool results: {result['conversationState']['currentMessage']['userInputMessage']['userInputMessageContext'].get('toolResults') is not None}")

    # 场景 2: Tool result 消息（无文本内容）
    print("\n场景 2: Tool result 消息（无文本内容）")
    messages = [
        ClaudeMessage(
            role="user",
            content=[
                {
                    "type": "tool_result",
                    "tool_use_id": "tool-123",
                    "content": [
                        {
                            "type": "text",
                            "text": ""
                        }
                    ],
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

    content = result['conversationState']['currentMessage']['userInputMessage']['content']
    print(f"Content: '{content}'")
    print(f"Uses fallback prompt: {'Please continue based on the tool results.' in content}")

    tool_results = result['conversationState']['currentMessage']['userInputMessage']['userInputMessageContext'].get('toolResults')
    print(f"Has tool results: {tool_results is not None}")
    if tool_results:
        print(f"Tool results: {json.dumps(tool_results, indent=2)}")

    # 场景 3: Tool result 消息（有文本内容）
    print("\n场景 3: Tool result 消息（有文本内容）")
    messages = [
        ClaudeMessage(
            role="user",
            content=[
                {
                    "type": "tool_result",
                    "tool_use_id": "tool-456",
                    "content": [
                        {
                            "type": "text",
                            "text": "File created successfully!"
                        }
                    ],
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

    content = result['conversationState']['currentMessage']['userInputMessage']['content']
    print(f"Content: '{content[:50]}...'")
    print(f"Content contains template: {content.startswith('--- CONTEXT ENTRY BEGIN ---')}")

    tool_results = result['conversationState']['currentMessage']['userInputMessage']['userInputMessageContext'].get('toolResults')
    print(f"Has tool results: {tool_results is not None}")
    if tool_results:
        print(f"Tool results: {json.dumps(tool_results, indent=2)}")

    # 场景 4: 混合内容（文本 + tool result）
    print("\n场景 4: 混合内容（文本 + tool result）")
    messages = [
        ClaudeMessage(
            role="user",
            content=[
                {
                    "type": "text",
                    "text": "Here is the result:"
                },
                {
                    "type": "tool_result",
                    "tool_use_id": "tool-789",
                    "content": [
                        {
                            "type": "text",
                            "text": "Operation completed"
                        }
                    ],
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

    content = result['conversationState']['currentMessage']['userInputMessage']['content']
    print(f"Content: '{content[:80]}...'")
    print(f"Content contains template: {content.startswith('--- CONTEXT ENTRY BEGIN ---')}")

    tool_results = result['conversationState']['currentMessage']['userInputMessage']['userInputMessageContext'].get('toolResults')
    print(f"Has tool results: {tool_results is not None}")
    if tool_results:
        print(f"Tool results count: {len(tool_results)}")

    print("\n" + "=" * 60)
    print("所有测试完成！")
    print("=" * 60)


if __name__ == "__main__":
    test_tool_result_handling()
