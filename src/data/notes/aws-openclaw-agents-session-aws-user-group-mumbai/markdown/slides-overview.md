---
type: aws
title: Building Production-Ready Agents with OpenClaw on AWS
slug: openclaw-agents-session-aws-user-group-mumbai
topic_number:
date: 2026-07-02
date_modified:
derived_from_note: true
presentation: true
audience: intermediate
session_name: AWS User Group Mumbai — Building Production-Ready Agents with OpenClaw on AWS
session_url: https://www.linkedin.com/company/awsugmum/
lecturer_name: Anirudh Sharma
lecturer_url: https://www.linkedin.com/in/anirudh-sharma-279248142/
video_title: Production AI Agents on AWS — OpenClaw, Bedrock AgentCore & Security Explained
video_description: How do you take an open-source agent framework like OpenClaw from a laptop demo to a real, multi-user production deployment on AWS? This session from AWS User Group Mumbai breaks down the difference between chatbots, harnesses, and true autonomous agents, compares four AWS hosting options (Lightsail, EC2, EKS, Bedrock AgentCore), and walks through the multi-tenancy and security controls you need before going live — including Session Manager, Bedrock Guardrails, and the seven layers of agent attack surface.
video_tags: [OpenClaw, AI Agents, Autonomous Agents, Amazon Bedrock AgentCore, AWS Lightsail, Amazon EC2, Multi-Tenancy, Agent Security, AWS Session Manager, AWS User Group Mumbai]
thumbnail_prompt: A YouTube thumbnail showing a glowing autonomous-agent icon in the center, connected on the left to chat bubble icons (WhatsApp, Slack, Telegram) and on the right to AWS compute icons (EC2, Lightsail, Bedrock AgentCore), bold white/orange text overlay reading "Production AI Agents on AWS", dark tech-blue background with AWS-orange accent highlights.
slide_count: 38
estimated_duration: "20:43"
---

[slide type="title"]
# Production AI Agents on AWS: OpenClaw, Bedrock AgentCore & Security Explained
AWS User Group Mumbai — with Anirudh Sharma
[/slide]
[notes]
[0:00–0:20]
Quick question before we start: if you handed an AI agent your WhatsApp, would you trust it to run unattended for a week? By the end of this video you'll know exactly what has to be true for the answer to be "yes" — on AWS, in production, with more than one user.
[/notes]

[slide type="objectives"]
## What You'll Learn
- What makes an agent "autonomous" versus a chatbot or a harness
- OpenClaw's four-layer architecture: Gateway, Agents, Skills, Tools
- Four AWS hosting options and their cost/isolation trade-offs
- The multi-tenancy and security controls production deployments need
[/slide]
[notes]
[0:20–0:50]
We're covering four things: what actually counts as an autonomous agent, how OpenClaw is built under the hood, where to host it on AWS, and — this is the part most tutorials skip — how to keep it secure and safe for more than one user.
[/notes]

[slide type="section-divider"]
## Agents vs. Chatbots vs. Harnesses
[/slide]
[notes]
[0:50–0:58]
First, let's get our vocabulary straight — because these three terms get used interchangeably, and that's where a lot of confusion starts.
[/notes]

[slide type="concept"]
## Agents vs. Chatbots: what's the real difference
- Chatbot — answers a question, then stops
- Harness — has tools, but a human drives each step
- Autonomous agent — given a goal, decides its own next action
- OpenClaw is built for the third category
[/slide]
[notes]
[0:58–1:43]
Think of it like hiring a personal assistant versus reading from a call-center script. The script only answers exactly what it's asked, in order. A real assistant checks your calendar, books the table, and sends the follow-up email — without you asking for each step. A chatbot is the script. OpenClaw builds the assistant: an agent that decides what to do next, not just what to say.
[/notes]

[slide type="concept"]
## Key Features: three categories, one line each
- Chatbot: conversational Q&A, nothing happens outside the chat window
- Harness: tools available, but invoked deliberately, one task at a time — Claude Code in a terminal is the textbook example
- Autonomous agent: handed a goal plus skills, tools, and a model, then keeps acting without a human re-prompting each step
[/slide]
[notes]
[1:43–2:23]
The defining test is: who decides what happens next? For a chatbot and a harness, a human does — even if the harness has tools, a person is still triggering each one. For an autonomous agent, the model itself decides. That's the line that matters architecturally.
[/notes]

[slide type="example"]
## Use Case: Why a Call Center Needed More Than a Chatbot
- A multinational customer wanted an agent as first point of contact
- A plain chatbot could only handle simple FAQ questions
- Production support needed real skills, a knowledge base, and escalation judgment
- OpenClaw's skill-and-tool model fit that need directly
[/slide]
[notes]
[2:23–2:58]
A real example from the session: a multinational customer wanted an agent as the first point of contact for customer queries. A plain chatbot could handle simple FAQ questions, but production support needs real skills, a knowledge base to pull answers from, and the judgment to escalate to a human when it's out of its depth. That's exactly the skill-and-tool model OpenClaw is built around — not just a bigger chatbot.
[/notes]

[slide type="section-divider"]
## Core Architecture: Gateway, Agents, Skills, and Tools
[/slide]
[notes]
[2:58–3:06]
So how is OpenClaw actually put together? Four pieces, and they fit together like a car.
[/notes]

[slide type="concept"]
## The Four Layers: Dashboard, Driver, Checklist, Engine
- Gateway = the dashboard — every config action happens here
- Agents = the drivers — persona and behavior live in SOUL.md
- Skills = the checklist — SKILL.md defines when and how to act
- Tools = the engine — the actual executable capability
[/slide]
[notes]
[3:06–3:51]
Picture a car: the Gateway is the dashboard where you control everything. Agents are the drivers, each with their own personality defined in a file called SOUL.md. Skills are the checklist the driver follows — what to do and when. And Tools are the engine — the code that actually makes something happen. Skills tell the agent when to reach for a tool; the tool is what actually runs.
[/notes]

[slide type="diagram"]
## How the Four Layers Stack on a Swappable Model
[diagram-prompt]
CONCEPT: A vertical stack — Gateway on top, then Agents, then Skills, then Tools, all resting on a "Foundation Model" base layer. The base layer is drawn as swappable (dashed outline or a swap icon), showing the model underneath can be Claude, GPT, or another provider without changing the layers above it.
[/diagram-prompt]
[/slide]
[notes]
[3:51–4:26]
Here's the stack visually — Gateway on top, then agents, then skills, then tools, all sitting on a foundation model. And that bottom layer is swappable: OpenClaw is explicitly model-agnostic, so that brain could be Claude, GPT, or something else entirely.
🎬 Production: hold on the stacked diagram for the full narration, no cuts.
[/notes]

[slide type="concept"]
## Key Features of the Architecture
- Gateway: CLI or web console, issues an access token to authenticate clients
- Agents: persona and boundaries defined per-agent in SOUL.md
- Skills: describe when/how to act — no implementation code inside
- Tools: the actual executable capability behind each skill
- Foundation model: model-agnostic — Claude, GPT, or any other
[/slide]
[notes]
[4:26–5:11]
A few specifics worth knowing: the Gateway issues an access token the first time you launch OpenClaw — that's how any client authenticates to it. And skills are deliberately separate from tools: a SKILL.md file just describes the activity, like "search the web when you don't know an answer" — the actual code lives in the tool underneath it.
[/notes]

[slide type="example"]
## Use Case: Setting an Agent's Boundaries with SOUL.md
- Can set hard limits, e.g. "reply in under 500 characters"
- Or restrict scope, e.g. "never discuss topics outside customer support"
- Boundaries live in the persona file, not hardcoded into the model
- Keeps an autonomous agent on-script while it still decides its own actions
[/slide]
[notes]
[5:11–5:46]
A SOUL.md file can say something as concrete as "reply in under 500 characters" or "never discuss topics outside customer support." That's how you keep an agent on-script even though it's making its own decisions — the boundary is written into its persona file, not hardcoded into the model.
[/notes]

[slide type="mistakes"]
## Common Mistakes: Skill Supply-Chain Risk
- Community-published skills can be imported into OpenClaw
- Installing one you haven't reviewed means trusting unaudited code
- The underlying tool or its dependencies could be vulnerable
- Treat every new skill like a new npm/pip package: review before installing
[/slide]
[notes]
[5:46–6:16]
OpenClaw supports importing community-published skills — and installing one you haven't reviewed means trusting code you haven't audited. The skill's underlying tool and its package dependencies could be vulnerable, or worse. Treat a new skill exactly like a new npm or pip package: review before you install.
[/notes]

[slide type="section-divider"]
## Deployment Options on AWS
[/slide]
[notes]
[6:16–6:24]
OpenClaw has to live somewhere besides your laptop — the moment your laptop sleeps, your WhatsApp bot goes offline. Let's look at where to host it.
[/notes]

[slide type="concept"]
## Always-On vs. On-Demand: the core trade-off
- Lightsail, EC2, EKS — instance runs continuously, no cold start
- Bedrock AgentCore — spins up per session, on demand
- Always-on = pay for uptime, whether or not it's used
- On-demand = pay for active use, with a brief startup delay
[/slide]
[notes]
[6:24–7:09]
It's the same trade-off as owning a car you keep running in the driveway versus calling a cab only when you need a ride. Lightsail, EC2, and EKS are the car in the driveway — always ready, but you pay for every hour whether you're using it or not. Bedrock AgentCore is the cab — nothing running until you need it, but that first call takes a few seconds to arrive.
[/notes]

[slide type="diagram"]
## Always-On Compute vs. Bedrock AgentCore, Side by Side
[diagram-prompt]
CONCEPT: A two-column comparison. Left column: Lightsail/EC2/EKS icon with a billing meter running continuously, flat line. Right column: Bedrock AgentCore icon with a billing meter that only spikes during short bursts of active use. The point is continuous uptime billing versus intermittent, usage-based billing.
[/diagram-prompt]
[/slide]
[notes]
[7:09–7:44]
This is the visual version of that trade-off — continuous billing on the left, intermittent, usage-based billing on the right. Keep this picture in mind, because it comes back when we talk about pricing later.
[/notes]

[slide type="concept"]
## Key Features: Four Ways to Host OpenClaw
- Lightsail: pre-built blueprint, running in minutes — best for fast POCs
- EC2: full VM control, CloudFormation can bootstrap it at launch
- EKS: runs as a long-lived pod for teams already on Kubernetes
- Bedrock AgentCore: fully managed, serverless, built for production multi-tenancy
[/slide]
[notes]
[7:44–8:29]
One more detail worth knowing if you go the EC2 route: Graviton-based instances — AWS's ARM processors — were specifically recommended in the session, since they typically cost less per vCPU than comparable x86 instances for the same workload.
[/notes]

[slide type="example"]
## Use Case: Choosing Lightsail for a Fast, Cheap POC
- Goal: prove OpenClaw works before committing to bigger infrastructure
- Lightsail's blueprint gets you running in minutes
- Fixed, predictable monthly cost
- Delete the instance when done — billing stops immediately
[/slide]
[notes]
[8:29–9:04]
Say your team just needs to prove OpenClaw works before committing to anything bigger. Lightsail's blueprint gets you running in minutes at a fixed, predictable monthly cost. Test it, then delete the instance — billing stops immediately. That's the whole appeal for a proof of concept: minimal setup, minimal commitment.
[/notes]

[slide type="section-divider"]
## Multi-Tenancy and Isolation Models
[/slide]
[notes]
[9:04–9:12]
Now for the question every team hits the moment there's more than one user: how do you keep Customer A's data from ever touching Customer B's?
[/notes]

[slide type="concept"]
## Pool, Silo, and Bridge: the three isolation patterns
- Pool — everyone shares the same resources
- Silo — everyone gets fully dedicated resources
- Bridge — a mix: shared where cost matters, isolated where safety matters
[/slide]
[notes]
[9:12–9:57]
Think of an apartment building. Pool is one shared unit with everyone's stuff mixed together — cheapest, but the least private. Silo is everyone owning a separate house — completely private, but expensive to build and maintain individually. Bridge is a shared lobby and shared utilities, but every unit has its own locked door. Most production systems land on bridge.
[/notes]

[slide type="diagram"]
## Pool, Silo, and Bridge Compared Against AgentCore
[diagram-prompt]
CONCEPT: Three side-by-side panels — Pool (one shared box holding all users' icons together), Silo (separate fully isolated boxes, one per user), Bridge (a shared outer box with individually locked inner compartments per user). A fourth panel shows Bedrock AgentCore providing silo-level isolation per session without a separately provisioned stack per user.
[/diagram-prompt]
[/slide]
[notes]
[9:57–10:32]
Here's all three side by side, plus how AgentCore's per-session isolation fits in — it gives you silo-level isolation without you having to provision a separate stack for every single customer.
[/notes]

[slide type="concept"]
## Key Features: Isolation Trade-offs
- Pool: cheapest, weakest isolation — one bug can expose another user's data
- Silo: strongest isolation, but cost scales linearly with users
- Bridge: shared infrastructure plus dedicated resources where it counts
- OpenClaw's own Gateway is designed for one user per instance
- AgentCore Runtime isolates per session, not per long-lived instance
[/slide]
[notes]
[10:32–11:17]
That fourth point is the one to remember: OpenClaw's documentation is explicit that a single Gateway is built for one user. Add it to a shared WhatsApp group with channel sharing turned on, and every conversation can start flowing through the same session — users end up seeing each other's messages.
[/notes]

[slide type="example"]
## Use Case: Architecting for 50 Enterprise Customers
- Pure pool: too risky for isolation at this scale
- Pure silo: too expensive to manage per customer
- Practical answer: bridge — shared front-end, dedicated session/memory/token per customer
- Or let Bedrock AgentCore isolate each session at the platform level
[/slide]
[notes]
[11:17–11:57]
If you're designing a multi-tenant support system for fifty enterprise customers, a pure pool deployment is too risky and pure silo is too expensive to manage. The practical answer is bridge: a shared front-end for cost efficiency, but a dedicated session, memory store, and access token per customer — or better, let Bedrock AgentCore isolate each session at the platform level instead of provisioning fifty separate stacks yourself.
[/notes]

[slide type="mistakes"]
## Common Mistakes: Sharing and Scaling Don't Fix Isolation
- Channel sharing in a group chat can route every user through the same session
- An Auto Scaling Group in front of EC2 doesn't solve multi-tenancy
- Each new instance still needs its own Gateway, token, and routing
- More instances ≠ isolation — it just adds management overhead
[/slide]
[notes]
[11:57–12:32]
Two traps to watch for. One: enabling channel sharing in a group chat routes every user through the same session by default — the instructor demonstrated this happening on his own deployment. Two: bolting an Auto Scaling Group in front of multiple EC2 instances doesn't solve multi-tenancy — each new instance still needs its own Gateway, its own token, its own routing. You've added management overhead without fixing the underlying problem.
[/notes]

[slide type="section-divider"]
## Security Model
[/slide]
[notes]
[12:32–12:40]
Security was the biggest theme of the whole session, so let's go through it layer by layer.
[/notes]

[slide type="concept"]
## Seven Layers of Attack Surface
- Foundational model
- Data
- Agent framework
- Service / tooling
- Observability
- Network
- Credentials / insider access
[/slide]
[notes]
[12:40–13:25]
Think of it like a castle with seven walls, not one. A single strong gate doesn't protect you if the moat is dry somewhere else. Each of these seven layers — from the model itself down to who has insider credentials — needs its own control. Securing only the model and ignoring the network, or vice versa, leaves a gap an attacker will find.
[/notes]

[slide type="diagram"]
## The Seven Layers, Stacked with Their Controls
[diagram-prompt]
CONCEPT: Seven horizontal layers stacked top to bottom — Foundational model, Data, Agent framework, Service/tooling, Observability, Network, Credentials/insider access — each labeled alongside its matching AWS control (Guardrails, encryption/IAM, skill review, audit logging, CloudWatch, VPC/security groups, Session Manager). Point: each layer needs its own independent control.
[/diagram-prompt]
[/slide]
[notes]
[13:25–14:00]
Here's each layer with the specific AWS control that maps to it — guardrails at the model layer, encryption and IAM at the data layer, Session Manager at the credentials layer, and so on. We'll walk through the ones that matter most next.
[/notes]

[slide type="concept"]
## Key Features: The Controls That Matter Most
- AWS Session Manager replaces long-lived SSH keys — no open port 22, no leaked key
- Private subnet plus a layer-7 control like CloudFront or WAF in front of anything public
- Review every third-party skill before installing it
- Bedrock Guardrails filter sensitive data crossing tool and model boundaries
- Full audit logging of every tool call an agent makes
[/slide]
[notes]
[14:00–14:45]
The SSH point is worth sitting on: an SSH key is a long-lived credential — commit it to a public repo by accident, and it's usable until someone manually rotates it. Session Manager removes that risk entirely. It authenticates through your IAM identity via the AWS control plane, so an instance can sit in a fully private subnet with no internet gateway at all and still be reachable for management.
[/notes]

[slide type="example"]
## Use Case: Migrating Off a Leaked SSH Key
- A .pem file gets committed alongside application code and leaks
- Rotating the key alone isn't enough
- Must also remove it from git history
- Migrate the connection path to Session Manager going forward
[/slide]
[notes]
[14:45–15:20]
Say a `.pem` file gets committed alongside application code and shows up in a public repo. The fix isn't just rotating the key — it's removing it from git history and migrating that connection path to Session Manager going forward, so there's no long-lived credential left to leak again.
[/notes]

[slide type="mistakes"]
## Common Mistakes: Credentials and Access Scope
- A leaked SSH key sitting in a public repo
- An agent integrated using someone's personal OS account
- That inherits every permission the personal account has
- Fix: a scoped, dedicated identity with least-privilege access
[/slide]
[notes]
[15:20–15:55]
Two recurring issues: a leaked SSH key sitting in a public repo, and an agent integrated using someone's personal OS account — which means it inherits every permission that person has. The fix for the second one is a scoped, dedicated identity with least-privilege access, not a personal admin account. The agent's blast radius is exactly as large as the identity it runs as.
[/notes]

[slide type="section-divider"]
## Pricing
[/slide]
[notes]
[15:55–16:03]
Last piece before we wrap up the architecture side: what does all this actually cost?
[/notes]

[slide type="concept"]
## OpenClaw Is Free — You Pay for What It Runs On
- OpenClaw itself: free and open source
- You're billed for AWS infrastructure
- Plus foundation model inference, if you're calling a hosted model
[/slide]
[notes]
[16:03–16:38]
OpenClaw doesn't have a license fee — it's open source. The bill you actually get is for the road it drives on: the AWS compute underneath it, and the model inference calls it makes along the way.
[/notes]

[slide type="concept"]
## Key Features: How Each Option Bills You
- Lightsail: fixed monthly rate, billed continuously regardless of usage
- EC2 / EKS: on-demand, reserved, or spot pricing — scales with instance size and uptime
- AgentCore Runtime: bills per vCPU-hour and GB-hour of active use only
- AgentCore Gateway bills per tool call, Memory bills per stored/retrieved record
- Model inference billed separately at standard Bedrock rates
[/slide]
[notes]
[16:38–17:18]
This ties straight back to the always-on versus on-demand trade-off from earlier. Lightsail, EC2, and EKS charge for uptime, full stop — it doesn't matter if the agent answered one message or a thousand. AgentCore only charges while it's actively doing something; idle time waiting on a model or tool response isn't billed.
[/notes]

[slide type="example"]
## Use Case: Avoiding the Idle-Session Bill Shock
- A session left open keeps billing until its timeout expires
- Set an appropriate session timeout for AgentCore
- Clean up unused agents and idle Lightsail/EC2 instances
- Idle time is easy to forget and easy to overpay for
[/slide]
[notes]
[17:18–17:53]
Idle session accumulation is a common AgentCore surprise — a session that isn't explicitly closed can keep billing until its timeout expires. The fix is simple but easy to forget: set an appropriate session timeout, and clean up unused agents and Lightsail or EC2 instances you're not actively using.
[/notes]

[slide type="mistakes"]
## Common Mistakes: Where Unexpected Charges Come From
- Idle AgentCore sessions that outlive their usefulness before timeout
- Observability costs billed through CloudWatch, left unmonitored
- Review usage regularly, not just when the invoice arrives
[/slide]
[notes]
[17:53–18:23]
Two places bills creep up: idle AgentCore sessions that outlive their usefulness before hitting their timeout, and Observability costs — billed through CloudWatch — that go unmonitored. Review usage regularly, not just when the invoice arrives.
[/notes]

[slide type="example"]
## Let's See It In Action
[/slide]
[notes]
[18:23–18:43]
Everything so far has been concepts. Coming up, we'll walk through actually standing this up — launching OpenClaw from the Lightsail console, connecting to it securely with Session Manager, and calling an agent through Bedrock AgentCore with a few lines of Python.
🎬 Production: this is a transition card only — cut to screen recording after this slide, no lab steps on the slide itself.
[/notes]

[slide type="concept"]
## Best Practices Before You Go to Production
- Connect via Session Manager, never SSH keys
- Private subnet plus a layer-7 control in front of anything public
- Never share a single Gateway across multiple users
- Review every third-party skill before installing it
- Wrap model traffic with Bedrock Guardrails and enable full audit logging
[/slide]
[notes]
[18:43–19:28]
If you take five things away from this whole session, make it this list. Every one of them showed up as the root cause of a real problem earlier in this video — this slide is just the fix, collected in one place.
[/notes]

[slide type="summary"]
## Summary
- OpenClaw builds autonomous agents — systems that decide actions, not just chatbots or harnesses
- Four-layer architecture: Gateway, Agents (SOUL.md), Skills (SKILL.md), Tools
- AWS hosting spans always-on (Lightsail, EC2, EKS) to serverless (Bedrock AgentCore)
- OpenClaw's Gateway is built for one user per instance — sharing it is the biggest production risk
- Three multi-tenancy patterns: pool, silo, and bridge
- Session Manager replaces long-lived SSH keys for EC2 access
- Security spans seven layers — every layer needs its own control
- Cost model: always-on bills for uptime; AgentCore bills only for active use
[/slide]
[notes]
[19:28–20:23]
So, quick recap: an autonomous agent decides its own next move — that's OpenClaw's whole premise. It's built from four layers sitting on a swappable model. Where you host it is a straight trade-off between always-on and on-demand. And none of that matters if you get multi-tenancy or security wrong — a single shared Gateway, a leaked SSH key, or an unreviewed skill can undo everything else you did right.
[/notes]

[slide type="cta"]
## Want the Full Written Breakdown?
[Link to the complete note — every diagram, glossary term, and interview question from this session]
[/slide]
[notes]
[20:23–20:43]
If you want to go deeper — full glossary, every diagram, and a set of interview-style practice questions — the complete written note is linked below. If this helped, subscribe for the next AWS deep dive.
[/notes]
