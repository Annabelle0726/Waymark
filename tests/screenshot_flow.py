"""Browser acceptance against an isolated Waymark instance. Requires Python Playwright."""
import base64
import os
import uuid
from playwright.sync_api import sync_playwright, expect

base = os.environ["WAYMARK_TEST_URL"]
password = uuid.uuid4().hex

with sync_playwright() as driver:
    browser = driver.chromium.launch(executable_path=os.getenv("CHROME_BIN"))
    context = browser.new_context(permissions=["clipboard-read", "clipboard-write"])
    page = context.new_page()
    fixture = context.new_page()

    def screenshot(lines, fmt="png"):
        fixture.set_content('<div style="background:white;width:740px;padding:32px;font:30px/1.8 Microsoft YaHei, sans-serif">' + "<br>".join(lines) + "</div>")
        return fixture.locator("div").screenshot(type=fmt)

    def button(name):
        return page.get_by_role("button", name=name, exact=True)

    def start():
        button("添加岗位").click()
        button("上传截图").click()

    def paste(image):
        page.evaluate("""async img => {
          const bytes = Uint8Array.from(atob(img), c => c.charCodeAt(0))
          await navigator.clipboard.write([new ClipboardItem({'image/png':new Blob([bytes],{type:'image/png'})})])
        }""", base64.b64encode(image).decode())
        page.evaluate("""() => document.addEventListener('paste', event => {
          const file = event.clipboardData.files[0]
          window.pastedBytes = new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result.split(',')[1])
            reader.readAsDataURL(file)
          })
        }, {once:true})""")
        page.keyboard.press("Control+v")
        return base64.b64decode(page.evaluate("() => window.pastedBytes"))

    def save():
        button("确认添加岗位").click()
        expect(page.get_by_role("dialog")).to_have_count(0)

    api = context.request
    assert api.post(base + "/api/screenshot/recognize", data={"data": ""}).status == 401
    assert api.post(base + "/api/auth/register", data={"name":"虚构测试","email":uuid.uuid4().hex+"@example.invalid","password":password}).ok
    try:
        full = screenshot(["公司：虚构科技", "岗位：前端开发工程师", "薪资：18-25K", "技能：React"], "jpeg")
        cropped = screenshot(["前端开发工程师", "18-25K"])
        blank = screenshot(["&nbsp;"])
        page.goto(base)
        start()
        page.locator('dialog input[type=file]').set_input_files({"name":"complete.jpg","mimeType":"image/jpeg","buffer":full})
        expect(page.locator('dialog [role=status]')).to_contain_text("已读取",timeout=40000)
        expect(page.get_by_label("岗位名称")).to_have_value("前端开发工程师")
        expect(page.get_by_label("公司名称")).to_have_value("虚构科技")
        save()
        start()
        cropped = paste(cropped)
        expect(page.get_by_label("岗位名称")).to_have_value("前端开发工程师",timeout=40000)
        expect(page.get_by_label("公司名称")).to_have_value("")
        save()
        start()
        blank = paste(blank)
        expect(page.locator('dialog [role=status]')).to_contain_text("没有读到",timeout=40000)
        save()
        page.reload()
        expect(page.locator("h1")).to_have_text("岗位待确认")
        jobs=api.get(base+"/api/workspace").json()["state"]["jobs"]
        assert len(jobs)==3 and all(job["status"]=="待确认" for job in jobs)
        for job,image in zip(jobs,[blank,cropped,full]):
            assert api.get(base+"/api/files/"+job["fileId"]).body()==image
        assert jobs[1]["company"]=="" and "工程师" in jobs[1]["original"].replace(" ","")
        button("编辑岗位").click()
        page.get_by_label("公司名称").fill("后来确认的虚构公司")
        button("保存修改").click()
        expect(page.get_by_role("dialog")).to_have_count(0)
        assert api.get(base+"/api/workspace").json()["state"]["jobs"][0]["company"]=="后来确认的虚构公司"
        button("编辑岗位").click()
        extra = paste(screenshot(["公司：另一家公司", "岗位：前端开发工程师"]))
        expect(page.get_by_label("岗位名称")).to_have_value("前端开发工程师",timeout=40000)
        expect(page.get_by_label("公司名称")).to_have_value("后来确认的虚构公司")
        button("保存修改").click()
        expect(page.get_by_role("dialog")).to_have_count(0)
        page.reload()
        expect(page.locator("h1")).to_have_text("前端开发工程师")
        item = api.get(base+"/api/workspace").json()["state"]["jobs"][0]
        assert api.get(base+"/api/files/"+item["fileId"]).body()==blank
        assert api.get(base+"/api/files/"+item["screenshots"][0]["fileId"]).body()==extra
        button("查看来源").click()
        expect(button("下载补充截图 1")).to_be_visible()
        button("关闭").click()
        start()
        page.route("**/api/screenshot/recognize",lambda route: route.fulfill(status=503,json={"error":"本机识别未完成"}))
        paste(cropped)
        expect(page.locator("dialog [role=status]")).to_contain_text("本机识别未完成")
        expect(button("确认添加岗位")).to_be_enabled()
        page.unroute("**/api/screenshot/recognize")
        button("重新识别").click()
        expect(page.get_by_label("岗位名称")).to_have_value("前端开发工程师",timeout=40000)
        page.once("dialog",lambda dialog: dialog.accept())
        button("关闭").click()
        assert len(api.get(base+"/api/workspace").json()["state"]["jobs"])==3
        start()
        held = []
        def delayed(route):
            if not held:
                held.append(route)
            else:
                route.fulfill(json={"text":"岗位：第二张图"})
        page.route("**/api/screenshot/recognize", delayed)
        with page.expect_request("**/api/screenshot/recognize"):
            page.locator('dialog input[type=file]').set_input_files({"name":"first.jpg","mimeType":"image/jpeg","buffer":full})
        expect(button("正在识别…")).to_be_disabled()
        paste(cropped)
        button("删除截图 1").click()
        expect(page.get_by_label("岗位名称")).to_have_value("第二张图")
        with page.expect_response("**/api/screenshot/recognize"):
            held[0].fulfill(json={"text":"岗位：迟到的第一张图"})
        save()
        newest = api.get(base+"/api/workspace").json()["state"]["jobs"][0]
        assert newest["title"]=="第二张图" and newest["original"]=="岗位：第二张图"
        page.unroute("**/api/screenshot/recognize")
        before=api.get(base+"/api/workspace").json()
        broken=before["state"]
        staged_id=uuid.uuid4().hex
        broken["jobs"][0]["screenshots"]=[{"fileId":staged_id,"time":"2026-11-08","original":""}]
        response=api.put(base+"/api/workspace",data={
            "revision":before["revision"],"state":broken,"uploads":[
                {"id":staged_id,"name":"saved-first.png","data":base64.b64encode(blank).decode()},
                {"id":uuid.uuid4().hex,"name":"unreferenced.png","data":"AA=="}
            ]})
        assert response.status==400 and api.get(base+"/api/files/"+staged_id).status==404
        assert api.get(base+"/api/workspace").json()["revision"]==before["revision"]
        start()
        page.locator('dialog input[type=file]').set_input_files([
            {"name":"完整职位.jpg","mimeType":"image/jpeg","buffer":full},
            {"name":"岗位要求.png","mimeType":"image/png","buffer":cropped}
        ])
        expect(page.locator(".shot-list li")).to_have_count(2)
        expect(button("确认添加岗位")).to_be_enabled(timeout=60000)
        button("放大截图 1").click()
        large=page.get_by_role("dialog",name="完整职位.jpg")
        expect(large.locator("img")).to_be_visible()
        large.get_by_role("button",name="关闭").click()
        expect(page.get_by_role("dialog",name="添加岗位")).to_be_visible()
        if os.getenv("WAYMARK_UI_EVIDENCE"):
            for width,height in [(1440,900),(390,844)]:
                page.set_viewport_size({"width":width,"height":height})
                page.get_by_role("dialog",name="添加岗位").evaluate("(el) => el.scrollTop=0")
                page.screenshot(path=os.path.join(os.environ["WAYMARK_UI_EVIDENCE"],f"job-form-{width}.png"))
                assert page.locator(".job-form").evaluate("(el)=>el.scrollWidth<=el.clientWidth+1")
            page.set_viewport_size({"width":1440,"height":900})
        save()
        item=api.get(base+"/api/workspace").json()["state"]["jobs"][0]
        primary,secondary=item["fileId"],item["screenshots"][0]["fileId"]
        assert api.get(base+"/api/files/"+primary).body()==full
        assert api.get(base+"/api/files/"+secondary).body()==cropped
        button("编辑岗位").click()
        button("删除截图 1").click()
        page.once("dialog",lambda dialog: dialog.accept())
        button("关闭").click()
        assert api.get(base+"/api/files/"+primary).ok
        button("编辑岗位").click()
        button("删除截图 1").click()
        button("保存修改").click()
        expect(page.get_by_role("dialog")).to_have_count(0)
        assert api.get(base+"/api/files/"+primary).status==404
        assert api.get(base+"/api/files/"+secondary).body()==cropped
        button("编辑岗位").click()
        button("删除截图 1").click()
        button("保存修改").click()
        expect(page.get_by_role("dialog")).to_have_count(0)
        page.reload()
        expect(page.locator("h1")).to_have_text(item["title"])
        assert api.get(base+"/api/files/"+secondary).status==404
        final=api.get(base+"/api/workspace").json()["state"]["jobs"][0]
        assert not final.get("fileId") and not final["original"] and not final["screenshots"]
        print("PASS multi-image OCR, paste, previews, deletion/cancel, refresh, originals, stale results and atomic rollback")
    finally:
        api.delete(base+"/api/account",data={"password":password})
        browser.close()
