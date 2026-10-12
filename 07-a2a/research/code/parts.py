from google.protobuf.json_format import MessageToJson, ParseDict
from google.protobuf.struct_pb2 import Value
from a2a.types import Message, Part, Role

msg = Message(
    message_id="m-20", role=Role.ROLE_USER,
    parts=[
        Part(text="Сравни эти два релиза"),
        Part(data=ParseDict({"repo": "acme/api", "from": "1.3.0", "to": "1.4.0"}, Value())),
        Part(url="https://ci.example.com/builds/812/junit.xml",
             media_type="application/xml", filename="junit.xml"),
    ],
)
print(MessageToJson(msg, indent=1, ensure_ascii=False))
