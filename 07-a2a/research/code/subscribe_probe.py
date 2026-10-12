import json
import time

import httpx

H = {"Content-Type": "application/json", "A2A-Version": "1.0"}
URL = "http://127.0.0.1:9999/"
text = "feat: a\nfeat: b\nfix: c\nfix: d\nfix: e\nchore: f\nv3.1.0"
r = httpx.post(URL, headers=H, json={
    "jsonrpc": "2.0", "id": 10, "method": "SendMessage",
    "params": {"message": {"messageId": "m-10", "role": "ROLE_USER", "parts": [{"text": text}]},
               "configuration": {"returnImmediately": True}},
})
task = r.json()["result"]["task"]
print("SendMessage ->", task["status"]["state"])
time.sleep(0.7)
body = {"jsonrpc": "2.0", "id": 11, "method": "SubscribeToTask", "params": {"id": task["id"]}}
with httpx.stream("POST", URL, headers=H, json=body, timeout=10) as s:
    for line in s.iter_lines():
        if line.startswith("data:"):
            ev = json.loads(line[5:])["result"]
            kind = next(iter(ev))
            inner = ev[kind]
            if kind == "task":
                print("task snapshot:", inner["status"]["state"], "artifacts:",
                      [len(a["parts"]) for a in inner.get("artifacts", [])])
            elif kind == "artifactUpdate":
                print("artifactUpdate:", repr(inner["artifact"]["parts"][0]["text"]),
                      "append" if inner.get("append") else "", "lastChunk" if inner.get("lastChunk") else "")
            else:
                print(kind, inner["status"]["state"])
