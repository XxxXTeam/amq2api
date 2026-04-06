from converter import convert_claude_to_codewhisperer_request, codewhisperer_request_to_dict
from models import ClaudeMessage, ClaudeRequest


def test_current_message_tool_result_only_uses_non_empty_fallback_prompt():
    claude_req = ClaudeRequest(
        model="claude-sonnet-4.5",
        messages=[
            ClaudeMessage(
                role="user",
                content=[
                    {
                        "type": "tool_result",
                        "tool_use_id": "tool-123",
                        "content": [{"text": ""}],
                        "status": "success",
                    }
                ],
            )
        ],
        tools=None,
        stream=True,
    )

    result = codewhisperer_request_to_dict(
        convert_claude_to_codewhisperer_request(claude_req)
    )

    current_message = result["conversationState"]["currentMessage"]["userInputMessage"]
    assert "Please continue based on the tool results." in current_message["content"]
    assert current_message["userInputMessageContext"]["toolResults"][0]["content"] == [
        {"text": "Tool use was cancelled by the user"}
    ]


def test_history_tool_result_only_uses_non_empty_fallback_prompt():
    claude_req = ClaudeRequest(
        model="claude-sonnet-4.5",
        messages=[
            ClaudeMessage(role="assistant", content="previous assistant message"),
            ClaudeMessage(
                role="user",
                content=[
                    {
                        "type": "tool_result",
                        "tool_use_id": "tool-456",
                        "content": [{"text": ""}],
                        "status": "success",
                    }
                ],
            ),
            ClaudeMessage(role="user", content="follow up"),
        ],
        tools=None,
        stream=True,
    )

    result = codewhisperer_request_to_dict(
        convert_claude_to_codewhisperer_request(claude_req)
    )

    history_message = result["conversationState"]["history"][1]["userInputMessage"]
    assert history_message["content"] == "Please continue based on the tool results."
    assert history_message["userInputMessageContext"]["toolResults"][0]["content"] == [
        {"text": "Tool use was cancelled by the user"}
    ]
