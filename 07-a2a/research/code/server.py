import asyncio
import re

import uvicorn
from starlette.applications import Starlette

from a2a.helpers import get_message_text, new_task_from_user_message, new_text_message, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes, create_rest_routes
from a2a.server.tasks import InMemoryTaskStore, TaskUpdater
from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill, TaskState

VERSION = re.compile(r"\bv?\d+\.\d+\.\d+\b")


class ReleaseNotesExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        task = context.current_task
        if task is None:
            task = new_task_from_user_message(context.message)
            await event_queue.enqueue_event(task)
        updater = TaskUpdater(event_queue, task.id, task.context_id)

        history = [get_message_text(m) for m in task.history] + [get_message_text(context.message)]
        text = "\n".join(history)
        version = VERSION.search(text)
        if version is None:
            await updater.requires_input(
                new_text_message("Какую версию выпускаем? Пришли номер вида 1.4.0.",
                                 context_id=task.context_id, task_id=task.id)
            )
            return

        await updater.start_work()
        commits = [l.strip("-* ") for l in history[0].splitlines() if l.strip()]
        chunks = [f"## {version.group(0)}\n"] + [f"- {c}\n" for c in commits]
        artifact_id = "release-notes"
        for i, chunk in enumerate(chunks):
            await updater.add_artifact(
                parts=[new_text_part(chunk, media_type="text/markdown")],
                artifact_id=artifact_id,
                name="RELEASE_NOTES.md",
                append=i > 0,
                last_chunk=i == len(chunks) - 1,
            )
            await asyncio.sleep(0.2)
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()


card = AgentCard(
    name="Release Notes Agent",
    description="Собирает release notes из списка коммитов.",
    version="0.1.0",
    default_input_modes=["text/plain"],
    default_output_modes=["text/markdown"],
    capabilities=AgentCapabilities(streaming=True),
    supported_interfaces=[
        AgentInterface(protocol_binding="JSONRPC", url="http://127.0.0.1:9999/", protocol_version="1.0"),
        AgentInterface(protocol_binding="HTTP+JSON", url="http://127.0.0.1:9999/rest", protocol_version="1.0"),
    ],
    skills=[
        AgentSkill(
            id="release-notes",
            name="Release notes",
            description="Превращает список коммитов в раздел CHANGELOG.",
            tags=["changelog", "git"],
            examples=["fix: retry on 429\nfeat: add ListTasks"],
        )
    ],
)

handler = DefaultRequestHandler(
    agent_executor=ReleaseNotesExecutor(),
    task_store=InMemoryTaskStore(),
    agent_card=card,
)

routes = (
    create_agent_card_routes(card)
    + create_jsonrpc_routes(handler, "/")
    + create_rest_routes(handler, path_prefix="/rest")
)
app = Starlette(routes=routes)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9999)
