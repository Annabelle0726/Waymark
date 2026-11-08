"""Run against an isolated Docker instance with Python Playwright and CHROME_BIN."""
import os
import uuid
from playwright.sync_api import expect, sync_playwright

base = os.environ["WAYMARK_TEST_URL"]
phone = "+12025550142"
password = uuid.uuid4().hex
platform = "虚构验收平台"
message = "虚构山谷科技 · 测试工程师：邀请您参加线上面试。"

with sync_playwright() as driver:
    browser = driver.chromium.launch(executable_path=os.getenv("CHROME_BIN"))
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    visitor = browser.new_context()
    page = context.new_page()
    api = context.request

    def button(label):
        return page.get_by_role("button", name=label, exact=True)

    def snapshot():
        return api.get(base + "/api/workspace").json()

    def check_width():
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        for dialog in page.locator("dialog[open]").all():
            assert dialog.evaluate("el => el.scrollWidth <= el.clientWidth + 1")

    try:
        assert visitor.request.get(base + "/api/notices").status == 401
        assert api.post(base + "/api/auth/register", data={
            "name": "虚构验收", "email": "fiction@example.invalid", "password": password
        }).status == 400
        page.goto(base)
        expect(button("求职助理")).to_have_count(0)
        expect(page.get_by_label("手机号", exact=True)).to_be_visible()
        button("注册").click()
        for width in [375, 1440]:
            page.set_viewport_size({"width": width, "height": 850})
            check_width()
        page.locator("#auth-name").fill("虚构验收")
        page.locator("#auth-phone").fill(phone)
        expect(page.locator("#auth-email")).to_have_count(0)
        page.locator("#auth-password").fill(password)
        page.locator("#auth-confirm").fill(password)
        button("注册并进入工作空间").click()
        button("添加岗位").click()
        button("手动填写").click()
        page.get_by_label("公司名称").fill("虚构山谷科技")
        page.get_by_label("岗位名称").fill("测试工程师")
        button("确认添加岗位").click()
        assert snapshot()["state"]["jobs"] == []
        page.get_by_label("平台名称").fill(platform)
        button("关联此来源").click()
        expect(page.get_by_role("combobox", name="招聘平台")).to_have_value(platform)
        button("确认添加岗位").click()
        expect(page.get_by_role("dialog")).to_have_count(0)
        invalid = snapshot()
        invalid["state"]["jobs"][0]["platform"] = "未关联来源"
        assert api.put(base + "/api/workspace", data=invalid).status == 400
        assert snapshot()["state"]["jobs"][0]["status"] == "待确认"

        token = api.post(base + "/api/device-key", data={}).json()["token"]
        header = {"Authorization": "Bearer " + token}
        def intake(content, source=platform):
            return visitor.request.post(base + "/api/mobile/intake", headers=header,
                                        data={"platform": source, "text": content})
        assert intake(message, "未关联来源").status == 400
        assert intake(message).json() == {"added": True}
        assert intake(message).json() == {"added": False}
        assert intake("本平台将发布更多招聘公告。").json() == {"added": True}
        assert visitor.request.get(base + "/api/workspace", headers=header).status == 401

        button("求职助理").click()
        expect(button("确认记录此进度")).to_have_count(1)
        assert snapshot()["state"]["jobs"][0]["status"] == "待确认"
        for width in [1440, 375]:
            page.set_viewport_size({"width": width, "height": 850})
            check_width()
        button("确认记录此进度").click()
        expect(page.get_by_text("已记入岗位历史", exact=True)).to_be_visible()
        entry = snapshot()["state"]["jobs"][0]["history"][0]
        assert entry["status"] == "面试中" and entry["text"] == message and platform in entry["source"]
        button("公开搜索").click()
        check_width()
        assert api.post(base + "/api/search", data={"query": "公开招聘公告"}).status == 400
        assert api.post(base + "/api/assistant", data={"excerpt": "sample"}).status in (400, 503)
        if os.getenv("WAYMARK_TEST_SEARCH"):
            page.get_by_label("发送给博查的搜索词").fill("公开招聘公告")
            button("确认联网搜索").click()
            expect(page.locator("dialog article a").first).to_be_visible(timeout=30000)
            button("交给 DeepSeek 整理").click()
            expect(page.get_by_label("发送给 DeepSeek 的摘录")).not_to_have_value("")
        button("手机").click()
        button("启用本机推送").click()
        expect(page.get_by_role("dialog").get_by_role("status")).to_contain_text("主屏幕")
        assert api.post(base + "/api/push", data={"endpoint": "http://localhost"}).status == 400
        assert api.delete(base + "/api/device-key", data={}).ok and intake("test").status == 401
        button("关闭").click()
        page.reload()
        button("求职助理").click()
        expect(page.get_by_text("已记入岗位历史", exact=True)).to_be_visible()
        assert api.post(base + "/api/logout", data={}).ok
        assert api.post(base + "/api/auth/login", data={"password": password}).status == 400
        assert api.post(base + "/api/auth/login", data={"phone": phone, "password": password}).ok
        assert snapshot()["state"]["jobs"][0]["status"] == "面试中"
        print("PASS phone auth, required source, paired intake, dedup, account access, confirmation, persistence and desktop/mobile layouts")
    finally:
        api.delete(base + "/api/account", data={"password": password})
        browser.close()
