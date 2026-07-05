---
type: aws
title: Building Production-Ready Agents with OpenClaw on AWS
slug: openclaw-skill
topic_number: 1
date: 2026-06-27
date_modified:
keywords: [OpenClaw, AI agent, AWS SDK v3, EC2 health check, ECS monitoring, CloudWatch metrics, IAM least privilege, WhatsApp automation, DevOps agent, SKILL.md]
tags: [OpenClaw, AI Agents, DevOps, AWS SDK, Monitoring]
when_to_use: Use OpenClaw skills when you need an AI agent to read live status from your AWS infrastructure (EC2, ECS, CloudWatch) and report it back over a chat channel like WhatsApp, instead of an engineer manually opening the console during an incident.
comparison_topic: null
audience: intermediate
aws_doc_version: 2026-06-30
validated_against:
lecturer_name: Yash Garudkar
lecturer_url: https://www.linkedin.com/in/yashgkar/
session_name: AWS User Group Mumbai — Building Production-Ready Agents with OpenClaw on AWS
session_url: https://www.linkedin.com/company/awsugmum/
---

[collapsible-section o]
## Introduction

Imagine being woken up at 2am because production is down. Before you can even figure out what broke, you have to unlock your laptop, log into the AWS console, click into CloudWatch, click into ECS, click into EC2 — five tabs deep — just to answer one question: *what actually happened?*

OpenClaw removes that friction. It is an !!open-source AI agent that runs locally on your machine!! and connects a large language model to your real tools through small, well-defined units called !!Skills!!. Instead of opening a laptop and clicking through consoles, you send a WhatsApp message — *"check my AWS health"* — and the agent runs a script against the AWS SDK and replies with a structured report in seconds.

[image:aws-openclaw-skill-overview.png|High-level flow: a WhatsApp message triggers an OpenClaw skill, which queries AWS and replies in chat]

[note]OpenClaw is channel-agnostic — the same skill works whether you talk to it over WhatsApp, Telegram, or Slack. The session demo used WhatsApp because it's the channel most engineers already have open at 2am.[/note]

==OpenClaw is an open-source AI agent that runs locally and connects language models to real-world tools through Skills.==
[/collapsible-section]

[collapsible-section]
## How OpenClaw Skills Work

A !!Skill!! in OpenClaw is intentionally simple: it is !!one folder containing one `SKILL.md` file!!, plus whatever script or code that file points to. There is no heavyweight plugin framework to learn.

`SKILL.md` is not meant for a human to read line by line — it's written !!for the agent!! to understand. It tells the agent:

- !!When to trigger!! — which natural-language phrases should invoke this skill (e.g. "check my AWS health", "how are my EC2 instances")
- !!How to invoke!! — the exact shell command to run (e.g. `cd {baseDir} && npx tsx scripts/aws-health.ts`)
- !!Output format!! — how to present the script's output back to the user
- !!Error handling!! — what to tell the user when specific errors occur

==A skill is just one folder with one `SKILL.md` file — the agent reads it to learn when to trigger and what command to run.==

When a trigger phrase is detected, the agent does not "think up" an answer — it !!executes the underlying script!! and returns that script's real output. This matters: the agent is a dispatcher and a presenter, not the source of truth. The AWS SDK call is the source of truth.

[image:aws-openclaw-skill-skill-folder-anatomy.png|Anatomy of a skill folder: SKILL.md, package.json, scripts/, and how the agent reads each piece]

[important]Because the agent executes a real script rather than "guessing" infrastructure state from training data, the report you get back is always live data pulled directly from the AWS APIs at the moment you asked — not a hallucinated summary.[/important]
[/collapsible-section]

[collapsible-section]
## Architecture: WhatsApp to AWS and Back

The end-to-end flow demonstrated in the session has six stages:

1. !!WhatsApp User!! sends a message such as *"how are my EC2 instances?"*
2. !!OpenClaw Agent!!, running locally, matches the message against the skill's trigger phrases
3. !!AWS Health Skill!! (`SKILL.md` + `aws-health.ts`) is invoked with the right CLI flags
4. !!AWS SDK v3!! calls are made from the local script — not from any cloud-hosted middleman
5. Calls go out to the relevant AWS services: !!Amazon EC2!! (compute), !!Amazon ECS!! (containers), and !!Amazon CloudWatch!! (monitoring) — authenticated through a dedicated, !!read-only IAM identity!!
6. The structured result flows back through the agent and is delivered as a !!WhatsApp Response!!

[image:aws-openclaw-skill-architecture-diagram.png|Six-stage architecture: WhatsApp User to OpenClaw Agent to AWS Health Skill to AWS SDK v3 to EC2/ECS/CloudWatch to WhatsApp Response]

[note]Nothing in this flow requires a public-facing webhook or always-on server in AWS. The agent and the skill run on the engineer's own machine, and AWS is only called outward via the SDK using short-lived credentials.[/note]

A natural question from the audience was: *why not use the AWS Health API or EventBridge instead of polling EC2/ECS describe calls?* The Health API reports account-level and service-level AWS outages; it does not tell you whether !!your specific instance!! or !!your specific ECS service!! is unhealthy. Describe calls give per-resource granularity that a generic Health API cannot.

==The agent never holds AWS credentials with write access — it only ever calls Describe/Get style read APIs.==
[/collapsible-section]

[collapsible-section]
## What the Skill Reports

The `aws-health` skill is split into two domains, EC2 and ECS, and can be queried independently or together.

!!EC2 reports:!!
- Instance name, instance ID, instance type, and Availability Zone
- State — running / stopped / pending
- System status check, which detects underlying !!hardware failures!! (distinct from instance-level OS checks)
- CPU utilization as a !!15-minute average!!, pulled from CloudWatch

!!ECS reports:!!
- All clusters in the configured region, or a single cluster if `--cluster` is passed
- Per-service !!running count vs desired count!! — the fastest way to see a stuck or failing deployment
- !!Deployment rollout state!!: `COMPLETED`, `IN_PROGRESS`, or `FAILED`
- The !!last 5 stopped tasks!!, each with its stop code and stop reason — this is what catches a crash-loop before it becomes a full outage

[image:aws-openclaw-skill-ec2-ecs-report-fields.png|Two-column breakdown of EC2 fields vs ECS fields returned by the skill]

[warning]The script intentionally does !!not!! expose any mutating action (no restart, no scale, no terminate). It is read-only by design, both at the IAM layer and at the application layer.[/warning]

==EC2 system status checks specifically catch underlying **hardware failures**, separate from OS-level checks.==
==ECS deployment rollout state can be `COMPLETED`, `IN_PROGRESS`, or `FAILED`.==
[/collapsible-section]

[collapsible-section]
## Inside SKILL.md and the Script

`SKILL.md` carries metadata and instructions in a structured front section, followed by human-readable guidance:

```yaml
name: aws-health
description: Check health of AWS EC2 instances and ECS clusters/services.
  Reports running/stopped counts, CPU/memory metrics, and unhealthy tasks.
  Use when the user asks about AWS instance health, ECS status, or infra monitoring.
version: 1.0.0
```

It also declares !!environment variable requirements!! so the agent knows what credentials it needs before it can run the skill at all:

| Variable | Required | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | true | Read-only AWS access key |
| `AWS_SECRET_ACCESS_KEY` | true | Matching secret key |
| `AWS_REGION` | true | Region to query, e.g. `ap-south-1` |
| `AWS_SESSION_TOKEN` | false | Only needed for temporary/assumed-role credentials |

!!How to invoke!!, as written in `SKILL.md` for the agent:

```bash
cd {baseDir} && npx tsx scripts/aws-health.ts
cd {baseDir} && npx tsx scripts/aws-health.ts --only ec2
cd {baseDir} && npx tsx scripts/aws-health.ts --only ecs
cd {baseDir} && npx tsx scripts/aws-health.ts --only ecs --cluster my-cluster-name
```

`scripts/aws-health.ts` itself is plain !!TypeScript run with `tsx`!! (no build step). At a high level it:

1. Imports `@aws-sdk/client-ec2`, `@aws-sdk/client-ecs`, and `@aws-sdk/client-cloudwatch`
2. Initializes each client using the credentials and region from environment variables
3. Calls `DescribeInstances` / `DescribeInstanceStatus` for EC2, and walks `ListClusters` → `ListServices` → `DescribeServices` → `ListTasks` → `DescribeTasks` for ECS
4. Calls `GetMetricStatistics` against CloudWatch for the 15-minute CPU average
5. Formats everything into one structured, emoji-coded report and prints it to stdout, which OpenClaw relays as-is to chat

[image:aws-openclaw-skill-script-data-flow.png|Script execution flow from SDK client setup through API calls to formatted chat output]

==`tsx` lets the script run TypeScript directly with no separate compile/build step.==
[/collapsible-section]

[collapsible-section]
## IAM and Security Best Practices

The single most repeated point in the session was: !!never give the agent your root keys, and never give it write access.!!

The recommended setup creates one dedicated IAM user (e.g. `openclaw-bot`) with a custom !!read-only policy!! scoped to exactly three API namespaces:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ecs:ListClusters",
        "ecs:ListServices",
        "ecs:DescribeServices",
        "ecs:ListTasks",
        "ecs:DescribeTasks",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:GetMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

[important]Every action in this policy is a `Describe`, `List`, or `Get` call. There is no `Create`, `Modify`, `Terminate`, `Stop`, or `Delete` action anywhere in scope — by design, this identity is structurally incapable of changing infrastructure, even if the agent or the script were compromised.[/important]

Setup can be done via the !!console!! (IAM → Users → Create user → attach a custom policy) or via the !!AWS CLI!!:

```bash
aws iam create-policy \
  --policy-name OpenClawAWSHealthReadOnly \
  --policy-document file://iam-policy.json

aws iam create-user --user-name openclaw-bot

aws iam attach-user-policy \
  --user-name openclaw-bot \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/OpenClawAWSHealthReadOnly

aws iam create-access-key --user-name openclaw-bot
```

[warning]Access keys printed by `create-access-key` are shown only once. Store them in a secrets manager or directly in OpenClaw's local config — never commit them to a repository.[/warning]

==Least-privilege IAM is non-negotiable: one dedicated user, one job, read-only actions only.==
==Never use AWS root account credentials for an automated agent under any circumstance.==
[/collapsible-section]

[collapsible-section]
## Implementation

### Local Project Setup {#local-setup}

```bash
git clone https://github.com/yashgkar/aws-health
cd aws-health
npm install
```

This pulls in `@aws-sdk/client-ec2`, `@aws-sdk/client-ecs`, `@aws-sdk/client-cloudwatch`, and `tsx`.

### Testing the Script Standalone {#standalone-test}

Before wiring it into OpenClaw at all, the script can be run directly to confirm credentials and permissions work:

```bash
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=ap-south-1

npx tsx scripts/aws-health.ts
```

Expected output looks roughly like:

```
AWS Health Report — ap-south-1 — 2026-06-24T...

EC2 Instances
  my-server (i-0c2d159b3fd755c14)
   Type: t2.micro | AZ: ap-south-1b | State: running
   CPU (15m avg): 2.9%
Summary: 1 total | 1 running | 0 stopped | 0 system check failures

ECS Clusters & Services
 Cluster: my-cluster
   my-service
     Launch: FARGATE | Running: 3/3 desired | Pending: 0
     Deployment: COMPLETED

Health check complete.
```

### Installing Into OpenClaw {#installing-into-openclaw}

```bash
mkdir -p ~/.openclaw/workspace/skills
cp -r /path/to/aws-health ~/.openclaw/workspace/skills/aws-health
```

Then register credentials inside `~/.openclaw/openclaw.json` under the skill's `entries` block:

```json
"skills": {
  "entries": {
    "aws-health": {
      "enabled": true,
      "env": {
        "AWS_ACCESS_KEY_ID": "AKIA...",
        "AWS_SECRET_ACCESS_KEY": "your-secret",
        "AWS_REGION": "ap-south-1"
      }
    }
  }
}
```

Restart the gateway so the new skill is picked up:

```bash
openclaw gateway restart
```

### Talking to the Agent {#talking-to-agent}

[important]OpenClaw ships with !!two distinct agents!!: a setup/config agent (referred to in the session as "Crestodian") and the !!main conversational agent!!. Skills only execute from the main agent — a very common first-time mistake is trying to trigger a skill while still inside the config agent.[/important]

```bash
openclaw
talk to agent
check my AWS health
```

[image:aws-openclaw-skill-setup-sequence.png|Sequence from cloning the repo through IAM setup, local install, OpenClaw registration, and the first WhatsApp test message]

==Skills only run from the main conversational agent, not from the configuration agent.==
[/collapsible-section]

[collapsible-section]
## Usage Examples

| Message | What it does |
|---|---|
| `check my AWS health` | Full EC2 + ECS report |
| `show EC2 status` | EC2 only |
| `how are my ECS services` | ECS only |
| `any stopped tasks in prod-cluster` | ECS, scoped to a specific cluster |
| `what's the CPU on my instances` | EC2 + CloudWatch CPU metric |

The script also accepts direct CLI flags for testing outside of chat:

```bash
npx tsx scripts/aws-health.ts                          # EC2 + ECS
npx tsx scripts/aws-health.ts --only ec2                # EC2 only
npx tsx scripts/aws-health.ts --only ecs                # ECS only
npx tsx scripts/aws-health.ts --only ecs --cluster X     # specific cluster
```

[note]Grammar matters more than exact phrasing — the agent matches intent, not a fixed command syntax, as long as the message clearly maps to one of the documented triggers in `SKILL.md`.[/note]
[/collapsible-section]

[collapsible-section]
## Common Mistakes & Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `region: undefined` in output | `AWS_REGION` not exported in the shell | `export AWS_REGION=ap-south-1` before running |
| Skill doesn't trigger at all | Still inside the config agent | Run `talk to agent` to switch to the main agent first |
| `CredentialsProviderError` | Access key/secret missing or wrong | Re-check `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in `openclaw.json` |
| `AccessDeniedException` | IAM user missing required actions | Re-attach the `OpenClawAWSHealthReadOnly` policy from `iam-policy.json` |
| `ResourceNotFoundException` | Wrong ECS cluster name passed | Confirm with `aws ecs list-clusters` |
| Skill folder "not found" | Skills directory never created | `mkdir -p ~/.openclaw/workspace/skills`, then copy the skill in again |
| Config edits seem to do nothing | Gateway wasn't restarted | Run `openclaw gateway restart` after every `openclaw.json` change |

[warning]A live demo failure during the session (the agent reporting "no ECS services") turned out to be a correctly-scoped permission boundary, not a bug — the demo AWS account simply had no clusters running at that moment. Treat `AccessDeniedException` and "found nothing" as two very different signals: one is a config problem, the other may just be an empty environment.[/warning]
[/collapsible-section]

[collapsible-section]
## Extending the Skill

Ideas raised during and after the session for a v2 of this skill:

- !!RDS instance health!! via `DescribeDBInstances`
- !!ALB target group health!! via `DescribeTargetHealth`
- An !!SNS-triggered push!!: alert fires → OpenClaw → WhatsApp message, without the user asking first
- !!Multi-region support!!: `AWS_REGIONS=ap-south-1,us-east-1` and aggregate results
- A !!daily 9am digest!! pushed automatically to WhatsApp
- Parallelizing EC2 and ECS calls using async/threaded execution for faster responses on large fleets
- Swapping the polling-based health check for !!AWS Health API!! events where account-level (not per-resource) status is sufficient

[note]None of these were implemented at the time of the session — they are documented as the project's open roadmap.[/note]
[/collapsible-section]

[collapsible-section]
## Exam Tips

==The core exam distinction is: EC2 system status checks detect **hardware-level** failures, while instance status checks detect guest-OS-level problems.==
==ECS service health is measured by **running count vs desired count**, not by the cluster's existence alone.==
==The AWS Health API reports account/service-level operational issues; it does **not** give per-resource detail for a specific instance or service — that distinction is a common exam trap.==
[important]If a question describes an automated tool or agent calling AWS APIs, the !!first thing to check!! in any answer option is whether it follows least-privilege IAM — exam questions frequently include a distractor option that grants `*:*` or root-level access.[/important]
==`Describe*`, `List*`, and `Get*` actions are read-only API calls — they never appear in IAM policies meant to prevent mutation, since by definition they cannot mutate anything.==
Exam questions about credential types often test whether you know `AWS_SESSION_TOKEN` is required specifically for !!temporary credentials from an assumed role!!, not for standard long-lived IAM user keys.
[/collapsible-section]

[collapsible-section]
## Visualisation

[image:aws-openclaw-skill-overview.png|High-level flow: a WhatsApp message triggers an OpenClaw skill, which queries AWS and replies in chat]
[image:aws-openclaw-skill-architecture-diagram.png|Six-stage architecture: WhatsApp User to OpenClaw Agent to AWS Health Skill to AWS SDK v3 to EC2/ECS/CloudWatch to WhatsApp Response]
[image:aws-openclaw-skill-ec2-ecs-report-fields.png|Two-column breakdown of EC2 fields vs ECS fields returned by the skill]
[image:aws-openclaw-skill-script-data-flow.png|Script execution flow from SDK client setup through API calls to formatted chat output]
[image:aws-openclaw-skill-setup-sequence.png|Sequence from cloning the repo through IAM setup, local install, OpenClaw registration, and the first WhatsApp test message]
[image:aws-openclaw-skill-cheatsheet.png|One-page cheat sheet summarizing skills, IAM rules, and the full request/response flow]
[/collapsible-section]

[collapsible-section]
## Overall Summary

[takeaways]
- OpenClaw is an open-source AI agent that runs locally and connects an LLM to real tools via small, well-defined Skills.
- A skill is just one folder plus one `SKILL.md` file that tells the agent when to trigger, what command to run, how to format output, and how to handle errors.
- The agent executes a real script and relays its real output — it does not invent infrastructure status from memory.
- The demonstrated `aws-health` skill reports on EC2 (instance state, system status checks, 15-minute CPU average) and ECS (running vs desired tasks, deployment rollout state, last 5 stopped tasks with reasons).
- The architecture flow is WhatsApp to OpenClaw Agent to SKILL.md to AWS SDK v3 to EC2/ECS/CloudWatch to WhatsApp Response.
- IAM least privilege is mandatory: one dedicated read-only IAM user, scoped to Describe/List/Get actions only — never root keys, never write access.
- The script is plain TypeScript run via `tsx`, with no build step required.
- OpenClaw has two agents — a config agent and a main agent — and skills only execute from the main agent.
- Common failures are almost always credentials, region, or wrong agent context, not the skill's logic itself.
- The roadmap includes RDS/ALB health checks, proactive SNS-triggered alerts, and multi-region support.
[/takeaways]
[/collapsible-section]

[collapsible-section]
## Glossary

[glossary]
t: OpenClaw
d: An open-source AI agent that runs locally and connects LLMs to external tools through Skills
e: e.g. The session's `aws-health` skill lets OpenClaw answer "check my AWS health" via WhatsApp
[/glossary]

[glossary]
t: Skill
d: A self-contained unit of agent capability made of one folder containing a SKILL.md file plus any scripts it references
e: e.g. The `aws-health` skill folder contains SKILL.md, package.json, and scripts/aws-health.ts
[/glossary]

[glossary]
t: SKILL.md
d: The instruction file inside a skill that tells the agent its trigger phrases, invocation command, output format, and error handling
e: e.g. SKILL.md tells the agent to run `npx tsx scripts/aws-health.ts` when a user asks about AWS health
[/glossary]

[glossary]
t: Gateway
d: The OpenClaw process that connects the agent to a chat channel and routes incoming messages to the correct skill
e: e.g. `openclaw gateway restart` reloads the gateway after editing openclaw.json
[/glossary]

[glossary]
t: Main Agent
d: The conversational OpenClaw agent that actually executes skills, distinct from the configuration agent
e: e.g. A user must run `talk to agent` to reach the main agent before a skill will trigger
[/glossary]

[glossary]
t: AWS SDK v3
d: The current modular version of the AWS JavaScript/TypeScript SDK, split into per-service client packages
e: e.g. `@aws-sdk/client-ec2`, `@aws-sdk/client-ecs`, and `@aws-sdk/client-cloudwatch` are used in this skill
[/glossary]

[glossary]
t: tsx
d: A TypeScript execution tool that runs .ts files directly without a separate compile step
e: e.g. `npx tsx scripts/aws-health.ts` runs the script with no build step
[/glossary]

[glossary]
t: Amazon EC2
d: AWS's resizable virtual server (compute) service
e: e.g. The skill reports instance type, state, and CPU usage for every EC2 instance
[/glossary]

[glossary]
t: Amazon ECS
d: AWS's container orchestration service for running Docker containers as tasks and services
e: e.g. The skill lists every cluster and reports running vs desired task counts per service
[/glossary]

[glossary]
t: Amazon CloudWatch
d: AWS's monitoring and observability service used to collect and retrieve metrics, logs, and alarms
e: e.g. The skill calls CloudWatch's GetMetricStatistics to compute a 15-minute CPU average
[/glossary]

[glossary]
t: DescribeInstances
d: An EC2 API call that returns metadata and current state for EC2 instances
e: e.g. Used to list instance name, type, AZ, and running/stopped state
[/glossary]

[glossary]
t: DescribeInstanceStatus
d: An EC2 API call that returns system and instance status checks
e: e.g. Used to detect underlying hardware failures separate from OS-level problems
[/glossary]

[glossary]
t: System Status Check
d: An EC2 health check that detects problems with the underlying AWS hardware/infrastructure, as opposed to the guest OS
e: e.g. A failed system status check usually means AWS needs to migrate the instance off failing hardware
[/glossary]

[glossary]
t: DescribeServices
d: An ECS API call that returns running/desired task counts and deployment state for a service
e: e.g. Shows "3/3 desired" when a service is fully healthy
[/glossary]

[glossary]
t: DescribeTasks
d: An ECS API call returning detail on individual ECS tasks, including stop reason and stop code
e: e.g. Used to list the last 5 stopped tasks and why each one stopped
[/glossary]

[glossary]
t: Deployment Rollout State
d: The ECS-reported status of a service deployment, either COMPLETED, IN_PROGRESS, or FAILED
e: e.g. A FAILED rollout state signals the new task definition never reached a healthy state
[/glossary]

[glossary]
t: GetMetricStatistics
d: A CloudWatch API call used to retrieve aggregated metric data such as a CPU average over a time window
e: e.g. The skill calls it to compute the 15-minute average CPU utilization per instance
[/glossary]

[glossary]
t: IAM
d: AWS's Identity and Access Management service for controlling who or what can call which APIs
e: e.g. The skill authenticates as a dedicated IAM user named openclaw-bot
[/glossary]

[glossary]
t: Least Privilege
d: The security principle of granting only the exact permissions required to do a job, nothing more
e: e.g. The skill's IAM policy contains only Describe/List/Get actions, never write actions
[/glossary]

[glossary]
t: Read-Only Policy
d: An IAM policy restricted to non-mutating actions like Describe*, List*, and Get*
e: e.g. OpenClawAWSHealthReadOnly grants only those three action prefixes
[/glossary]

[glossary]
t: Access Key ID / Secret Access Key
d: The credential pair used to authenticate an IAM user programmatically against AWS APIs
e: e.g. These two values are set as environment variables for the skill to authenticate
[/glossary]

[glossary]
t: AWS_SESSION_TOKEN
d: An additional environment variable required only when using temporary, assumed-role credentials
e: e.g. Left unset for a standard long-lived IAM user, but required when assuming a role via STS
[/glossary]

[glossary]
t: Crash Loop
d: A pattern where a container repeatedly starts and stops or crashes shortly after starting
e: e.g. Visible in ECS as several recently stopped tasks sharing the same stop reason
[/glossary]

[glossary]
t: AWS Health API
d: An AWS service reporting account- and service-level operational issues, distinct from per-resource Describe calls
e: e.g. It would tell you "ECS is degraded in ap-south-1" but not which specific service of yours is unhealthy
[/glossary]

[glossary]
t: CredentialsProviderError
d: An SDK error indicating missing or invalid AWS credentials were supplied to a client
e: e.g. Thrown when AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is unset
[/glossary]

[glossary]
t: AccessDeniedException
d: An AWS API error indicating the calling identity lacks the IAM permission required for that action
e: e.g. Thrown if the openclaw-bot user's policy is missing an ecs:DescribeServices action
[/glossary]

[glossary]
t: ResourceNotFoundException
d: An AWS API error indicating the requested resource, such as an ECS cluster, does not exist under that name
e: e.g. Thrown when --cluster is passed a typo'd or nonexistent cluster name
[/glossary]
[/collapsible-section]

[collapsible-section]
## Interview Questions

[interview]
q: What problem is OpenClaw designed to solve for on-call engineers?
a: It removes the multi-tab, multi-console ritual of manually checking CloudWatch, ECS, and EC2 during an incident by letting an engineer just ask a chat-based agent for status, getting back live data pulled directly from AWS APIs instead of guessed answers.
d: easy
cat: complexity
[/interview]

[interview]
q: What is a Skill in OpenClaw, structurally?
a: A single folder containing one SKILL.md file plus any script(s) it invokes — there's no larger plugin framework involved, which keeps skills easy to write and review.
d: easy
cat: complexity
[/interview]

[interview]
q: Why does the agent execute a real script instead of generating an answer directly from the LLM?
a: So the response reflects ground-truth, live infrastructure state pulled from the AWS SDK rather than the model's best guess, which avoids hallucinated infra status during an incident when accuracy matters most.
d: easy
cat: complexity
[/interview]

[interview]
q: What are the two distinct agents inside OpenClaw, and why does that distinction matter operationally?
a: A config/setup agent and a main conversational agent. Skills only execute from the main agent, so users must explicitly switch context with "talk to agent" before any skill will trigger — forgetting this is the most common first-time mistake.
d: easy
cat: complexity
[/interview]

[interview]
q: Why is the architecture described as running "locally"?
a: The agent, gateway, and skill scripts all run on the engineer's own machine; AWS is only contacted outward via SDK calls authenticated with short-lived, scoped credentials, so no inbound webhook or always-on cloud server is required.
d: easy
cat: complexity
[/interview]

[interview]
q: Which three AWS SDK v3 client packages does the aws-health skill depend on?
a: @aws-sdk/client-ec2, @aws-sdk/client-ecs, and @aws-sdk/client-cloudwatch, each providing the typed client for its respective service's API calls.
d: easy
cat: implementation
[/interview]

[interview]
q: Why is the script run with tsx instead of being compiled first?
a: tsx executes TypeScript directly at runtime, removing the need for a separate build/compile step before running — useful for a small skill script that doesn't warrant a full build pipeline.
d: easy
cat: implementation
[/interview]

[interview]
q: Which EC2 API calls does the skill use, and what does each return?
a: DescribeInstances returns instance metadata and state; DescribeInstanceStatus returns system status checks that specifically detect hardware-level failures, separate from guest-OS checks.
d: medium
cat: implementation
[/interview]

[interview]
q: What is the chain of ECS API calls the skill walks through to build its report?
a: ListClusters, then ListServices per cluster, then DescribeServices for running/desired counts, then ListTasks, then DescribeTasks for per-task detail including stop reasons.
d: medium
cat: implementation
[/interview]

[interview]
q: How does the skill compute CPU utilization, and over what window?
a: It calls CloudWatch's GetMetricStatistics aggregated as a 15-minute average, which smooths out short spikes while still being responsive enough for an on-call decision.
d: medium
cat: implementation
[/interview]

[interview]
q: What does ECS "deployment rollout state" tell an engineer that a simple running-count doesn't?
a: It tells you whether the deployment process itself succeeded, is still progressing, or failed — a service could show the correct running count yet still be mid-rollout, or have a previously failed deployment that's worth investigating.
d: medium
cat: complexity
[/interview]

[interview]
q: Why does the skill surface the last 5 stopped tasks with stop reason instead of just the current running count?
a: A crash loop, where tasks repeatedly start and die, can look identical to a healthy service at any single snapshot in time — recent stop history with stop reasons is what actually reveals that pattern.
d: medium
cat: complexity
[/interview]

[interview]
q: What is the entry point command format used in SKILL.md to invoke the script, and what does {baseDir} represent?
a: "cd {baseDir} && npx tsx scripts/aws-health.ts", where {baseDir} is a placeholder OpenClaw resolves at runtime to the skill's own folder path so the command works regardless of where the skill is installed.
d: medium
cat: implementation
[/interview]

[interview]
q: How would you scope the health check to a single ECS cluster from the CLI?
a: By passing both flags together: "npx tsx scripts/aws-health.ts --only ecs --cluster my-cluster-name", which limits both the service domain and the specific cluster queried.
d: easy
cat: implementation
[/interview]

[interview]
q: What environment variables does the skill require, and which one is optional?
a: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION are required; AWS_SESSION_TOKEN is optional and only needed for temporary or assumed-role credentials.
d: easy
cat: implementation
[/interview]

[interview]
q: What is the core IAM principle applied to this skill, and why is it non-negotiable for an AI agent specifically?
a: Least privilege, via a dedicated read-only IAM user — non-negotiable because an agent acting on natural-language input is a less predictable caller than a fixed script run by a human, so its blast radius has to be capped at the permission layer itself.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: Why should the agent never run under AWS root credentials?
a: Root credentials have unrestricted account access; if the agent's behavior or its credentials were ever misused, root access would allow any action against any resource with no IAM boundary anywhere to stop it.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: Name the API action categories included in the skill's IAM policy.
a: Only Describe*, List*, and Get* actions across EC2, ECS, and CloudWatch — there is no Create, Modify, Stop, Terminate, or Delete action anywhere in the policy.
d: easy
cat: implementation
[/interview]

[interview]
q: What's the security trade-off of a shared, multi-user OpenClaw instance?
a: User isolation can break down if multiple users share the same OpenClaw instance and underlying file system, meaning one user's session or skill state can potentially be visible to or affect another's — a real concern when the agent has any access to sensitive infra.
d: hard
cat: tradeoffs
[/interview]

[interview]
q: How would you rotate credentials for the openclaw-bot IAM user without downtime?
a: (Situation) The current access key needs rotation for security hygiene. (Task) Avoid breaking the running agent. (Action) Create a second access key for the same user, since IAM allows up to two active keys, update openclaw.json with the new key, then restart the gateway and confirm the skill still runs. (Result) Once confirmed, deactivate and delete the old key with zero downtime in between.
d: hard
cat: application
[/interview]

[interview]
q: If you wanted finer audit visibility into what the agent did during an incident, what AWS service would you add and why?
a: AWS CloudTrail, to log every API call made by the openclaw-bot IAM user, giving a verifiable, independent audit trail of exactly what was queried, separate from and more trustworthy than the agent's own chat transcript.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: A teammate says the skill returned AccessDeniedException right after IAM setup. Walk through your diagnosis.
a: (Situation) AccessDeniedException immediately after setup. (Task) Find the missing permission without guessing. (Action) Confirm the custom policy was actually created and attached, not just created; confirm the access key belongs to the same user the policy is attached to; re-check the policy JSON includes every EC2/ECS/CloudWatch action the script calls. (Result) A typo or missing action in the policy is the most common root cause and is usually found in that order.
d: medium
cat: application
[/interview]

[interview]
q: The skill reports region: undefined. What's the most likely cause and fix?
a: AWS_REGION wasn't exported in the shell session for local testing, or wasn't set under the skill's env block in openclaw.json for the agent — set it explicitly in whichever context is actually running, then re-run.
d: easy
cat: application
[/interview]

[interview]
q: A user says "the skill isn't triggering at all" even though SKILL.md looks correct. What's the first thing you'd check?
a: Whether they're still inside the config/setup agent rather than the main conversational agent, since skills only run from the main agent — reachable by running "talk to agent" first.
d: easy
cat: application
[/interview]

[interview]
q: How would you extend this skill to proactively alert instead of waiting for a user to ask?
a: Wire an SNS topic to the relevant CloudWatch alarms or ECS task-stopped events, build a small listener that pushes that event into the OpenClaw gateway as an inbound trigger, and have the agent format and send a WhatsApp message automatically — without any user-initiated query.
d: hard
cat: application
[/interview]

[interview]
q: Why might ResourceNotFoundException be a false alarm rather than a real bug during a demo?
a: Because it's also returned simply when a cluster doesn't exist yet in that account/region, such as an empty demo environment — the same error as a config-time typo in the cluster name, so it has to be diagnosed against the actual AWS account state rather than assumed to be a code defect.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: Why is using DescribeInstances/DescribeServices preferable to the AWS Health API for this specific use case?
a: The Health API only reports account- or service-level operational status; it cannot tell you whether one specific instance or one specific ECS service of yours is unhealthy, which is exactly the per-resource granularity this skill is built to provide.
d: hard
cat: tradeoffs
[/interview]

[interview]
q: What architectural property makes the agent structurally incapable of mutating infrastructure, independent of how the LLM itself behaves?
a: The underlying IAM policy contains no mutating actions at all, so the enforcement boundary sits at the AWS permission layer rather than relying on the agent's own judgment or prompt — even a misbehaving or compromised agent simply cannot call a write API it was never granted.
d: expert
cat: tradeoffs
[/interview]

[interview]
q: In a multi-region extension using AWS_REGIONS=ap-south-1,us-east-1, what change would the script require at minimum?
a: AWS SDK clients are region-scoped, so the script would need to instantiate one client per region listed and aggregate the results into a single combined report, rather than assuming a single global client.
d: expert
cat: implementation
[/interview]
[interview]
q: You are rolling out the aws-health skill to a 15-person on-call team, each engineer on their own laptop. What architectural changes would you make compared to the single-engineer local setup, and why?
a: A per-laptop setup creates 15 copies of the same read-only IAM credentials spread across unmanaged machines, which is both operationally fragile and a credential hygiene risk. The right pattern is a single shared OpenClaw gateway on a small, hardened host — a t3.micro is more than enough for read-only polling. Each engineer still reaches it through their own WhatsApp or Slack account so sessions are isolated per user, and the gateway handles routing without them sharing a session. The IAM user remains the same read-only openclaw-bot identity, credentials live only on the shared host, and CloudTrail produces a single unified audit trail of all API calls regardless of which engineer triggered the query.
d: hard
cat: application
[/interview]

[/collapsible-section]

[collapsible-section]
## Multiple Choice Questions

[mcq]
q: What is OpenClaw?
o: A managed AWS monitoring dashboard | An open-source AI agent that runs locally and connects to tools via Skills | A paid SaaS chatbot platform | An AWS Lambda runtime
c: 1
e: OpenClaw is explicitly an open-source, locally-run AI agent that connects to external tools through Skills, not a hosted dashboard or managed service.
w: A managed dashboard implies a hosted UI, which OpenClaw isn't; it's not a paid SaaS product; it isn't an AWS Lambda runtime, it runs on the user's own machine.
d: beginner
[/mcq]

[mcq]
q: What two components make up the minimum structure of a Skill?
o: A Dockerfile and a YAML config | A folder and a SKILL.md file | A Lambda function and an API Gateway route | A CloudFormation template and a script
c: 1
e: A skill is one folder plus one SKILL.md file — there is no required Docker, Lambda, or CloudFormation layer.
w: Dockerfile/YAML, Lambda/API Gateway, and CloudFormation/script all describe heavier infrastructure patterns not required by OpenClaw's skill format.
d: beginner
[/mcq]

[mcq]
q: Which chat channels can OpenClaw connect to, per the session?
o: Only WhatsApp | Only email | WhatsApp, Telegram, and Slack | Only SMS
c: 2
e: The session names WhatsApp, Telegram, and Slack as supported channels, since OpenClaw is channel-agnostic by design.
w: WhatsApp-only, email-only, and SMS-only all undersell the channel-agnostic design described in the session.
d: beginner
[/mcq]

[mcq]
q: What does SKILL.md primarily tell the agent?
o: The pricing of the AWS services involved | When to trigger, what command to run, and how to handle errors | The full source code of the underlying script | The user's AWS account ID
c: 1
e: SKILL.md defines triggers, the invocation command, output format, and error handling for the agent to follow.
w: Pricing isn't part of a skill definition; the script's full source lives separately in scripts/; the account ID is supplied via environment variables, not SKILL.md.
d: beginner
[/mcq]

[mcq]
q: What does the agent do once a skill is triggered?
o: It generates an answer purely from its training data | It executes the underlying script and returns its real output | It asks the user to open the AWS console manually | It queues the request for a human operator
c: 1
e: The agent runs the actual script referenced by the skill and relays that script's real output back to the user.
w: Answering from training data would risk hallucinated infra state; asking the user to open the console defeats the purpose of the skill; there's no human-operator queue in this design.
d: beginner
[/mcq]

[mcq]
q: Which AWS service is used to retrieve CPU utilization in this skill?
o: AWS Config | AWS CloudTrail | Amazon CloudWatch | AWS X-Ray
c: 2
e: CloudWatch's GetMetricStatistics call is what the skill uses to compute the CPU average.
w: Config tracks resource configuration compliance, not metrics; CloudTrail logs API calls, not performance metrics; X-Ray traces distributed application requests, not infrastructure CPU.
d: beginner
[/mcq]

[mcq]
q: What time window does the skill use for its CPU average?
o: 1 minute | 5 minutes | 15 minutes | 1 hour
c: 2
e: The skill reports CPU utilization as a 15-minute average pulled from CloudWatch.
w: 1 minute and 5 minutes are shorter windows than documented; 1 hour is longer than the 15-minute window actually used.
d: beginner
[/mcq]

[mcq]
q: Which tool runs the TypeScript script without a separate build step?
o: ts-node-dev | webpack | tsx | babel
c: 2
e: tsx is named explicitly in the session and the repo as the TypeScript runner used to execute the script directly.
w: ts-node-dev, webpack, and babel are all real tools but none of them is the one documented for this specific skill.
d: beginner
[/mcq]

[mcq]
q: What credential type should NEVER be used to run this skill?
o: An IAM user with a read-only policy | Temporary credentials from an assumed role | Root account credentials | An access key scoped to Describe/List/Get actions
c: 2
e: Root account credentials are explicitly warned against, since they grant unrestricted account access with no IAM boundary to limit the agent.
w: A read-only IAM user, assumed-role temporary credentials, and a scoped Describe/List/Get key are all acceptable or recommended credential types.
d: beginner
[/mcq]

[mcq]
q: Which environment variable is optional rather than required?
o: AWS_ACCESS_KEY_ID | AWS_SECRET_ACCESS_KEY | AWS_REGION | AWS_SESSION_TOKEN
c: 3
e: AWS_SESSION_TOKEN is only needed for temporary or assumed-role credentials, while the other three are always required.
w: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION are all marked required in SKILL.md's documented environment variables.
d: beginner
[/mcq]

[mcq]
q: What command switches OpenClaw from the config agent to the main agent?
o: openclaw gateway restart | talk to agent | npx tsx scripts/aws-health.ts | openclaw login
c: 1
e: "talk to agent" is the documented command that switches context into the main conversational agent where skills actually run.
w: gateway restart reloads config but doesn't switch agents; the tsx command runs the script directly, bypassing the agent entirely; there's no documented "openclaw login" command in this flow.
d: beginner
[/mcq]

[mcq]
q: After editing openclaw.json, what must you do for changes to take effect?
o: Reinstall Node.js | Restart the OpenClaw gateway | Recreate the IAM user | Nothing — changes apply instantly
c: 1
e: "openclaw gateway restart" is explicitly required after any config change for it to be picked up.
w: Reinstalling Node.js and recreating the IAM user are unrelated to config reload; changes do not apply instantly without a restart.
d: beginner
[/mcq]

[mcq]
q: Which ECS API call sequence does the skill follow to build its report?
o: RunTask, then StopTask, then DescribeTasks | ListClusters, then ListServices, then DescribeServices, then ListTasks, then DescribeTasks | CreateService, then UpdateService, then DescribeServices | DescribeClusters only
c: 1
e: This is the documented walk-through chain used to gather full ECS cluster, service, and task data.
w: RunTask/StopTask are mutating actions never used by a read-only skill; CreateService/UpdateService are also mutating actions; DescribeClusters alone wouldn't surface per-service or per-task detail.
d: intermediate
[/mcq]

[mcq]
q: What does an EC2 "system status check" specifically detect?
o: Application-level errors in the guest OS | Underlying AWS hardware failures | IAM permission issues | DNS resolution failures
c: 1
e: System status checks catch hardware-layer problems with the underlying AWS infrastructure, distinct from instance/OS-level checks.
w: Guest-OS errors are covered by instance status checks instead; IAM issues surface as AccessDeniedException, not a status check; DNS failures aren't part of EC2 status checks at all.
d: intermediate
[/mcq]

[mcq]
q: What does ECS "deployment rollout state" indicate?
o: The cost of the current deployment | Whether the deployment is COMPLETED, IN_PROGRESS, or FAILED | The number of available instance types | The region the cluster is deployed in
c: 1
e: These three values, COMPLETED, IN_PROGRESS, and FAILED, are the documented possible rollout states.
w: Cost isn't reported by DescribeServices; available instance types relate to EC2, not an ECS deployment; the region is set via configuration, not the rollout state field.
d: intermediate
[/mcq]

[mcq]
q: Why does the skill report the last 5 stopped ECS tasks with stop reasons?
o: To calculate billing for stopped tasks | To help detect crash-loop patterns that a single snapshot would miss | To automatically restart them | To delete old task definitions
c: 1
e: Repeated recent stops sharing the same reason reveal a crash loop that wouldn't be visible from a single point-in-time running count.
w: The skill doesn't compute billing; it never restarts tasks, since it's read-only by design; it also never deletes task definitions.
d: intermediate
[/mcq]

[mcq]
q: Which IAM action prefixes are present in the skill's policy?
o: Create*, Put*, Delete* | Describe*, List*, Get* | Terminate*, Stop*, Modify* | Attach*, Detach*, Update*
c: 1
e: Only the non-mutating Describe/List/Get action prefixes are granted, matching the skill's read-only design.
w: Create/Put/Delete, Terminate/Stop/Modify, and Attach/Detach/Update are all mutating action families excluded from this policy on purpose.
d: intermediate
[/mcq]

[mcq]
q: Which error indicates the calling IAM identity lacks a required permission?
o: CredentialsProviderError | ResourceNotFoundException | AccessDeniedException | ThrottlingException
c: 2
e: AccessDeniedException maps directly to insufficient IAM permissions for the requested action.
w: CredentialsProviderError indicates missing/invalid credentials rather than a permission gap; ResourceNotFoundException means the resource doesn't exist; ThrottlingException relates to rate limits, not permissions.
d: intermediate
[/mcq]

[mcq]
q: Which error would you see if you queried a non-existent ECS cluster name?
o: CredentialsProviderError | AccessDeniedException | ResourceNotFoundException | ValidationException
c: 2
e: A wrong or nonexistent cluster name maps to ResourceNotFoundException, as documented in the skill's error handling.
w: CredentialsProviderError relates to credentials, not cluster names; AccessDeniedException relates to permissions; ValidationException typically relates to malformed input rather than a missing resource.
d: intermediate
[/mcq]

[mcq]
q: What flag scopes the health check to EC2 only?
o: --ec2-only | --only ec2 | --mode ec2 | --filter=ec2
c: 1
e: "--only ec2" is the exact documented flag for limiting the script to EC2 checks.
w: --ec2-only, --mode ec2, and --filter=ec2 are plausible-sounding but not the documented flag syntax used by this script.
d: intermediate
[/mcq]

[mcq]
q: What flag scopes ECS checks to a single named cluster?
o: --only ecs --cluster my-cluster-name | --ecs-cluster=my-cluster-name | --cluster-only my-cluster-name | --scope ecs:my-cluster-name
c: 0
e: "--only ecs --cluster my-cluster-name" is the exact documented invocation for scoping to one cluster.
w: The other three options use plausible but undocumented flag syntax not supported by this script.
d: intermediate
[/mcq]

[mcq]
q: What is the relationship between {baseDir} in SKILL.md's invoke command and the skill folder?
o: {baseDir} is a hardcoded absolute path | {baseDir} is resolved by OpenClaw to the skill's own folder location | {baseDir} refers to the user's home directory | {baseDir} is unused and can be omitted
c: 1
e: {baseDir} is a placeholder OpenClaw substitutes at runtime with the path to the skill's own folder, making the command portable across installs.
w: It is not hardcoded, it isn't the home directory, and it isn't unused — it's essential to the cd command actually working.
d: intermediate
[/mcq]

[mcq]
q: Why might multiple users sharing one OpenClaw instance be a security concern?
o: It increases AWS billing | The model becomes less accurate with more users | Users may share the same file system, breaking user isolation | It disables CloudWatch metrics
c: 2
e: Shared file system access across users can break isolation guarantees between sessions, which was raised as a core security concern in the session Q&A.
w: Billing isn't directly tied to sharing an instance; model accuracy isn't affected by the number of users; CloudWatch metrics are unrelated to this concern.
d: intermediate
[/mcq]

[mcq]
q: What is the correct AWS SDK v3 action to add for RDS health checks, per the documented extension ideas?
o: DescribeDBInstances | ListBuckets | DescribeLoadBalancers | GetQueueAttributes
c: 0
e: DescribeDBInstances is the action named in the session's extension roadmap for adding RDS health to the skill.
w: ListBuckets is an S3 action, DescribeLoadBalancers is an ELB action, and GetQueueAttributes is an SQS action — none relate to RDS.
d: intermediate
[/mcq]

[mcq]
q: Which AWS API would extend the skill to report Application Load Balancer target health?
o: DescribeInstances | DescribeTargetHealth | DescribeListeners | DescribeVpcs
c: 1
e: DescribeTargetHealth is named explicitly as the ALB extension idea for reporting target group health.
w: DescribeInstances is an EC2 call; DescribeListeners reports ALB listener config, not target health; DescribeVpcs is unrelated to ALB health.
d: intermediate
[/mcq]

[mcq]
q: What is the purpose of the AWS_SESSION_TOKEN environment variable when it is provided?
o: It replaces the access key entirely | It is required for temporary credentials from an assumed IAM role | It sets the AWS region | It encrypts the WhatsApp message
c: 1
e: AWS_SESSION_TOKEN is documented as needed specifically when using temporary credentials obtained from an assumed role via STS.
w: It does not replace the access key, it's used alongside it; it has nothing to do with setting the region; it plays no role in encrypting chat messages.
d: intermediate
[/mcq]

[mcq]
q: If the agent needed to push proactive alerts instead of waiting for a user query, which AWS service would be the natural trigger source, per the roadmap discussion?
o: AWS Config Rules only | Amazon SNS | AWS Trusted Advisor | Amazon Macie
c: 1
e: An SNS-triggered push to WhatsApp is the documented v2 idea for proactive alerting in this skill's roadmap.
w: Config Rules, Trusted Advisor, and Macie are all real AWS services but none was the one named for this specific proactive-alert extension.
d: advanced
[/mcq]

[mcq]
q: Why is using DescribeInstances/DescribeServices preferable to the AWS Health API for this specific use case?
o: The Health API is more expensive | The Health API only reports account/service-level status, not per-resource detail for a specific instance or service | The Health API cannot be called via the SDK | Describe calls are faster
c: 1
e: The Health API lacks the per-resource granularity this skill needs, since it reports broader account- or service-level operational issues rather than the status of one specific instance or service.
w: Cost isn't the deciding factor here; the Health API can be called via the SDK; speed isn't the documented reason for the choice.
d: advanced
[/mcq]

[mcq]
q: What architectural property makes the agent structurally incapable of mutating infrastructure, independent of how the LLM behaves?
o: The script has a hardcoded confirmation prompt | The underlying IAM policy contains no mutating actions | AWS blocks all automated API calls by default | The script runs in a read-only Docker container
c: 1
e: The IAM policy itself is the enforcement boundary — since it contains no Create/Modify/Delete actions, the agent cannot mutate infrastructure regardless of what the LLM decides to do.
w: There is no hardcoded confirmation prompt described; AWS does not block all automated calls by default; the script isn't documented as running in a Docker container at all.
d: advanced
[/mcq]

[mcq]
q: In a multi-region extension (AWS_REGIONS=ap-south-1,us-east-1), what change would the script require at minimum?
o: None — the SDK clients automatically detect all regions | Instantiate one client per region and aggregate results | Switch from AWS SDK v3 back to v2 | Replace EC2 calls with CloudFront calls
c: 1
e: AWS SDK clients are region-scoped, so a multi-region extension requires creating one client instance per region and combining the results into a single report.
w: SDK clients do not auto-detect multiple regions; there's no need to downgrade to SDK v2; CloudFront is unrelated to EC2/ECS health reporting.
d: advanced
[/mcq]

[mcq]
q: Why does the script print output in a structured, emoji-coded format rather than raw JSON?
o: JSON cannot be parsed by OpenClaw | The output is meant to be relayed directly to chat as-is, optimized for human chat readability | Emoji output is required by the AWS SDK | It reduces CloudWatch costs
c: 1
e: SKILL.md instructs the agent to present the script's output as-is since it's already formatted for chat readability, removing any need for the agent to reformat raw JSON.
w: OpenClaw can parse JSON fine; the AWS SDK has no emoji requirement; output formatting has no bearing on CloudWatch cost.
d: advanced
[/mcq]

[mcq]
q: What's the most defensible reason to keep the agent and its skill scripts running locally rather than as a hosted cloud service?
o: Local execution is always cheaper | It avoids the need for an inbound public endpoint and keeps credentials on infrastructure the operator directly controls | AWS SDK v3 cannot run in the cloud | WhatsApp blocks cloud-hosted bots
c: 1
e: Running locally avoids exposing an inbound public endpoint and keeps the AWS credentials confined to infrastructure the operator directly controls, reducing the attack surface compared to a hosted service.
w: Local execution isn't inherently cheaper in all cases; AWS SDK v3 runs fine in the cloud; WhatsApp doesn't categorically block cloud-hosted bots.
d: advanced
[/mcq]
[/collapsible-section]

[collapsible-section]
## Hands-On Projects

[hands-on]
[project]
title: Project 1: Build and Deploy Your Own AWS Health Skill
objective: Stand up the reference aws-health OpenClaw skill end-to-end and trigger it from WhatsApp.
time: 45-60 min
cost: Free tier eligible
prereqs: AWS account | Node.js 18+ | OpenClaw installed locally | WhatsApp linked to OpenClaw
step: Clone the reference implementation with `git clone https://github.com/yashgkar/aws-health`
step: Navigate to the IAM console and create a custom policy named OpenClawAWSHealthReadOnly using the contents of iam-policy.json
screenshot: screenshot-iam-policy-created.png | Screenshot showing the IAM policy JSON editor with the finalized read-only policy and its name
[screenshot-guide]
file: screenshot-iam-policy-created.png
task: Project 1: Build and Deploy Your Own AWS Health Skill
step: Navigate to IAM > Policies > Create Policy > JSON editor, paste iam-policy.json contents, name it OpenClawAWSHealthReadOnly, and click Create policy
show: IAM policy JSON editor with all nine Describe/List/Get actions visible, policy name field filled with "OpenClawAWSHealthReadOnly", Create policy button visible
note: Ensure all nine action lines are visible in the JSON pane — scroll if needed before capturing
[/screenshot-guide]
step: Create a dedicated IAM user named openclaw-bot and attach the OpenClawAWSHealthReadOnly policy
screenshot: screenshot-iam-user-attached.png | Screenshot showing the openclaw-bot user's Permissions tab with the policy attached
[screenshot-guide]
file: screenshot-iam-user-attached.png
task: Project 1: Build and Deploy Your Own AWS Health Skill
step: Open the openclaw-bot IAM user, go to the Permissions tab, and attach OpenClawAWSHealthReadOnly
show: IAM user detail page with Permissions tab active, OpenClawAWSHealthReadOnly listed under "Attached directly" with a green checkmark or policy ARN visible
[/screenshot-guide]
step: Generate an access key for openclaw-bot via Security credentials > Create access key
screenshot: screenshot-access-key-created.png | Screenshot showing the access key creation confirmation screen with the key ID visible (secret redacted)
[screenshot-guide]
file: screenshot-access-key-created.png
task: Project 1: Build and Deploy Your Own AWS Health Skill
step: Under the openclaw-bot user's Security credentials tab, click Create access key, select "Other" as the use case, and complete creation
show: Access key creation success screen with the Access key ID value visible; Secret access key field blurred or covered before capture
note: Never capture the actual secret access key value — blur it before screenshotting
[/screenshot-guide]
step: Run `npm install` inside the cloned repo to pull AWS SDK v3 clients and tsx
step: Export AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION locally, then run `npx tsx scripts/aws-health.ts` to verify the skill works standalone
screenshot: screenshot-local-test-success.png | Screenshot showing terminal output with a successful local health report for at least one EC2 instance
[screenshot-guide]
file: screenshot-local-test-success.png
task: Project 1: Build and Deploy Your Own AWS Health Skill
step: Run `npx tsx scripts/aws-health.ts` in the terminal with all three env vars exported
show: Terminal window displaying the AWS Health Report header, at least one EC2 instance block with name, type, AZ, state, and CPU average, and the "Health check complete." footer line
note: Zoom the terminal font to at least 14pt so all field labels are legible
[/screenshot-guide]
step: Copy the skill folder into `~/.openclaw/workspace/skills/aws-health`
step: Register the skill's credentials inside openclaw.json under skills.entries.aws-health.env, then restart the gateway with `openclaw gateway restart`
step: Run `openclaw`, then `talk to agent`, then send "check my AWS health" from WhatsApp
screenshot: screenshot-whatsapp-live-report.png | Screenshot showing a WhatsApp conversation with the agent responding to "check my AWS health" with a live EC2/ECS report
[screenshot-guide]
file: screenshot-whatsapp-live-report.png
task: Project 1: Build and Deploy Your Own AWS Health Skill
step: From WhatsApp, send the message "check my AWS health" to the OpenClaw agent number
show: WhatsApp chat window with the user message "check my AWS health" visible and the agent's reply below it containing EC2 instance status or ECS service status data
note: Capture the full reply bubble including at least one EC2 or ECS field — crop out any personal phone UI above the chat
[/screenshot-guide]
step: Clean up by deactivating and deleting the openclaw-bot access key once testing is complete, since it is no longer needed for this exercise
[/project]

[project]
title: Project 2: Harden the IAM Policy and Test Failure Modes
objective: Deliberately break and repair IAM permissions to build intuition for the skill's three core error types.
time: 20-30 min
cost: Free tier eligible
prereqs: Completed Project 1 | Access to the openclaw-bot IAM user and its attached policy
step: Confirm the OpenClawAWSHealthReadOnly policy contains only Describe/List/Get actions across EC2, ECS, and CloudWatch
screenshot: screenshot-policy-review.png | Screenshot showing the finalized IAM policy JSON with all action names visible
[screenshot-guide]
file: screenshot-policy-review.png
task: Project 2: Harden the IAM Policy and Test Failure Modes
step: Open the OpenClawAWSHealthReadOnly policy in IAM, click the JSON tab, and review all actions
show: IAM policy JSON view with all nine ec2/ecs/cloudwatch Describe/List/Get actions visible and no Create/Modify/Delete actions present
[/screenshot-guide]
step: Deliberately remove one required action, such as ecs:DescribeServices, and save the policy
step: Re-run the skill and observe the resulting AccessDeniedException
screenshot: screenshot-access-denied.png | Screenshot showing the terminal or WhatsApp output containing AccessDeniedException
[screenshot-guide]
file: screenshot-access-denied.png
task: Project 2: Harden the IAM Policy and Test Failure Modes
step: After removing ecs:DescribeServices from the policy, re-run `npx tsx scripts/aws-health.ts` and capture the error
show: Terminal output with the AccessDeniedException error message clearly visible, including the action name that was denied
[/screenshot-guide]
step: Re-attach the full policy with the removed action restored and confirm the error disappears on the next run
step: Query a deliberately incorrect ECS cluster name using `--only ecs --cluster does-not-exist` and confirm you see ResourceNotFoundException instead
screenshot: screenshot-resource-not-found.png | Screenshot comparing the AccessDeniedException output from the earlier step against this ResourceNotFoundException output side by side
[screenshot-guide]
file: screenshot-resource-not-found.png
task: Project 2: Harden the IAM Policy and Test Failure Modes
step: Run `npx tsx scripts/aws-health.ts --only ecs --cluster does-not-exist` and place the output alongside the AccessDeniedException output from the previous step
show: Two terminal panes side by side — left pane showing AccessDeniedException from the earlier broken-policy test, right pane showing ResourceNotFoundException from the wrong cluster name
note: Use a split-terminal tool or take two separate captures and arrange them in a simple side-by-side layout before screenshotting
[/screenshot-guide]
step: Unset AWS_ACCESS_KEY_ID temporarily and re-run the script to observe CredentialsProviderError, then restore the variable
screenshot: screenshot-credentials-error.png | Screenshot showing terminal output containing CredentialsProviderError
[screenshot-guide]
file: screenshot-credentials-error.png
task: Project 2: Harden the IAM Policy and Test Failure Modes
step: Run `unset AWS_ACCESS_KEY_ID` then re-run `npx tsx scripts/aws-health.ts` to trigger the credentials error
show: Terminal output with the CredentialsProviderError message clearly visible
note: After capturing, immediately run `export AWS_ACCESS_KEY_ID=...` to restore the variable before continuing
[/screenshot-guide]
[/project]
[/hands-on]
[/collapsible-section]

[collapsible-section]
## Learning Checklist

[checklist]
cat: 📚 Concepts Mastered
- Explain what OpenClaw is and what problem it solves for on-call engineers
- Describe the minimum structure of a Skill (folder + SKILL.md)
- Explain why the agent executes a real script instead of generating an answer from the LLM alone
- Understand the difference between OpenClaw's config agent and main agent
- Explain the six-stage architecture from WhatsApp message to AWS response
[/checklist]

[checklist]
cat: 🛠️ Skills Acquired
- List the three AWS SDK v3 client packages used by the aws-health skill
- Trace the ECS API call chain from ListClusters to DescribeTasks
- Read and interpret ECS deployment rollout state and stopped-task stop reasons
- Run the script locally with the correct environment variables before wiring it into OpenClaw
- Install and register a skill inside an OpenClaw instance and restart the gateway correctly
[/checklist]

[checklist]
cat: 🎓 Exam Ready
- Explain what EC2 system status checks detect versus instance status checks
- Distinguish the AWS Health API from per-resource Describe calls in scenario questions
- Recall the three ECS deployment rollout states: COMPLETED, IN_PROGRESS, FAILED
- Identify least-privilege IAM patterns as the correct answer over broader-access distractors
[/checklist]

[checklist]
cat: 💼 Hands-On Done
- Completed Project 1: Build and Deploy Your Own AWS Health Skill
- Completed Project 2: Harden the IAM Policy and Test Failure Modes
- Successfully triggered the skill end-to-end from WhatsApp
- Cleaned up the openclaw-bot access key after testing (no ongoing exposure)
[/checklist]
[/collapsible-section]

[collapsible-section]
## Reflection Questions

[reflection]
q: If you were designing this skill for your own team's infrastructure, which AWS service would you add first — RDS, ALB, or SNS-triggered alerting — and why?
hint: Think about which failure mode actually wakes your team up most often.
[/reflection]

[reflection]
q: The session's IAM policy grants account-wide (Resource: "*") access to Describe/List/Get actions. How would you tighten this further using resource-level conditions or tags, and what trade-off would that introduce?
hint: Consider tag-based IAM conditions and the maintenance cost of keeping them accurate as infrastructure grows.
[/reflection]

[reflection]
q: What would change about this architecture if the agent needed to run for a whole team instead of a single engineer?
hint: Revisit the user-isolation concern raised about shared OpenClaw instances and file systems.
[/reflection]

[reflection]
q: The script is read-only by design. Under what circumstances, if any, would you consider adding a write action, such as restarting a stuck ECS task, and what additional safeguards would you require first?
hint: Think about confirmation steps, audit logging, and limiting the blast radius of any new write permission.
[/reflection]

[reflection]
q: How would you test that your SKILL.md trigger phrases are broad enough to catch real on-call phrasing, without being so broad that they misfire on unrelated messages?
hint: Consider building a small test set of real incident messages pulled from past on-call logs.
[/reflection]

[reflection]
q: The presenter mentioned choosing a particular LLM mainly because of an existing subscription, while the skill itself is model-agnostic. What would you weigh when picking which LLM backs your own OpenClaw setup?
hint: Think about cost, latency, and how much reasoning the model actually needs to do versus simply dispatching a known script.
[/reflection]
[/collapsible-section]

[collapsible-section]
## Links & References

[ref]
text: Amazon EC2 — Official AWS Documentation
url: https://docs.aws.amazon.com/ec2/
[/ref]

[ref]
text: Amazon ECS — Official AWS Documentation
url: https://docs.aws.amazon.com/ecs/
[/ref]

[ref]
text: Amazon CloudWatch — Official AWS Documentation
url: https://docs.aws.amazon.com/cloudwatch/
[/ref]

[ref]
text: AWS Identity and Access Management (IAM) — Official Documentation
url: https://docs.aws.amazon.com/iam/
[/ref]

[ref]
text: AWS Well-Architected Framework — Security Pillar
url: https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html
[/ref]

[ref]
text: aws-health — OpenClaw Skill Reference Implementation (GitHub)
url: https://github.com/yashgkar/aws-health
[/ref]

[ref]
text: AWS Pricing — EC2, ECS, and CloudWatch
url: https://aws.amazon.com/pricing/
[/ref]

[ref]
text: AWS FAQs
url: https://aws.amazon.com/faqs/
[/ref]
[/collapsible-section]

[image-prompts]
aws-openclaw-skill-overview.png:
CONCEPT: How a single WhatsApp message becomes a live AWS infrastructure report
SHOW:
- WhatsApp chat bubble at left containing the message "check my AWS health"
- Arrow labeled "trigger" into a central robot/agent icon labeled "OpenClaw Agent (local)"
- Arrow labeled "executes skill" from the agent into a cloud icon labeled "AWS APIs"
- Arrow labeled "structured report" back into a second WhatsApp chat bubble showing a short status summary
- Small lock icon near the AWS cloud labeled "read-only credentials"

---
aws-openclaw-skill-architecture-diagram.png:
CONCEPT: The six-stage request/response architecture from WhatsApp to AWS and back
SHOW:
- Six boxes left to right connected by arrows: "WhatsApp User" -> "OpenClaw Agent (Local)" -> "AWS Health Skill (SKILL.md)" -> "AWS SDK v3" -> "EC2 / ECS / CloudWatch" -> "WhatsApp Response"
- A small IAM shield icon below the "AWS SDK v3" box labeled "read-only IAM role"
- Arrows colored differently for request flow (forward) vs response flow (return), with a small legend

---
aws-openclaw-skill-ec2-ecs-report-fields.png:
CONCEPT: Side-by-side comparison of exactly which fields the skill reports for EC2 versus ECS
SHOW:
- Left column header "EC2" listing: instance name/ID, type, AZ, state, system status check, 15-min CPU average
- Right column header "ECS" listing: clusters and services, running vs desired count, deployment rollout state, last 5 stopped tasks with reason
- A simple divider line between the two columns
- AWS service icons (compute box for EC2, container boxes for ECS) above each column header

---
aws-openclaw-skill-script-data-flow.png:
CONCEPT: Internal execution flow of aws-health.ts from startup to chat output, including its error paths
SHOW:
- Sequential boxes top to bottom: "Load env vars (keys, region)" -> "Initialize EC2/ECS/CloudWatch clients" -> "Call Describe/List/Get APIs" -> "Format structured report" -> "Print to stdout (relayed to chat)"
- Small branch off "Call Describe/List/Get APIs" pointing to an error box labeled "catch AccessDenied / ResourceNotFound / CredentialsProviderError"

---
aws-openclaw-skill-setup-sequence.png:
CONCEPT: The end-to-end setup sequence an engineer follows to get the skill working, from zero to a live WhatsApp test
SHOW:
- Five numbered steps in a horizontal timeline: "1. Clone repo + npm install" -> "2. Create read-only IAM user + policy" -> "3. Test script locally with env vars" -> "4. Copy skill into OpenClaw + configure openclaw.json" -> "5. Restart gateway + test from WhatsApp"
- Small checkmark icon above each completed step

---
aws-openclaw-skill-cheatsheet.png:
CONCEPT: A one-page summary cheat sheet tying together skill structure, IAM rules, and the request/response flow
SHOW:
- Three stacked sections: "Skill = folder + SKILL.md", "IAM = Describe/List/Get only, no root keys", "Flow = WhatsApp -> Agent -> Skill -> AWS SDK -> Response"
- A small "DO" checklist (dedicated IAM user, read-only policy, test locally first) and "DON'T" list (root keys, write permissions, skip gateway restart) side by side at the bottom
[/image-prompts]
