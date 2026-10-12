import asyncio

from a2a.client import ClientConfig, create_client
from a2a.helpers import get_message_text, new_text_message
from a2a.types import Role, SendMessageRequest, TaskState


async def main() -> None:
    client = await create_client("http://127.0.0.1:9999", client_config=ClientConfig(streaming=True))

    first = new_text_message("fix: retry on 429\nfeat: add ListTasks", role=Role.ROLE_USER)
    task = None
    async for event in client.send_message(SendMessageRequest(message=first)):
        if event.HasField("task"):
            task = event.task
        elif event.HasField("status_update"):
            task.status.CopyFrom(event.status_update.status)

    if task.status.state == TaskState.TASK_STATE_INPUT_REQUIRED:
        print("агент спрашивает:", get_message_text(task.status.message))
        reply = new_text_message("1.4.0", role=Role.ROLE_USER,
                                 task_id=task.id, context_id=task.context_id)
        async for event in client.send_message(SendMessageRequest(message=reply)):
            if event.HasField("artifact_update"):
                for part in event.artifact_update.artifact.parts:
                    print(part.text, end="")
            elif event.HasField("status_update"):
                print("состояние:", TaskState.Name(event.status_update.status.state))

    await client.close()


asyncio.run(main())
