---
type: aws
title: Building Production-Ready Agents with OpenClaw on AWS
slug: openclaw-agents-session-aws-user-group-mumbai
topic_number:
date: 2026-06-27
date_modified:
keywords: [OpenClaw, autonomous AI agents, Amazon Bedrock AgentCore, AWS Lightsail, Amazon EC2, multi-tenancy, agent security, AWS Session Manager]
tags: [AI Agents, AWS, OpenClaw, Bedrock AgentCore, Security]
when_to_use: When you need to run an always-on, autonomous AI agent (not just a chatbot) that acts on your behalf across channels like WhatsApp or Slack, and you have to decide between self-hosting it on EC2/Lightsail or running it on a managed, session-isolated runtime like Bedrock AgentCore.
comparison_topic:
audience: intermediate
aws_doc_version: 2026-07-02
validated_against:
lecturer_name: Anirudh Sharma
lecturer_url: https://www.linkedin.com/in/anirudh-sharma-279248142/
session_name: AWS User Group Mumbai — Building Production-Ready Agents with OpenClaw on AWS
session_url: https://www.linkedin.com/company/awsugmum/
---

[collapsible-section o]
## Introduction

Think of a personal assistant you hire versus a call-center script you read from. The script only answers what it's asked, in the order it's written. A real assistant checks your calendar, books the table, and sends the follow-up email — without you asking for each step separately. ==**OpenClaw** is an open-source framework for building the second kind: **autonomous agents** that can take real actions on your behalf, not just answer questions.==

**OpenClaw** is a self-hosted, open-source personal AI assistant that connects to the messaging channels you already use — WhatsApp, Telegram, Slack, Discord, and others — and gives a foundation model the ability to read files, run terminal commands, browse the web, and call external tools. Where a standard chatbot only produces text, an OpenClaw agent is wired up with **skills** and **tools** that let it actually do things: create a file, check a website, or trigger a workflow.

The session, delivered at AWS User Group Mumbai on 27 June 2026 by Anirudh Sharma, focused specifically on the part most tutorials skip: what happens when you try to run OpenClaw in **production**, for more than one user, without it becoming a security incident. That question pulls in several AWS services — Amazon EC2, AWS Lightsail, Amazon EKS, AWS Session Manager, and Amazon Bedrock AgentCore — each representing a different point on the trade-off between cost, control, and isolation.

[image:aws-openclaw-agents-session-aws-user-group-mumbai-overview.png|High-level flow: a user message on WhatsApp/Slack travels through the OpenClaw Gateway to an agent, which uses skills and tools backed by a foundation model, running on an AWS compute option]

[/collapsible-section]

[collapsible-section]
## Agents vs. Chatbots vs. Harnesses

Three terms get used almost interchangeably in casual conversation, but the session drew a precise line between them, and the distinction matters for how you architect a deployment.

- **Chatbot** — a conversational interface that answers questions using a foundation model. Tools like a standard ChatGPT or Claude conversation fall here: you ask, it answers, nothing happens outside the chat window.
- **Harness** — a tool that wraps a foundation model with some built-in functions (read a file, run a command) but is invoked deliberately by a human, one task at a time, inside a specific environment such as a terminal or IDE. Claude Code, running on a developer's laptop, is an example — it has tools, but the human is still driving each interaction.
- **Autonomous agent** — a system that is handed a goal and a set of **skills**, **tools**, and a **foundation model**, and then decides for itself which tool to call, when, and in what order, to reach that goal — often continuing to act without a human confirming each individual step.

==The defining property of an autonomous agent is that the model itself decides what action to take next, not just what to say.== OpenClaw sits in this third category: give it a task like "watch this inbox and draft replies," and it will keep acting on new messages without being re-prompted each time.

[note]The instructor gave a direct example: integrating OpenClaw on a personal laptop using his own OS user account meant the agent could read local files and run any terminal command he could run — because it inherited his own permissions. This is the same principle as an IAM role: the agent's blast radius is exactly as large as the identity it runs as.[/note]

A useful real-world contrast raised in the session: a multinational customer wanted a **call-center agent** as the first point of contact for customer queries. A plain LLM-backed chatbot could answer simple FAQ-level questions, but a production call-center agent needs specific **skills**, access to a knowledge base (via retrieval-augmented generation), and the ability to escalate to a human for anything outside its defined scope — which is exactly the skill/tool/scaffolding model OpenClaw provides.

[/collapsible-section]

[collapsible-section]
## Core Architecture: Gateway, Agents, Skills, and Tools

OpenClaw's architecture is built around four pieces that fit together like a car's dashboard, driver, checklist, and engine.

**The Gateway** is the control plane — the dashboard. ==Every configuration action in OpenClaw, from creating an agent to installing a plugin to connecting a channel, happens through the Gateway==, which is accessible via a CLI or a web console. When you launch OpenClaw for the first time, the console issues an **access token** — an encoded string used to authenticate any client that talks to that Gateway.

**Agents** are the drivers. Each agent has its own persona, defined in a `SOUL.md` file — a markdown file that tells the agent who it is, how it should talk, and what its boundaries are (for example, "reply in under 500 characters" or "never discuss topics outside customer support"). Multiple agents can exist under a single Gateway, each potentially wired to a different channel or persona.

**Skills** are the checklist — they define *how* and *when* an agent should use a capability. A `SKILL.md` file describes a specific activity, like "searching the web when the agent doesn't know an answer," without containing the actual implementation code.

**Tools** are the engine — the actual executable capability behind a skill. Reading a file, writing a file, and making an HTTP request are all tools. A skill tells the agent when to reach for a tool; the tool is what actually runs.

[important]This distinction matters operationally: a **skill supply-chain risk** exists because OpenClaw supports importing community-published skills. Installing a skill you haven't reviewed means trusting code you haven't audited — the skill's underlying tool implementation and its package dependencies could be vulnerable or malicious.[/important]

The **foundation model** — Claude, GPT, or any other model, since OpenClaw is explicitly **model-agnostic** — is the brain. Skills and tools give that brain a body: without them, the model can only produce text; with them, it can act.

[image:aws-openclaw-agents-session-aws-user-group-mumbai-agentcore-architecture.png|OpenClaw's Gateway, agent personas (SOUL.md), skills (SKILL.md), and tools layered on top of a swappable foundation model]

[/collapsible-section]

[collapsible-section]
## Deployment Options on AWS

OpenClaw runs as a continuously-running process, which means it needs somewhere to live besides a personal laptop — the moment the laptop sleeps, the agent (and any channel connected to it, like a WhatsApp bot) goes offline. The session walked through four ways to host it, each with a different cost/control/isolation trade-off.

| Option | What it is | Startup experience | Best for |
|---|---|---|---|
| **AWS Lightsail** | A simplified VPS with a pre-built OpenClaw blueprint | Spin up in minutes from a blueprint; instance is billed continuously | Fast personal or small-team proof of concepts |
| **Amazon EC2** | Full virtual machine, more configuration control | CloudFormation templates can bootstrap OpenClaw into the instance's user data at launch | Teams needing custom networking, instance types, or Graviton |
| **Amazon EKS** | Kubernetes-based container orchestration | OpenClaw runs as a long-lived pod/daemon process | Teams already standardized on Kubernetes for other workloads |
| **Amazon Bedrock AgentCore** | Fully managed, serverless agent runtime | No always-on instance; a session spins up on demand | Production, multi-tenant, or compliance-sensitive deployments |

**Lightsail, EC2, and EKS** all share the same underlying trade-off: the instance (or pod) runs continuously, so you avoid a **cold start** — the agent is always warm and ready to answer — but you pay for that instance whether or not anyone is actively talking to the agent, and you are responsible for patching, scaling, and securing the VM yourself.

**Amazon Bedrock AgentCore** takes the opposite trade-off. It is a fully managed, serverless platform purpose-built for hosting production agents, with modular components — **Runtime** (the isolated execution environment), **Gateway** (turns APIs and Lambda functions into agent-callable tools), **Memory** (short- and long-term context storage), **Browser** (a managed Chromium runtime for agents to browse the web), **Identity** (credential brokering to downstream services), **Policy**, and **Observability**. Because sessions spin up on demand inside per-session micro-environments, a request that arrives when no session is already running experiences a **cold start** — typically in the low single-digit seconds — while the environment initializes. ==AgentCore's compute pricing only bills for active CPU and memory usage, not idle wait time==, which is why it can be more cost-efficient than an always-on EC2 instance for spiky or low-volume traffic.

[note]Graviton-based EC2 instances (AWS's ARM-based processor family) were specifically recommended for self-hosted OpenClaw deployments because they typically offer a lower cost-per-vCPU than comparable x86 instances for the same general-purpose workload.[/note]

[image:aws-openclaw-agents-session-aws-user-group-mumbai-deployment-options.png|Comparison of always-on Lightsail/EC2/EKS versus on-demand Bedrock AgentCore, highlighting the cold-start versus continuous-billing trade-off]

[/collapsible-section]

[collapsible-section]
## Multi-Tenancy and Isolation Models

Any team taking an agent to production for more than one customer or business unit runs into the same question: how do you make sure Customer A's data, sessions, and files never leak into Customer B's view? The session framed this using three standard multi-tenancy patterns.

**Pool model** — every user shares the same underlying resources: one compute instance, one database, one Gateway. It is the cheapest option, but ==isolation is weakest in the pool model because a bug or misconfiguration can expose one user's data to another==.

**Silo model** — every user gets their own fully dedicated set of resources (their own EC2 instance, their own database). Isolation is excellent, but cost scales linearly with the number of users — 10 customers means 10 separate stacks to provision, patch, and monitor.

**Bridge model** (also called a "pool-and-silo hybrid") — some resources are shared for cost efficiency, while sensitive resources are isolated per user. This is what most production systems settle on in practice: shared infrastructure where isolation doesn't matter, dedicated resources where it does.

[warning]OpenClaw's own documentation is explicit that its **Gateway is designed for a single user per instance**. If multiple people share one Gateway — for example, by adding an OpenClaw agent to a shared WhatsApp or Telegram group — every conversation with the agent flows through the same underlying session by default, and users can end up seeing each other's messages and data. The instructor demonstrated this happening on his own deployment after enabling channel sharing in a group chat.[/warning]

A tempting but incomplete fix is to put an Auto Scaling Group in front of multiple EC2 instances. ==This does not solve the multi-tenancy problem on its own, because each new instance still needs its own Gateway, its own access token, and its own per-user routing configuration== — you've multiplied the management overhead without eliminating the underlying one-Gateway-per-user constraint.

This is exactly the gap **Amazon Bedrock AgentCore** is designed to close: because AgentCore Runtime provisions an isolated micro-environment **per session** rather than per long-lived instance, many users can be served from the same platform without sharing a session, a Gateway, or file-system access with one another.

[image:aws-openclaw-agents-session-aws-user-group-mumbai-multi-tenancy.png|Pool, silo, and bridge multi-tenancy models compared against AgentCore's per-session isolation]

[/collapsible-section]

[collapsible-section]
## Security Model

Security was the largest single theme of the session, framed around a "seven layers" model of where an AI agent deployment can be attacked: the **foundational model**, the **data layer**, the **agent framework**, the **service/tooling layer**, **observability**, the **network**, and **credentials/insider access**. A few concrete risks anchored each layer.

**Credential exposure — SSH keys vs. Session Manager.** Before SSH keys, engineers connected to servers with a username and password, which was vulnerable to guessing. SSH keys improved on this with cryptographic signing, but ==an SSH key is still a long-lived credential — if a developer accidentally commits it to a public repository, anyone can use it until it is manually rotated==. **AWS Systems Manager Session Manager** removes this risk entirely: it connects you to an instance through the AWS control plane, using your IAM identity to check permissions, with no need to open inbound port 22 and no long-lived key to leak. An instance can sit in a fully private subnet, with no internet gateway at all, and still be reachable through Session Manager.

**Network exposure.** Publicly-reachable OpenClaw servers are searchable on the open internet, and once discovered, can potentially be queried to extract details about the underlying file system. ==Production agent deployments should sit inside a private subnet with no direct inbound path from the internet==, fronted by a layer-7 protection service (such as Amazon CloudFront) and continuously monitored (for example, with Amazon GuardDuty or a similar runtime security tool) for unusual access patterns.

**Prompt injection and skill supply-chain risk.** Because OpenClaw supports importing third-party skills, ==an imported skill can carry a vulnerable or malicious dependency without the person installing it realizing it==. Review a skill's underlying tool code before installing it, the same way you'd review a new npm or pip package.

**Data exfiltration via MCP.** The **Model Context Protocol (MCP)** gives an agent a standardized way to connect to external tools and systems — described in the session as being "like a USB port" for agents. MCP itself is not a security boundary: it just provides the connection. The agent — and the guardrails wrapped around it — still has to decide whether data returned from an MCP-connected tool should be trusted, and whether sensitive data should ever be sent out through it in the first place. **Amazon Bedrock Guardrails** can sit between an application and the foundation model to block sensitive data from crossing in either direction.

**Model training data leakage.** If a custom model is fine-tuned on data that includes sensitive information without careful review, that information can resurface in the model's generated responses later. Guardrails can be configured to block specific topic categories (e.g., speech that shouldn't be handled, or susceptibility to prompt injection) as an additional control layer.

**Insider access and audit logging.** ==Because an agent can execute real actions, knowing exactly which tools it called, with what parameters, and what output it received is not optional in a regulated industry — it's the evidence base for compliance.== This is especially critical for regulated sectors like banking, where a regulator (the session referenced RBI-style guidance as an example) may require proof that an agent's actions stayed within its defined capability boundary.

[image:aws-openclaw-agents-session-aws-user-group-mumbai-security-layers.png|The seven layers of AI agent attack surface: foundational model, data, agent framework, service/tooling, observability, network, and credentials/insider access]

[/collapsible-section]

[collapsible-section]
## Pricing

OpenClaw itself is free and open source — you are only billed for the AWS infrastructure it runs on and for foundation model inference (if you're calling a hosted model rather than a local one).

- **Lightsail**: fixed monthly rate per instance plan, billed continuously regardless of agent usage. Deleting the instance stops billing immediately, which is why the instructor called it "cost effective" for short-lived experimentation — spin it up, test, delete it.
- **EC2 / EKS**: standard on-demand (or reserved/spot) compute pricing for whatever instance type or node group you choose, plus storage and data transfer. Cost scales with instance size and uptime, not with how much the agent is actually doing.
- **Amazon Bedrock AgentCore**: consumption-based across its modular components. **Runtime** bills per vCPU-hour and per GB-hour of active use only — idle time waiting on a model response or a tool call is not charged. **Gateway** bills per tool call, **Memory** bills per stored/retrieved record, and **Identity** carries no additional charge when used through Runtime or Gateway. Foundation model inference (token usage) is billed separately at standard Amazon Bedrock rates on top of any AgentCore component charges.

[warning]Idle session accumulation is a common AgentCore cost surprise: sessions that aren't explicitly closed can continue to be billed until their timeout expires. Set an appropriate session timeout and clean up unused agents and Lightsail/EC2 instances to avoid ongoing charges.[/warning]

[/collapsible-section]

[collapsible-section]
## Security Best Practices

- Connect to any EC2-hosted Gateway using **AWS Session Manager**, not SSH keys — this removes the need to open port 22 and eliminates a long-lived credential entirely.
- Place OpenClaw's compute (EC2, Lightsail, or EKS nodes) inside a **private subnet** with no direct inbound internet access, and put a layer-7 control such as CloudFront or AWS WAF in front of anything that must be reachable externally.
- Never share a single Gateway across multiple end users. If more than one user needs access, either provision a per-user Gateway (silo model) or move to Bedrock AgentCore's per-session isolation.
- Review the source of any third-party **skill** before installing it — treat it with the same scrutiny as an unreviewed open-source package.
- Wrap agent-to-model traffic with **Amazon Bedrock Guardrails** to filter sensitive data flowing in either direction, and to block disallowed topic categories.
- Enable comprehensive audit logging of every tool call an agent makes — including parameters passed and output returned — especially in regulated industries.
- Grant the agent's identity (IAM role, OS user, or AgentCore Identity binding) only the minimum permissions it needs to perform its defined skills — the agent inherits exactly the blast radius of whatever identity it runs as.

[/collapsible-section]

[collapsible-section]
## Common Mistakes & Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Two users in the same group chat can see each other's replies from the agent | Channel/session sharing enabled on a single Gateway shared by multiple users | Disable channel sharing, or move each user to a dedicated Gateway/AgentCore session |
| Agent is slow to respond the very first time it's used after a period of inactivity | Cold start on a serverless runtime (Bedrock AgentCore) as a new session environment initializes | Expected behavior for serverless hosting — typically resolves within a few seconds; use an always-on instance if the workload cannot tolerate any cold start |
| Leaked SSH key found in a public repository | Committing a `.pem` file or key contents alongside application code | Rotate the key immediately, remove it from git history, and migrate to Session Manager going forward |
| Agent appears to have access to more files/commands than expected | Agent was integrated using a personal user account with broad local permissions | Run the agent under a scoped, dedicated identity with least-privilege access, not a personal admin account |
| Auto Scaling doesn't fix a multi-user data-isolation issue | Each new EC2 instance still requires its own Gateway and per-user configuration | Address the isolation problem architecturally (silo/bridge model or AgentCore), not just by adding compute |
| Unexpected AgentCore charges appear on the bill | Idle sessions not closed within the configured timeout, or Observability (billed through CloudWatch) left unmonitored | Set explicit session timeouts and review CloudWatch usage regularly |

[/collapsible-section]

[collapsible-section]
## Exam Tips

- **AWS Session Manager** is the standard exam answer whenever a scenario mentions "connect to an EC2 instance without opening inbound port 22" or "instance in a private subnet with no internet gateway."
- Remember the **cold start trade-off**: always-on compute (EC2, Lightsail, EKS) has no cold start but bills continuously; serverless/on-demand compute (Bedrock AgentCore, Lambda) has a cold start but bills only for active usage.
- ==Bedrock AgentCore Runtime bills for active CPU and memory consumption only — idle I/O wait time (waiting on a model or tool response) is not charged.== This is a frequently tested distinction versus traditional pre-allocated compute pricing.
- Know the three multi-tenancy patterns by name and trade-off: **pool** (cheapest, weakest isolation), **silo** (strongest isolation, highest cost), **bridge** (mixed).
- Graviton = **ARM-based** AWS-designed processor family, generally lower cost-per-vCPU than comparable x86 instances for general-purpose workloads.
- If a question describes an agent needing short-term and long-term memory of user preferences across sessions, the answer is **Bedrock AgentCore Memory**, not a manually-managed database (though AgentCore Memory can be backed by one under the hood).
- If a question describes exposing an internal API or Lambda function as a callable tool for an agent, the answer is **Bedrock AgentCore Gateway**.

[/collapsible-section]

[collapsible-section]
## Visualisation

[image:aws-openclaw-agents-session-aws-user-group-mumbai-overview.png|High-level flow: a user message on WhatsApp/Slack travels through the OpenClaw Gateway to an agent, which uses skills and tools backed by a foundation model, running on an AWS compute option]
[image:aws-openclaw-agents-session-aws-user-group-mumbai-agentcore-architecture.png|OpenClaw's Gateway, agent personas (SOUL.md), skills (SKILL.md), and tools layered on top of a swappable foundation model]
[image:aws-openclaw-agents-session-aws-user-group-mumbai-deployment-options.png|Comparison of always-on Lightsail/EC2/EKS versus on-demand Bedrock AgentCore, highlighting the cold-start versus continuous-billing trade-off]
[image:aws-openclaw-agents-session-aws-user-group-mumbai-multi-tenancy.png|Pool, silo, and bridge multi-tenancy models compared against AgentCore's per-session isolation]
[image:aws-openclaw-agents-session-aws-user-group-mumbai-security-layers.png|The seven layers of AI agent attack surface: foundational model, data, agent framework, service/tooling, observability, network, and credentials/insider access]
[image:aws-openclaw-agents-session-aws-user-group-mumbai-cheatsheet.png|One-page cheat sheet: deployment options, multi-tenancy models, and top security controls for running OpenClaw on AWS]

[/collapsible-section]

[collapsible-section]
## Implementation

### Console Setup — Deploying OpenClaw on Lightsail {#console-setup}

1. Open the Amazon Lightsail console and choose **Create instance**.
2. Under **Select a blueprint**, choose the OpenClaw blueprint (listed under app-based blueprints if available in your region, or launched from a template shared by the OpenClaw community).
3. Select an instance plan sized for a personal or small-team workload.
4. Launch the instance and wait for it to enter the **Running** state.
5. Connect to the instance and open the OpenClaw onboarding flow to generate a Gateway **access token**.
6. Use the access token to connect a channel (WhatsApp, Telegram, Slack, or Discord) to your new agent.

### AWS CLI — Connecting Securely via Session Manager {#aws-cli}

```bash
# Start a Session Manager session to an EC2-hosted OpenClaw Gateway
# (no inbound port 22 required — the instance can be in a private subnet)
aws ssm start-session --target i-0123456789abcdef0

# Check the Session Manager plugin is installed locally first
session-manager-plugin --version
```

### SDK (Python Boto3) — Calling an Agent Through Bedrock AgentCore {#sdk-python}

```python
import boto3

client = boto3.client("bedrock-agentcore")

response = client.invoke_agent_runtime(
    agentRuntimeArn="arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/my-openclaw-style-agent",
    payload={"input": {"text": "Summarize today's open support tickets"}},
)

print(response["completion"])
```

[/collapsible-section]

[collapsible-section]
## Overall Summary

[takeaways]
- OpenClaw is an open-source framework for building **autonomous agents** — systems that decide what action to take, not just what to say — distinct from chatbots and from harnesses like Claude Code.
- Its architecture has four layers: the **Gateway** (control plane), **agents** (persona via `SOUL.md`), **skills** (when/how to act, via `SKILL.md`), and **tools** (the actual executable capability).
- AWS offers a spectrum of hosting options: **Lightsail/EC2/EKS** are always-on and simple to start but bill continuously and require self-managed security; **Amazon Bedrock AgentCore** is serverless, session-isolated, and bills only for active usage.
- OpenClaw's Gateway is architecturally designed for **one user per instance** — sharing it across users without isolation controls is the single biggest production risk raised in the session.
- Multi-tenancy has three standard patterns: **pool** (shared, cheap, weak isolation), **silo** (dedicated, strong isolation, expensive), and **bridge** (a practical mix of both).
- **AWS Session Manager** replaces long-lived SSH keys for connecting to EC2 instances, removing the need to open inbound port 22.
- Security spans seven layers — model, data, agent framework, service/tooling, observability, network, and credentials/insider access — and needs a control at each layer, not just at the model.
- **Amazon Bedrock Guardrails** and comprehensive audit logging of tool calls are the two controls most directly tied to regulatory compliance for agent deployments.
- Cost model in one line: always-on compute (Lightsail/EC2/EKS) charges for uptime regardless of usage; Bedrock AgentCore charges only for active CPU/memory time plus per-call tool and memory usage.
[/takeaways]
[/collapsible-section]

[collapsible-section]
## Glossary

[glossary]
t: OpenClaw
d: An open-source, self-hosted framework for building autonomous AI agents that connect to messaging channels and can take real actions, not just answer questions.
e: e.g. Running OpenClaw with a WhatsApp channel lets you message an agent that can read files, run commands, and search the web on your behalf.
[/glossary]

[glossary]
t: Autonomous Agent
d: An AI system that is given a goal and a set of tools, then independently decides which actions to take and in what order to reach that goal.
e: e.g. An agent told to "monitor this inbox" keeps checking and drafting replies without being re-prompted for each new email.
[/glossary]

[glossary]
t: Agent Harness
d: A tool that wraps a foundation model with built-in functions but is invoked deliberately by a human for one task at a time.
e: e.g. Claude Code running in a terminal is a harness — a developer triggers each action rather than the model acting continuously on its own.
[/glossary]

[glossary]
t: Gateway
d: OpenClaw's control plane — the single point through which agents, skills, channels, and settings are configured.
e: e.g. All configuration for a new WhatsApp-connected agent happens by logging into the Gateway console.
[/glossary]

[glossary]
t: Skill
d: A definition of how and when an agent should use a capability, stored as a `SKILL.md` file, without the underlying implementation code.
e: e.g. A "web search" skill tells the agent to search online whenever it doesn't already know an answer.
[/glossary]

[glossary]
t: Tool
d: The actual executable capability behind a skill — the code that performs an action such as reading a file or making an HTTP request.
e: e.g. The tool behind a "web search" skill is the code that actually queries a search API.
[/glossary]

[glossary]
t: SOUL.md
d: The markdown file in OpenClaw that defines an agent's persona, tone, and behavioral boundaries.
e: e.g. A SOUL.md file might instruct an agent to always reply in under 500 characters and never discuss unrelated topics.
[/glossary]

[glossary]
t: Model Context Protocol (MCP)
d: A standardized protocol that lets an AI agent connect to external tools, data sources, and systems.
e: e.g. An agent uses an MCP server to query a company's internal ticketing system without a custom integration being written for it.
[/glossary]

[glossary]
t: Foundation Model
d: The underlying large language model that provides an agent's reasoning and language capabilities.
e: e.g. OpenClaw is model-agnostic, so the same agent configuration can run on Claude, GPT, or another model.
[/glossary]

[glossary]
t: Amazon Bedrock AgentCore
d: A fully managed, serverless AWS platform for building, deploying, and securing production AI agents at scale, with any framework or foundation model.
e: e.g. A team migrates a self-hosted agent to AgentCore to get per-session isolation without managing EC2 instances.
[/glossary]

[glossary]
t: AgentCore Runtime
d: The AgentCore component that provides a secure, serverless execution environment for an agent, billed for active CPU and memory usage only.
e: e.g. A support agent's Runtime session spins up when a customer messages it and shuts down after the conversation ends.
[/glossary]

[glossary]
t: AgentCore Gateway
d: The AgentCore component that turns APIs and Lambda functions into tools an agent can call, and connects to existing MCP servers.
e: e.g. An internal inventory API is exposed through AgentCore Gateway so an agent can check stock levels.
[/glossary]

[glossary]
t: AgentCore Memory
d: The AgentCore component that manages an agent's short-term (in-session) and long-term (cross-session) memory without custom infrastructure.
e: e.g. An agent remembers a returning customer's timezone and preferences across separate conversations using AgentCore Memory.
[/glossary]

[glossary]
t: AgentCore Browser
d: A managed, cloud-based Chromium browser runtime that lets an agent navigate and interact with live websites.
e: e.g. A research agent uses AgentCore Browser to pull the latest market data from a live webpage.
[/glossary]

[glossary]
t: Cold Start
d: The delay experienced the first time a serverless environment (such as an AgentCore Runtime session) has to initialize before it can respond.
e: e.g. The first message to an idle agent takes a few extra seconds while its session environment spins up.
[/glossary]

[glossary]
t: Multi-Tenancy
d: The architectural challenge of serving multiple customers or users from shared infrastructure while keeping their data and sessions isolated from one another.
e: e.g. A SaaS company must ensure Customer A's agent conversations never appear in Customer B's session.
[/glossary]

[glossary]
t: Pool Model
d: A multi-tenancy pattern where every user shares the same underlying resources, minimizing cost but weakening isolation.
e: e.g. Ten customers all use the same EC2 instance and database in a pool deployment.
[/glossary]

[glossary]
t: Silo Model
d: A multi-tenancy pattern where every user gets fully dedicated resources, maximizing isolation at higher cost.
e: e.g. Each enterprise customer gets their own EC2 instance and database in a silo deployment.
[/glossary]

[glossary]
t: Bridge Model
d: A multi-tenancy pattern that shares some resources across users while isolating sensitive resources per user.
e: e.g. All customers share a common Gateway front-end, but each has a dedicated agent session and data store.
[/glossary]

[glossary]
t: AWS Session Manager
d: An AWS Systems Manager capability that lets you connect to an EC2 instance through the AWS control plane using IAM permissions, without opening inbound port 22 or using SSH keys.
e: e.g. An instance in a fully private subnet with no internet gateway can still be reached for troubleshooting via Session Manager.
[/glossary]

[glossary]
t: Amazon EC2
d: AWS's resizable virtual server service, offering full control over the operating system and networking configuration.
e: e.g. A team runs OpenClaw on an EC2 instance bootstrapped via CloudFormation user data.
[/glossary]

[glossary]
t: AWS Lightsail
d: A simplified AWS compute service with pre-built blueprints, designed for fast setup with less configuration than raw EC2.
e: e.g. Launching OpenClaw from a Lightsail blueprint gets an instance running within minutes.
[/glossary]

[glossary]
t: Amazon Bedrock Guardrails
d: A configurable safety layer that can filter sensitive content and enforce topic restrictions on traffic flowing to and from a foundation model.
e: e.g. Guardrails block a customer's financial account number from being sent to the LLM in a support conversation.
[/glossary]

[glossary]
t: AWS Graviton
d: AWS's family of ARM-based processors, generally offering a lower cost-per-vCPU than comparable x86 instances for general-purpose workloads.
e: e.g. Running OpenClaw on a Graviton-based EC2 instance can reduce compute cost versus an equivalent x86 instance.
[/glossary]

[glossary]
t: Orchestrator Agent
d: An agent responsible for receiving a request, routing sub-tasks to specialized agents, and combining their responses into a single answer.
e: e.g. An orchestrator agent routes a billing question to a billing-specialist agent and a technical question to a support-specialist agent.
[/glossary]

[/collapsible-section]

[collapsible-section]
## Interview Questions

[interview]
q: What is OpenClaw and what problem does it solve?
a: OpenClaw is an open-source, self-hosted framework for building autonomous AI agents that connect to everyday messaging channels and can take real actions — not just answer questions. It solves the gap between "chatbots that talk" and "agents that do," letting teams build custom assistants without starting an agent framework from scratch.
d: easy
cat: complexity
[/interview]

[interview]
q: What is the difference between an agent and a standard chatbot?
a: A chatbot produces text in response to a prompt and stops there. An agent is handed a goal along with tools and skills, and independently decides what action to take next — including calling tools, chaining multiple steps, and continuing to act without a human re-prompting each step.
d: easy
cat: complexity
[/interview]

[interview]
q: What is a "harness," and how does Claude Code fit that description?
a: A harness wraps a foundation model with built-in tools but is driven deliberately by a human, one task at a time. Claude Code running in a terminal is a harness — a developer triggers each action, so it isn't autonomously deciding what to do next the way an agent is.
d: easy
cat: complexity
[/interview]

[interview]
q: What is the Gateway in OpenClaw's architecture?
a: The Gateway is OpenClaw's control plane — the single place where agents, skills, plugins, and channel connections are configured and managed, accessible via CLI or a web console.
d: easy
cat: complexity
[/interview]

[interview]
q: Name three AWS options for hosting OpenClaw and one thing that distinguishes them.
a: Lightsail, EC2, and EKS all keep an instance running continuously, so there's no cold start but you pay for uptime regardless of usage. Amazon Bedrock AgentCore is serverless and session-based, so it has a brief cold start but only bills for active usage.
d: easy
cat: implementation
[/interview]

[interview]
q: What is the difference between a "skill" and a "tool" in OpenClaw?
a: A skill defines how and when an agent should use a capability — the decision logic. A tool is the actual code that performs the action. The skill is the instruction manual; the tool is the machine it operates.
d: easy
cat: complexity
[/interview]

[interview]
q: Why is AWS Session Manager considered more secure than SSH keys for connecting to an EC2 instance?
a: SSH keys are long-lived credentials that, if leaked (for example, committed to a public repository), grant standing access until manually rotated. Session Manager authenticates through IAM and the AWS control plane, requires no open inbound port, and leaves no long-lived key that can be exposed.
d: easy
cat: application
[/interview]

[interview]
q: What communication channels can OpenClaw integrate with?
a: The session demonstrated WhatsApp, Telegram, Slack, and Discord as supported channels, each configurable independently from the Gateway.
d: easy
cat: implementation
[/interview]

[interview]
q: What is Amazon Bedrock AgentCore in one sentence?
a: It's AWS's fully managed, serverless platform for building, running, and securing production AI agents at scale, with per-session isolation and consumption-based pricing.
d: easy
cat: complexity
[/interview]

[interview]
q: Walk me through what happens architecturally when a user sends a WhatsApp message to an OpenClaw agent running on EC2.
a: The message hits the channel integration configured in the Gateway, which routes it to the relevant agent's session. The agent (using its SOUL.md persona and available skills) decides whether it needs a tool — for example, a web search — calls that tool if needed, and the foundation model composes a reply, which the Gateway sends back through the WhatsApp channel.
d: medium
cat: implementation
[/interview]

[interview]
q: Your team wants to run OpenClaw cost-effectively for a quick proof of concept. Which AWS service would you pick and why?
a: (Situation) The team needs a fast, low-cost proof of concept, not a production deployment. (Task) Get OpenClaw running with minimal setup time. (Action) I'd launch it from the Lightsail blueprint, since it spins up in minutes with a fixed, predictable monthly cost. (Result) The team can test OpenClaw's capabilities immediately and delete the instance the moment testing wraps up, stopping billing right away.
d: medium
cat: application
[/interview]

[interview]
q: Explain the cold start trade-off between EC2/Lightsail and Bedrock AgentCore.
a: EC2 and Lightsail keep an instance running all the time, so there's never a cold start, but you pay for that uptime whether or not the agent is being used. AgentCore only provisions a session's execution environment when a request comes in, so idle time is free, but the very first request to a cold session incurs a short initialization delay.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: A user reports that after enabling channel sharing in a group chat, other members can see their private conversation with the agent. What's the root cause?
a: (Situation) The agent was added to a shared group channel with "channel sharing" enabled. (Task) Diagnose why messages are visible across users. (Action) I'd check the Gateway's session configuration — by default, OpenClaw's Gateway is designed for one user per instance, so a shared channel routes all users' conversations through the same underlying session. (Result) The fix is either disabling channel sharing so each user gets a distinct session, or migrating to a per-user Gateway or AgentCore's per-session isolation.
d: medium
cat: application
[/interview]

[interview]
q: What is the purpose of the SOUL.md and SKILL.md files in OpenClaw?
a: SOUL.md defines an agent's persona and behavioral boundaries — who it is and how it should respond. SKILL.md files define specific capabilities the agent has access to and the conditions under which it should use them, separate from the underlying tool implementation.
d: medium
cat: implementation
[/interview]

[interview]
q: Why does the instructor recommend Graviton-based instances for running OpenClaw?
a: Graviton is AWS's ARM-based processor family, which typically offers a lower cost-per-vCPU than comparable x86 instances for general-purpose workloads — a meaningful saving for a continuously-running agent host.
d: medium
cat: application
[/interview]

[interview]
q: What role does an orchestrator agent play when a company deploys multiple specialized agents?
a: The orchestrator agent receives the incoming request, determines which specialized sub-agent's skill set matches the task, routes the work to that agent, and combines the responses back into a single reply to the user.
d: medium
cat: complexity
[/interview]

[interview]
q: How does Amazon Bedrock AgentCore Memory improve a customer-facing agent's usefulness over time?
a: AgentCore Memory stores both short-term (in-session) and long-term (cross-session) context, so an agent can recall a returning user's preferences — like timezone or past requests — without re-asking, without the team having to build and manage that memory infrastructure themselves.
d: medium
cat: implementation
[/interview]

[interview]
q: What is a skill supply-chain attack in the context of OpenClaw, and how could it occur?
a: OpenClaw supports importing community-published skills. If a skill's underlying tool code or its package dependencies are vulnerable or malicious, installing it without review can introduce that vulnerability directly into the agent's capabilities — the same risk profile as pulling in an unreviewed open-source dependency.
d: medium
cat: application
[/interview]

[interview]
q: Why is placing an agent's compute resources in a private subnet considered a best practice before moving to production?
a: Publicly-reachable agent servers can be discovered and queried by attackers to extract information about the underlying system. Keeping the compute in a private subnet, with no direct inbound internet path, removes that exposure while still allowing management access via Session Manager and controlled outbound access via a layer-7 gateway.
d: medium
cat: application
[/interview]

[interview]
q: Design considerations: how would you architect a multi-tenant OpenClaw-based support system for 50 enterprise customers so that no customer can see another's data?
a: I'd avoid a pure pool deployment given the customer count and sensitivity, and lean toward a bridge model: a shared front-end/routing layer for cost efficiency, but a dedicated agent session, memory store, and access token per customer. For true production-grade isolation without managing 50 separate Gateways, I'd evaluate migrating the runtime to Bedrock AgentCore, where each session is isolated by the platform itself rather than by infrastructure I have to provision per customer.
d: hard
cat: tradeoffs
[/interview]

[interview]
q: Compare the pool, silo, and bridge multi-tenancy models and explain when each is appropriate.
a: Pool shares everything across users — cheapest, but weakest isolation, appropriate only when data sensitivity is low. Silo dedicates everything per user — strongest isolation, but cost and operational overhead scale linearly with tenants, appropriate for high-sensitivity or regulated customers. Bridge shares low-sensitivity infrastructure while isolating sensitive resources per user, which is the pattern most production SaaS systems land on because it balances cost against risk.
d: hard
cat: tradeoffs
[/interview]

[interview]
q: A financial services company must prove regulatory compliance for their AI agents. What logging and governance controls would you put in place?
a: I'd implement comprehensive audit logging of every tool call the agent makes — including parameters passed and outputs received — so there's a full trail of what actions the agent took and why. I'd pair that with Bedrock Guardrails to enforce topic and data restrictions, IAM policies scoping the agent to only the actions it's authorized for, and alerting that fires the moment the agent attempts an action outside its defined boundary.
d: hard
cat: application
[/interview]

[interview]
q: Explain why "one Gateway per user" is a hard architectural constraint in OpenClaw and what breaks if it's violated at scale.
a: The Gateway is a single control plane instance tied to one running process — it isn't designed to partition sessions between multiple distinct users on its own. If violated, all users sharing that Gateway share the same underlying session context by default, meaning messages, file access, and conversation history can bleed across users — a data isolation failure, not just a performance issue.
d: hard
cat: tradeoffs
[/interview]

[interview]
q: How would you use Amazon Bedrock Guardrails together with an OpenClaw-style agent to prevent sensitive data leakage in both directions?
a: I'd configure Guardrails to sit between the application layer and the model call: filtering outbound prompts so sensitive fields (like account numbers) never reach the model, and filtering the model's generated responses before they're returned to the user or downstream tool, in case the model attempts to surface information it shouldn't. This gives you a policy enforcement point independent of the agent's own (potentially compromised) decision-making.
d: hard
cat: implementation
[/interview]

[interview]
q: You're advising a client moving from a single EC2-hosted OpenClaw gateway to a production multi-tenant deployment on Bedrock AgentCore. What migration risks and architectural changes would you flag?
a: I'd flag that the mental model shifts from "one long-lived process holding all state" to "per-session isolated environments," which means any assumption of persistent local state (files written to the instance, in-memory session data) needs to move to AgentCore Memory or an external store. I'd also flag cold-start latency for the first request per session, the need to re-map skills/tools to AgentCore Gateway-exposed APIs and Lambda functions, and a cost-model change from fixed instance billing to consumption-based billing that needs new usage forecasting.
d: expert
cat: tradeoffs
[/interview]

[interview]
q: Given the seven layers of AI agent attack surface (foundational model, data, agent framework, service/tooling, observability, network, insider/credentials), design a defense-in-depth strategy mapping specific AWS controls to each layer.
a: Foundational model layer — Bedrock Guardrails for topic/content restrictions. Data layer — encryption at rest/in transit and least-privilege IAM on any data store the agent touches. Agent framework layer — reviewed, pinned skill/tool dependencies and scoped execution identities. Service/tooling layer — AgentCore Gateway or a controlled API layer instead of direct, unrestricted tool access. Observability layer — CloudWatch Logs/CloudTrail plus AgentCore Observability for full tool-call tracing. Network layer — private subnets, no inbound internet path, CloudFront/WAF for any public entry point. Credentials/insider layer — Session Manager instead of SSH keys, short-lived credentials via AgentCore Identity, and audit logging of all administrative access.
d: expert
cat: tradeoffs
[/interview]

[/collapsible-section]

[collapsible-section]
## Multiple Choice Questions

[mcq]
q: What is OpenClaw primarily designed to create?
o: A chatbot that only answers questions | An autonomous agent that can take actions on your behalf | A relational database service | A static website hosting platform
c: 1
e: OpenClaw is explicitly built to create autonomous agents — systems that decide what actions to take, not just what to say — using skills, tools, and a foundation model.
w: A pure chatbot only produces text and can't act. OpenClaw is not a database or hosting service.
d: beginner
[/mcq]

[mcq]
q: According to the session, what distinguishes an agent from a chatbot like a standard ChatGPT conversation?
o: Agents are always cheaper to run | Agents can independently decide to take actions using tools, not just produce text | Chatbots require more compute than agents | There is no real difference between the two
c: 1
e: The defining property of an agent is autonomous action-taking — deciding which tool to call and when — while a chatbot's output is limited to conversational text.
w: Cost isn't the distinguishing factor. Compute requirements vary by implementation, not by category. The session drew an explicit distinction between the two.
d: beginner
[/mcq]

[mcq]
q: Which AWS compute service was described as the fastest way to get OpenClaw running from a pre-built blueprint?
o: Amazon EC2 | AWS Lambda | Amazon Lightsail | Amazon EKS
c: 2
e: Amazon Lightsail offers pre-built blueprints that let you launch an application like OpenClaw within minutes with minimal configuration.
w: EC2 requires more manual setup even with CloudFormation. AWS Lambda isn't suited to a continuously-running gateway process. EKS requires cluster setup and container orchestration knowledge.
d: beginner
[/mcq]

[mcq]
q: What does AWS Session Manager remove the need for when connecting to an EC2 instance?
o: Opening an inbound rule for port 22 | An IAM role | A VPC | An Elastic IP address
c: 0
e: Session Manager connects through the AWS control plane using IAM permissions, so there's no need to open port 22 for SSH access.
w: An IAM role is still required (it's how Session Manager authorizes the connection). A VPC is still needed to host the instance. An Elastic IP is unrelated to how Session Manager authenticates.
d: beginner
[/mcq]

[mcq]
q: Which AWS service is recommended as the enterprise-grade, serverless option for running production AI agents?
o: Amazon Bedrock AgentCore | Amazon Lightsail | AWS Elastic Beanstalk | Amazon EC2
c: 0
e: Amazon Bedrock AgentCore is AWS's purpose-built, fully managed, serverless platform for production AI agent hosting with per-session isolation.
w: Lightsail and EC2 are always-on, self-managed compute, not serverless agent platforms. Elastic Beanstalk is a general application deployment service, not agent-specific.
d: beginner
[/mcq]

[mcq]
q: In OpenClaw's architecture, what is the "Gateway"?
o: The control plane used to configure agents, skills, and channels | A load balancer for HTTP traffic | A CDN edge location | A database connection proxy
c: 0
e: The Gateway is OpenClaw's control plane — every configuration action for agents, skills, plugins, and channels happens through it.
w: The Gateway is not a networking load balancer, CDN, or database component — those are unrelated AWS/infrastructure concepts.
d: beginner
[/mcq]

[mcq]
q: What type of processor architecture do AWS Graviton instances use?
o: x86 | ARM | SPARC | PowerPC
c: 1
e: Graviton is AWS's family of ARM-based processors, generally offering a lower cost-per-vCPU for general-purpose workloads compared to x86.
w: x86 is the traditional Intel/AMD architecture, not Graviton. SPARC and PowerPC are unrelated legacy architectures not used by Graviton.
d: beginner
[/mcq]

[mcq]
q: What is a "skill" in OpenClaw?
o: The actual code that performs an action | A definition of how and when an agent should use a capability | An IAM permission policy | A CloudWatch alarm
c: 1
e: A skill describes when and how an agent should use a capability — the decision logic — separate from the underlying implementation code.
w: The actual executing code is the tool, not the skill. IAM policies and CloudWatch alarms are unrelated AWS concepts.
d: beginner
[/mcq]

[mcq]
q: What is a "tool" in OpenClaw?
o: The actual capability or code that performs an action | A markdown file describing an agent's persona | A billing dashboard | A messaging channel like WhatsApp
c: 0
e: A tool is the executable code behind a capability — for example, the code that actually performs a web search or writes a file.
w: The persona file is SOUL.md, not a tool. Billing dashboards and channels are unrelated to the skill/tool distinction.
d: beginner
[/mcq]

[mcq]
q: Which file in OpenClaw defines the persona and identity of an agent?
o: SOUL.md | SKILL.md | requirements.txt | Dockerfile
c: 0
e: SOUL.md defines an agent's persona, tone, and behavioral boundaries.
w: SKILL.md defines capabilities, not persona. requirements.txt and Dockerfile are generic project files unrelated to agent persona.
d: beginner
[/mcq]

[mcq]
q: What is the defining risk of running OpenClaw's Gateway on a single instance shared by multiple users?
o: Users may see each other's chat sessions and data | Higher AWS billing only | Slower CPU performance only | Loss of Graviton compatibility
c: 0
e: OpenClaw's Gateway is designed for one user per instance; sharing it across multiple users without isolation controls can expose one user's session and data to another.
w: The core issue is data/session isolation, not just cost or performance, and it has nothing to do with processor architecture compatibility.
d: beginner
[/mcq]

[mcq]
q: Which communication channels were shown as supported by OpenClaw in the session?
o: WhatsApp, Discord, Telegram, and Slack | Only email | Only SMS | Only video calls
c: 0
e: The session demonstrated integration with WhatsApp, Discord, Telegram, and Slack as connected channels.
w: Email, SMS, and video calls were not the channels demonstrated in the session.
d: beginner
[/mcq]

[mcq]
q: Which of the following is the traditional, cost-heavy multi-tenancy approach where every user gets fully dedicated resources?
o: Pool | Silo | Bridge | Serverless
c: 1
e: The silo model dedicates a complete, separate set of resources to each user, maximizing isolation at the cost of linear scaling of infrastructure per tenant.
w: Pool shares resources across users. Bridge mixes shared and dedicated resources. "Serverless" is a hosting model, not a multi-tenancy pattern.
d: intermediate
[/mcq]

[mcq]
q: In the pool multi-tenancy model, what is the main security trade-off?
o: Higher cost than silo | Every user shares the same resources, increasing isolation risk | No isolation is possible at all | It cannot run on AWS
c: 1
e: In the pool model, all users share the same underlying resources, which is the cheapest option but creates the highest risk of one user's data being exposed to another.
w: Pool is actually the cheapest option, not the most expensive. Some isolation is still possible through application-level controls, just weaker than silo/bridge. It can absolutely run on AWS.
d: intermediate
[/mcq]

[mcq]
q: What causes a "cold start" when using Amazon Bedrock AgentCore?
o: A new session environment must initialize because it wasn't already running | The Gateway access token has expired | An IAM role was deleted | DNS propagation delay
c: 0
e: AgentCore provisions execution environments on a per-session basis; a request that arrives when no session is already warm triggers initialization, causing a brief delay.
w: Token expiry, IAM role deletion, and DNS propagation are unrelated to the serverless cold-start mechanism.
d: intermediate
[/mcq]

[mcq]
q: What does Amazon Bedrock AgentCore Memory provide?
o: Short-term and long-term memory of user context across sessions | Encrypted EBS volumes | Auto Scaling for EC2 fleets | A CDN cache for static assets
c: 0
e: AgentCore Memory manages both in-session (short-term) and cross-session (long-term) context so an agent can recall user preferences without custom infrastructure.
w: EBS encryption, Auto Scaling, and CDN caching are unrelated AWS features, not part of AgentCore Memory.
d: intermediate
[/mcq]

[mcq]
q: What is the purpose of the AgentCore Browser component?
o: A managed, cloud-based Chromium browser runtime for agents to browse live websites | A developer IDE for writing agent code | A CloudFormation stack viewer | A billing dashboard for AgentCore usage
c: 0
e: AgentCore Browser provides a fast, secure, cloud-hosted browser environment specifically so agents can interact with live web content.
w: It is not a code editor, a CloudFormation viewer, or a billing tool — those are unrelated AWS concepts.
d: intermediate
[/mcq]

[mcq]
q: Which AWS capability can enforce filtering of sensitive data flowing between an application and a foundation model?
o: Amazon Bedrock Guardrails | AWS WAF | Amazon Route 53 | AWS Config
c: 0
e: Bedrock Guardrails sit between the application and the model, filtering sensitive data and disallowed content in both directions.
w: WAF protects web applications from common exploits, not model traffic specifically. Route 53 is DNS. AWS Config tracks resource configuration compliance, not content filtering.
d: intermediate
[/mcq]

[mcq]
q: Which layer of the seven-layer AI agent attack surface represents the underlying LLM itself?
o: The foundational model layer | The observability layer | The network layer | The credentials/insider layer
c: 0
e: The foundational model layer refers to the LLM at the core of the agent, which can itself be a target — for example, through prompt injection or unsafe fine-tuning data.
w: Observability concerns monitoring and logging. Network concerns exposure and connectivity. Credentials/insider concerns access management — none of these are the model itself.
d: intermediate
[/mcq]

[mcq]
q: What attack type involves importing a vulnerable or malicious skill package into an agent?
o: Skill/dependency supply-chain attack | Cross-site scripting | SQL injection | DNS spoofing
c: 0
e: Because OpenClaw supports importing third-party skills, an unreviewed skill can carry a vulnerable or malicious tool implementation or dependency — a supply-chain risk.
w: Cross-site scripting, SQL injection, and DNS spoofing are unrelated web/network attack categories, not specific to importing agent skills.
d: intermediate
[/mcq]

[mcq]
q: Why is exposing an agent's server directly to the internet considered risky?
o: Attackers can query it to extract information about the underlying file system | It increases AWS costs significantly | It disables CloudWatch logging automatically | It requires a paid AWS support plan
c: 0
e: Publicly-reachable agent servers can be discovered and queried by attackers to try to extract details about the underlying system, which is why private-subnet placement is recommended.
w: Direct internet exposure doesn't inherently change AWS pricing, doesn't disable logging, and has no relationship to support plan tiers.
d: intermediate
[/mcq]

[mcq]
q: What networking control was recommended to keep an agent deployment isolated in production?
o: Placing the compute inside a private subnet with no direct inbound internet access | Assigning it a public Elastic IP address | Disabling all IAM roles | Enabling public read access on the associated storage
c: 0
e: Keeping compute in a private subnet with no direct inbound path from the internet, combined with a layer-7 protection service for any needed public entry point, reduces the attack surface.
w: A public Elastic IP increases exposure rather than reducing it. Disabling IAM roles removes access control rather than improving security. Public storage access is a data exposure risk, not a fix.
d: intermediate
[/mcq]

[mcq]
q: Which AWS service was mentioned for layer-7 application protection in front of an agent deployment?
o: Amazon CloudFront | Amazon RDS | AWS Glue | AWS Batch
c: 0
e: Amazon CloudFront (often paired with AWS WAF) can provide layer-7 application protection for a publicly-reachable endpoint in front of a private backend.
w: RDS is a managed database service, Glue is a data integration/ETL service, and Batch is for batch computing jobs — none provide layer-7 protection.
d: intermediate
[/mcq]

[mcq]
q: What is the difference between a "tool" and an "MCP server" as discussed in the session?
o: A tool is a specific capability an agent can call; MCP is a protocol that standardizes how agents connect to external tools and systems | They are exactly the same thing with different names | MCP servers only work with Amazon Bedrock | Tools cannot use MCP under any circumstance
c: 0
e: A tool is the specific executable capability; MCP is a broader, standardized connection protocol that can expose many tools/systems to an agent without custom point-to-point integrations.
w: They are related but distinct concepts, not synonyms. MCP is not exclusive to Bedrock — it's a general protocol. Tools frequently are exposed to agents through MCP.
d: intermediate
[/mcq]

[mcq]
q: A company runs a single OpenClaw Gateway shared across 10 different enterprise customers. Which multi-tenancy limitation makes this unsafe for production?
o: One Gateway is designed to serve a single user, so sessions and data can bleed across customers | EC2 cannot run more than one process at a time | Graviton instances do not support multiple users | Lightsail blueprints expire automatically after 24 hours
c: 0
e: OpenClaw's Gateway architecture assumes one user per instance; sharing it across many customers without per-user isolation can expose one customer's session and data to another.
w: EC2 can run many processes concurrently. Graviton's ARM architecture has nothing to do with user isolation. Lightsail blueprints don't have an inherent 24-hour expiry.
d: advanced
[/mcq]

[mcq]
q: Why doesn't simply adding an Auto Scaling Group of EC2 instances solve OpenClaw's multi-tenancy problem?
o: Each new instance still requires its own Gateway and per-user configuration, multiplying management overhead | Auto Scaling Groups cannot run containerized workloads | Auto Scaling Groups are always more expensive than Lightsail | Auto Scaling Groups automatically disable IAM roles
c: 0
e: Scaling out EC2 instances doesn't remove the underlying constraint that each Gateway is tied to a specific user configuration — you now have more Gateways to manage individually rather than a solved isolation problem.
w: Auto Scaling Groups can absolutely run containers. Cost varies by configuration, not a fixed rule versus Lightsail. IAM roles are unaffected by Auto Scaling Group usage.
d: advanced
[/mcq]

[mcq]
q: What is the key architectural reason Amazon Bedrock AgentCore is recommended over EC2/Lightsail for multi-tenant production agent deployments?
o: It isolates each session in its own environment, giving per-session isolation without managing per-user Gateways | It is the only AWS service that supports WhatsApp integration | It eliminates the need for a foundation model entirely | It provides unlimited free usage for any number of users
c: 0
e: AgentCore provisions an isolated execution environment per session, so many users can be served without sharing a Gateway, session, or file system with one another — solving the isolation problem architecturally rather than by adding more manually-managed instances.
w: WhatsApp integration is handled at the channel/application layer, not tied specifically to AgentCore. A foundation model is still required for reasoning. AgentCore is consumption-based, not free.
d: advanced
[/mcq]

[mcq]
q: A regulated bank must prove exactly which tools an agent executed, with what parameters, and what output was returned. Which capability does this require?
o: Comprehensive audit logging and observability of agent tool execution | A larger EC2 instance type | A public Gateway endpoint | Disabling all skills entirely
c: 0
e: Proving exactly what an agent did requires detailed logging of every tool call, its parameters, and its output — this is what audit logging and observability capabilities (like AgentCore Observability, CloudWatch, and CloudTrail) are built to provide.
w: Instance size, endpoint exposure, and disabling skills don't address the requirement to trace and prove agent actions.
d: advanced
[/mcq]

[mcq]
q: What is the architectural trade-off of the bridge multi-tenancy model compared to pure pool or pure silo?
o: It shares some resources for cost efficiency while isolating sensitive resources per user, balancing cost against isolation | It has no security benefit over the pool model | It is always more expensive than the silo model | It cannot be implemented on AWS
c: 0
e: The bridge model deliberately mixes shared and dedicated resources — cheaper than full silo, more isolated than full pool — making it the most common real-world compromise for production multi-tenant systems.
w: Bridge does provide meaningfully better isolation than pure pool. It's typically cheaper than full silo, not more expensive. It can be implemented on AWS using standard isolation techniques like per-tenant IAM roles and resource tagging.
d: advanced
[/mcq]

[mcq]
q: Why is MCP described as needing separate security consideration from the agent's own decision-making?
o: MCP simply provides a connection to external tools/systems; the agent must still independently decide whether returned data should be trusted or acted on | MCP replaces the need for IAM entirely | MCP automatically encrypts all agent traffic | MCP only works inside Amazon Bedrock
c: 0
e: MCP is a connection protocol, not a trust or security boundary — like a USB port, it enables a connection, but doesn't decide what's safe to do with what comes through it. That decision still rests with the agent and any guardrails wrapped around it.
w: MCP does not replace IAM-based access control, does not automatically provide encryption, and is a general protocol usable outside of Amazon Bedrock.
d: advanced
[/mcq]

[mcq]
q: Which of the following is NOT one of the seven layers of AI agent attack surface discussed in the session?
o: Foundational model layer | Data layer | Billing layer | Network layer
c: 2
e: The seven layers discussed were the foundational model, data, agent framework, service/tooling, observability, network, and credentials/insider access — billing is not one of the security layers described.
w: Foundational model, data, and network are all explicitly named layers in the framework discussed in the session.
d: advanced
[/mcq]

[mcq]
q: Why did the instructor say long-lived SSH keys are a greater risk than they may initially appear for an OpenClaw EC2 deployment?
o: A leaked key committed to a public repository grants durable, standing access until manually rotated or revoked | SSH keys expire automatically after a single use | SSH keys are incompatible with Graviton instances | SSH keys are region-locked to a single AWS Region
c: 0
e: Unlike a temporary, IAM-authenticated Session Manager connection, an SSH key remains valid indefinitely once issued — if it leaks (for example, via an accidental commit to a public repo), it provides ongoing access until someone notices and manually revokes it.
w: SSH keys do not expire after one use, are fully compatible with Graviton instances, and are not tied to a specific AWS Region.
d: advanced
[/mcq]

[/collapsible-section]

[collapsible-section]
## Hands-On Projects

[hands-on]
[project]
title: Project 1: Deploy OpenClaw on Amazon Lightsail Using the Official Blueprint
objective: Launch a working OpenClaw Gateway on Lightsail, connect a channel, and confirm secure access before cleaning up.
time: 30-45 min
cost: Lightsail's smallest plan is billed at its standard hourly-equivalent monthly rate — delete the instance immediately after the exercise to stop billing.
prereqs: AWS account | Basic familiarity with the AWS Management Console | A messaging account (WhatsApp, Telegram, Slack, or Discord) to connect as a test channel
step: Sign in to the AWS Management Console and navigate to the Amazon Lightsail console
screenshot: screenshot-lightsail-console-home.png | Screenshot showing the Lightsail console landing page with the "Create instance" button visible
[screenshot-guide]
file: screenshot-lightsail-console-home.png
task: Task 1: Launch the Lightsail instance
step: Open the Lightsail console home page
show: The Lightsail dashboard with the "Create instance" button clearly visible in the top area of the page
note: Capture the full dashboard width so the button is unambiguous
[/screenshot-guide]
step: Click Create instance and select the OpenClaw application blueprint (or a shared community template if the official blueprint isn't listed in your region)
screenshot: screenshot-select-blueprint.png | Screenshot showing the blueprint selection screen with the OpenClaw option highlighted
[screenshot-guide]
file: screenshot-select-blueprint.png
task: Task 1: Launch the Lightsail instance
step: Select the OpenClaw blueprint from the application list
show: The blueprint grid with the OpenClaw tile visibly selected/highlighted
[/screenshot-guide]
step: Choose an instance plan sized for a small proof of concept and click Create instance
screenshot: screenshot-instance-plan-selected.png | Screenshot showing the chosen instance plan and the final Create instance button before launch
[screenshot-guide]
file: screenshot-instance-plan-selected.png
task: Task 1: Launch the Lightsail instance
step: Confirm the instance plan and launch
show: The selected plan's price and specs, with the Create instance button visible at the bottom
[/screenshot-guide]
step: Wait for the instance status to change from Pending to Running
screenshot: screenshot-instance-running.png | Screenshot showing the instance list with the new instance's status badge reading "Running"
[screenshot-guide]
file: screenshot-instance-running.png
task: Task 1: Launch the Lightsail instance
step: Verify the instance has finished launching
show: The instance row with a green "Running" status badge clearly visible
[/screenshot-guide]
step: Open the instance's public IP or connect via the browser-based SSH client, and complete the OpenClaw onboarding flow to generate a Gateway access token
screenshot: screenshot-gateway-access-token.png | Screenshot showing the generated Gateway access token in the onboarding screen (redact/blur the actual token value before sharing)
[screenshot-guide]
file: screenshot-gateway-access-token.png
task: Task 2: Configure the Gateway and connect a channel
step: Complete onboarding to generate the access token
show: The onboarding success screen showing a generated access token field
note: Blur or redact the actual token characters before sharing this screenshot publicly
[/screenshot-guide]
step: In the Gateway console, add a channel (for example, Telegram) using a test bot token, and confirm the channel shows a Connected status
screenshot: screenshot-channel-connected.png | Screenshot showing the channel configuration panel with the new channel's status set to "Connected"
[screenshot-guide]
file: screenshot-channel-connected.png
task: Task 2: Configure the Gateway and connect a channel
step: Verify the channel connection succeeded
show: The channel list with the new channel's status clearly showing "Connected"
[/screenshot-guide]
step: Send a test message through the connected channel and confirm the agent responds
screenshot: screenshot-test-message-response.png | Screenshot showing the chat thread with the test message and the agent's reply visible
[screenshot-guide]
file: screenshot-test-message-response.png
task: Task 3: Verify the agent responds
step: Send a message and confirm a reply
show: Both the outgoing test message and the agent's incoming reply in the same chat thread
[/screenshot-guide]
step: [warning]Cleanup — delete the Lightsail instance from the console once testing is complete to stop billing immediately[/warning]
screenshot: screenshot-instance-deleted.png | Screenshot showing the instance list with the test instance no longer present, confirming deletion
[screenshot-guide]
file: screenshot-instance-deleted.png
task: Task 4: Clean up
step: Delete the instance and confirm it no longer appears
show: The Lightsail instance list without the deleted test instance
[/screenshot-guide]
[/project]
[/hands-on]

[/collapsible-section]

[collapsible-section]
## Learning Checklist

[checklist]
cat: 📚 Concepts Mastered
- Explain what OpenClaw is and how it differs from a standard chatbot
- Describe the role of the Gateway, agents, skills, and tools in OpenClaw's architecture
- Distinguish between an autonomous agent, a chatbot, and a harness like Claude Code
- Identify the AWS compute options for running OpenClaw (Lightsail, EC2, EKS, Bedrock AgentCore)
- Explain the pool, silo, and bridge multi-tenancy models and when each applies
[/checklist]

[checklist]
cat: 🛠️ Skills Acquired
- Launch OpenClaw using an AWS Lightsail blueprint
- Connect to an EC2 instance using AWS Session Manager instead of SSH keys
- Configure a SOUL.md persona file and a SKILL.md capability definition for a custom agent
- Apply Amazon Bedrock Guardrails to filter sensitive data in agent traffic
[/checklist]

[checklist]
cat: 🎓 Exam Ready
- Distinguish EC2/Lightsail/EKS always-on billing from Bedrock AgentCore's consumption-based, cold-start model
- Recall why Session Manager avoids opening inbound port 22
- Identify the security risk of a single OpenClaw Gateway shared by multiple users
- Recognize the seven layers of AI agent attack surface and one control for each
[/checklist]

[checklist]
cat: 💼 Hands-On Done
- Completed Project 1: Deploy OpenClaw on Amazon Lightsail Using the Official Blueprint
- Verified the Gateway access token was generated successfully
- Connected and tested a messaging channel against the deployed agent
- Cleaned up all resources (deleted the Lightsail instance) to avoid ongoing charges
[/checklist]

[/collapsible-section]

[collapsible-section]
## Reflection Questions

[reflection]
q: If you were deploying OpenClaw for a personal use case versus a multi-tenant business, how would your AWS service choice change and why?
hint: Think about the cost/isolation trade-off between an always-on Lightsail/EC2 instance and Bedrock AgentCore's per-session isolation.
[/reflection]

[reflection]
q: Why might "channel sharing" being enabled by default catch a first-time OpenClaw user off guard, and what does that suggest about default security settings in open-source agent frameworks?
hint: Consider that OpenClaw's own documentation states the Gateway is designed for one user per instance.
[/reflection]

[reflection]
q: How would you decide whether a new agent capability belongs in a skill definition or a tool implementation?
hint: Think about the difference between the "how/when" decision logic (skill) and the actual executable code (tool).
[/reflection]

[reflection]
q: What would need to be true about your latency requirements for a cold start of a few seconds to be unacceptable?
hint: Compare a live phone call interaction against an asynchronous chat message that can tolerate a short delay.
[/reflection]

[reflection]
q: Why does MCP's usefulness as a generic connector also expand the security attack surface described in the session?
hint: Consider that MCP is a connection protocol, not a trust boundary — every new MCP server represents a new decision about what to trust.
[/reflection]

[reflection]
q: If you inherited an OpenClaw deployment running on a single EC2 instance for 200 users, what would be your first three questions before recommending a migration?
hint: Start with how the Gateway, sessions, and data isolation are currently configured for those 200 users today.
[/reflection]

[/collapsible-section]

[collapsible-section]
## Links & References

[ref]
text: Amazon Bedrock AgentCore — Official Overview
url: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html
[/ref]

[ref]
text: Amazon Bedrock AgentCore — Pricing
url: https://aws.amazon.com/bedrock/agentcore/pricing/
[/ref]

[ref]
text: Amazon Bedrock AgentCore — FAQs
url: https://aws.amazon.com/bedrock/agentcore/faqs/
[/ref]

[ref]
text: AWS Systems Manager — Session Manager User Guide
url: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
[/ref]

[ref]
text: Amazon EC2 — Official Documentation
url: https://docs.aws.amazon.com/ec2/
[/ref]

[ref]
text: Amazon Lightsail — Official Documentation
url: https://docs.aws.amazon.com/lightsail/
[/ref]

[ref]
text: AWS Well-Architected Framework — Security Pillar
url: https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html
[/ref]

[ref]
text: OpenClaw — Official GitHub Repository
url: https://github.com/openclaw/openclaw
[/ref]

[/collapsible-section]

[image-prompts]
aws-openclaw-agents-session-aws-user-group-mumbai-overview.png:
CONCEPT: How a single incoming channel message travels through OpenClaw's Gateway to an agent and back, and where AWS compute sits in that flow.
SHOW:
- User icon with a chat bubble at far left, labeled "WhatsApp / Slack / Telegram message"
- Arrow into a box labeled "Gateway (control plane)"
- Arrow from Gateway into a box labeled "Agent (SOUL.md persona)"
- Agent box connects to two smaller boxes below it: "Skills (SKILL.md)" and "Tools (executable code)"
- Agent box connects upward to a box labeled "Foundation Model (model-agnostic)"
- All of the above sit inside a large outer box labeled "AWS compute (Lightsail / EC2 / EKS / Bedrock AgentCore)"
- Arrow back out to the user icon labeled "Response"

---
aws-openclaw-agents-session-aws-user-group-mumbai-agentcore-architecture.png:
CONCEPT: How OpenClaw's four architectural layers (Gateway, agent persona, skills, tools) stack on top of a swappable foundation model.
SHOW:
- Four stacked horizontal bands, top to bottom: "Gateway (control plane)", "Agents (SOUL.md)", "Skills (SKILL.md — when/how)", "Tools (executable code — what)"
- Bottom band labeled "Foundation Model" with small logos/labels "Claude / GPT / other" to show model-agnosticism
- Vertical arrows connecting each band downward to show dependency
- Small annotation next to Tools band: "actual capability lives here"
- Small annotation next to Skills band: "decision logic lives here"

---
aws-openclaw-agents-session-aws-user-group-mumbai-deployment-options.png:
CONCEPT: Side-by-side comparison of always-on AWS compute versus Bedrock AgentCore's on-demand, session-based model.
SHOW:
- Left panel labeled "Lightsail / EC2 / EKS" showing a continuously filled/lit server icon with caption "Always running — billed for uptime, no cold start"
- Right panel labeled "Bedrock AgentCore" showing a server icon that toggles between dim and lit with caption "Spins up per session — billed for active use, short cold start"
- A small timeline under each panel showing billing bars: continuous shaded bar for the left, intermittent shaded bars for the right
- Divider line down the center labeled "Cost vs. Cold Start Trade-off"

---
aws-openclaw-agents-session-aws-user-group-mumbai-multi-tenancy.png:
CONCEPT: Visual contrast of the pool, silo, and bridge multi-tenancy isolation models.
SHOW:
- Three side-by-side panels labeled "Pool", "Silo", "Bridge"
- Pool panel: multiple user icons all pointing into one shared box labeled "Shared resources"
- Silo panel: multiple user icons each pointing into their own separate boxes labeled "Dedicated resources"
- Bridge panel: multiple user icons pointing into one shared box labeled "Shared front-end," each also pointing into their own small box labeled "Isolated session/data"
- Caption row beneath: "Lowest cost / weakest isolation" under Pool, "Highest cost / strongest isolation" under Silo, "Balanced" under Bridge

---
aws-openclaw-agents-session-aws-user-group-mumbai-security-layers.png:
CONCEPT: The seven layers of AI agent attack surface, stacked to show where different security controls apply.
SHOW:
- Seven horizontal bands stacked vertically, labeled top to bottom: "Foundational Model", "Data", "Agent Framework", "Service/Tooling", "Observability", "Network", "Credentials/Insider"
- A small icon or one-word control label to the right of each band: "Guardrails" next to Foundational Model, "Encryption/IAM" next to Data, "Reviewed skills/tools" next to Agent Framework, "AgentCore Gateway" next to Service/Tooling, "CloudWatch/CloudTrail" next to Observability, "Private subnet/WAF" next to Network, "Session Manager/Identity" next to Credentials/Insider
- A vertical arrow along the left edge labeled "Attack surface, top to bottom"

---
aws-openclaw-agents-session-aws-user-group-mumbai-cheatsheet.png:
CONCEPT: A one-page recap connecting deployment choice, multi-tenancy model, and top security controls for running OpenClaw on AWS.
SHOW:
- Three labeled columns: "Deployment Options" (Lightsail, EC2, EKS, Bedrock AgentCore with one-line notes), "Multi-Tenancy" (Pool, Silo, Bridge with one-line notes), "Top Security Controls" (Session Manager, Private Subnet, Guardrails, Audit Logging)
- A small footer strip reading "OpenClaw on AWS — Quick Reference"
- Minimal icons per row rather than dense paragraphs, kept scannable
[/image-prompts]
