from stream_handler_new import AmazonQStreamHandler


def test_strip_amazonq_identity_boilerplate_in_chinese():
    handler = AmazonQStreamHandler()

    first = handler._sanitize_leading_response_text("你好！我是 Amazon Q，AWS 的 AI 助手。")
    second = handler._sanitize_leading_response_text("很高兴认识你。今天我来帮你分析这个问题。")
    tail = handler._flush_remaining_leading_text()

    assert first == ""
    assert second == "今天我来帮你分析这个问题。"
    assert tail == ""


def test_keep_normal_response_text_untouched():
    handler = AmazonQStreamHandler()

    first = handler._sanitize_leading_response_text("这个报错是因为请求体缺少必要字段。")
    tail = handler._flush_remaining_leading_text()

    assert first == "这个报错是因为请求体缺少必要字段。"
    assert tail == ""
