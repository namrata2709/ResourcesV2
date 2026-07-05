# Diagram Prompts — openclaw-agents-session-aws-user-group-mumbai

## Slide 9, image #1

A vertical stack — Gateway on top, then Agents, then Skills, then Tools, all resting on a "Foundation Model" base layer. The base layer is drawn as swappable (dashed outline or a swap icon), showing the model underneath can be Claude, GPT, or another provider without changing the layers above it.

## Slide 15, image #1

A two-column comparison. Left column: Lightsail/EC2/EKS icon with a billing meter running continuously, flat line. Right column: Bedrock AgentCore icon with a billing meter that only spikes during short bursts of active use. The point is continuous uptime billing versus intermittent, usage-based billing.

## Slide 20, image #1

Three side-by-side panels — Pool (one shared box holding all users' icons together), Silo (separate fully isolated boxes, one per user), Bridge (a shared outer box with individually locked inner compartments per user). A fourth panel shows Bedrock AgentCore providing silo-level isolation per session without a separately provisioned stack per user.

## Slide 26, image #1

Seven horizontal layers stacked top to bottom — Foundational model, Data, Agent framework, Service/tooling, Observability, Network, Credentials/insider access — each labeled alongside its matching AWS control (Guardrails, encryption/IAM, skill review, audit logging, CloudWatch, VPC/security groups, Session Manager). Point: each layer needs its own independent control.
