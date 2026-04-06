from converter import (
    IDENTITY_OVERRIDE_SYSTEM_PROMPT,
    codewhisperer_request_to_dict,
    convert_claude_to_codewhisperer_request,
)
from models import ClaudeMessage, ClaudeRequest


def test_identity_override_is_injected_without_user_system():
    claude_req = ClaudeRequest(
        model="claude-sonnet-4.5",
        messages=[ClaudeMessage(role="user", content="hello")],
        stream=True,
    )

    result = codewhisperer_request_to_dict(
        convert_claude_to_codewhisperer_request(claude_req)
    )
    content = result["conversationState"]["currentMessage"]["userInputMessage"]["content"]

    assert "--- SYSTEM PROMPT BEGIN ---" in content
    assert IDENTITY_OVERRIDE_SYSTEM_PROMPT in content


def test_identity_override_keeps_user_system_prompt():
    claude_req = ClaudeRequest(
        model="claude-sonnet-4.5",
        messages=[ClaudeMessage(role="user", content="hello")],
        system="请始终使用中文回答。",
        stream=True,
    )

    result = codewhisperer_request_to_dict(
        convert_claude_to_codewhisperer_request(claude_req)
    )
    content = result["conversationState"]["currentMessage"]["userInputMessage"]["content"]

    assert IDENTITY_OVERRIDE_SYSTEM_PROMPT in content
    assert "请始终使用中文回答。" in content
