---
type: llm
focus: last_message
weight: 1
---
Pass only if the final answer assigns exactly these routes: request 1 → bug, request 2 → feature, request 3 → decision, request 4 → shipped, request 5 → new app, request 6 → trivial. Each of the six requests must get a single route; hedging between two routes, skipping a request, or merging two requests counts as wrong. Fail if the answer says it launched a workflow, wrote a spec, or edited a file.
