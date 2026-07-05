## IMAGE — aws-openclaw-agents-session-aws-user-group-mumbai-overview.png
Filename: aws-openclaw-agents-session-aws-user-group-mumbai-overview.png

Create a AWS architecture diagram.

CONCEPT: How a single incoming channel message travels through OpenClaw's Gateway to an agent and back, and where AWS compute sits in that flow.
SHOW:
- User icon with a chat bubble at far left, labeled "WhatsApp / Slack / Telegram message"
- Arrow into a box labeled "Gateway (control plane)"
- Arrow from Gateway into a box labeled "Agent (SOUL.md persona)"
- Agent box connects to two smaller boxes below it: "Skills (SKILL.md)" and "Tools (executable code)"
- Agent box connects upward to a box labeled "Foundation Model (model-agnostic)"
- All of the above sit inside a large outer box labeled "AWS compute (Lightsail / EC2 / EKS / Bedrock AgentCore)"
- Arrow back out to the user icon labeled "Response"

COLOR PALETTE (USE ONLY THESE):
- AWS Orange: #FF9900
- AWS Dark: #232F3E
- Green: #3F8624
- Blue: #0073BB
- Black: #000000
- White: #FFFFFF

STYLE CONSTRAINTS:
- Canvas: 1200x800px, solid white background (#FFFFFF)
- All rectangles: Rounded corners 8px radius
- All text: Arial font family ONLY
- All icons: Simple, flat, monochrome
- Line widths: 2-3px consistently
- No shadows, gradients, or 3D effects
- No decorative elements
- Minimum 30px padding from canvas edges

CRITICAL RULES:
- Follow coordinates EXACTLY as specified
- Do NOT add creative embellishments
- Do NOT change colors
- Do NOT add extra elements
OUTPUT: PNG

---

## IMAGE — aws-openclaw-agents-session-aws-user-group-mumbai-agentcore-architecture.png
Filename: aws-openclaw-agents-session-aws-user-group-mumbai-agentcore-architecture.png

Create a AWS architecture diagram.

CONCEPT: How OpenClaw's four architectural layers (Gateway, agent persona, skills, tools) stack on top of a swappable foundation model.
SHOW:
- Four stacked horizontal bands, top to bottom: "Gateway (control plane)", "Agents (SOUL.md)", "Skills (SKILL.md — when/how)", "Tools (executable code — what)"
- Bottom band labeled "Foundation Model" with small logos/labels "Claude / GPT / other" to show model-agnosticism
- Vertical arrows connecting each band downward to show dependency
- Small annotation next to Tools band: "actual capability lives here"
- Small annotation next to Skills band: "decision logic lives here"

COLOR PALETTE (USE ONLY THESE):
- AWS Orange: #FF9900
- AWS Dark: #232F3E
- Green: #3F8624
- Blue: #0073BB
- Black: #000000
- White: #FFFFFF

STYLE CONSTRAINTS:
- Canvas: 1200x800px, solid white background (#FFFFFF)
- All rectangles: Rounded corners 8px radius
- All text: Arial font family ONLY
- All icons: Simple, flat, monochrome
- Line widths: 2-3px consistently
- No shadows, gradients, or 3D effects
- No decorative elements
- Minimum 30px padding from canvas edges

CRITICAL RULES:
- Follow coordinates EXACTLY as specified
- Do NOT add creative embellishments
- Do NOT change colors
- Do NOT add extra elements
OUTPUT: PNG

---

## IMAGE — aws-openclaw-agents-session-aws-user-group-mumbai-deployment-options.png
Filename: aws-openclaw-agents-session-aws-user-group-mumbai-deployment-options.png

Create a AWS architecture diagram.

CONCEPT: Side-by-side comparison of always-on AWS compute versus Bedrock AgentCore's on-demand, session-based model.
SHOW:
- Left panel labeled "Lightsail / EC2 / EKS" showing a continuously filled/lit server icon with caption "Always running — billed for uptime, no cold start"
- Right panel labeled "Bedrock AgentCore" showing a server icon that toggles between dim and lit with caption "Spins up per session — billed for active use, short cold start"
- A small timeline under each panel showing billing bars: continuous shaded bar for the left, intermittent shaded bars for the right
- Divider line down the center labeled "Cost vs. Cold Start Trade-off"

COLOR PALETTE (USE ONLY THESE):
- AWS Orange: #FF9900
- AWS Dark: #232F3E
- Green: #3F8624
- Blue: #0073BB
- Black: #000000
- White: #FFFFFF

STYLE CONSTRAINTS:
- Canvas: 1200x800px, solid white background (#FFFFFF)
- All rectangles: Rounded corners 8px radius
- All text: Arial font family ONLY
- All icons: Simple, flat, monochrome
- Line widths: 2-3px consistently
- No shadows, gradients, or 3D effects
- No decorative elements
- Minimum 30px padding from canvas edges

CRITICAL RULES:
- Follow coordinates EXACTLY as specified
- Do NOT add creative embellishments
- Do NOT change colors
- Do NOT add extra elements
OUTPUT: PNG

---

## IMAGE — aws-openclaw-agents-session-aws-user-group-mumbai-multi-tenancy.png
Filename: aws-openclaw-agents-session-aws-user-group-mumbai-multi-tenancy.png

Create a AWS architecture diagram.

CONCEPT: Visual contrast of the pool, silo, and bridge multi-tenancy isolation models.
SHOW:
- Three side-by-side panels labeled "Pool", "Silo", "Bridge"
- Pool panel: multiple user icons all pointing into one shared box labeled "Shared resources"
- Silo panel: multiple user icons each pointing into their own separate boxes labeled "Dedicated resources"
- Bridge panel: multiple user icons pointing into one shared box labeled "Shared front-end," each also pointing into their own small box labeled "Isolated session/data"
- Caption row beneath: "Lowest cost / weakest isolation" under Pool, "Highest cost / strongest isolation" under Silo, "Balanced" under Bridge

COLOR PALETTE (USE ONLY THESE):
- AWS Orange: #FF9900
- AWS Dark: #232F3E
- Green: #3F8624
- Blue: #0073BB
- Black: #000000
- White: #FFFFFF

STYLE CONSTRAINTS:
- Canvas: 1200x800px, solid white background (#FFFFFF)
- All rectangles: Rounded corners 8px radius
- All text: Arial font family ONLY
- All icons: Simple, flat, monochrome
- Line widths: 2-3px consistently
- No shadows, gradients, or 3D effects
- No decorative elements
- Minimum 30px padding from canvas edges

CRITICAL RULES:
- Follow coordinates EXACTLY as specified
- Do NOT add creative embellishments
- Do NOT change colors
- Do NOT add extra elements
OUTPUT: PNG

---

## IMAGE — aws-openclaw-agents-session-aws-user-group-mumbai-security-layers.png
Filename: aws-openclaw-agents-session-aws-user-group-mumbai-security-layers.png

Create a AWS architecture diagram.

CONCEPT: The seven layers of AI agent attack surface, stacked to show where different security controls apply.
SHOW:
- Seven horizontal bands stacked vertically, labeled top to bottom: "Foundational Model", "Data", "Agent Framework", "Service/Tooling", "Observability", "Network", "Credentials/Insider"
- A small icon or one-word control label to the right of each band: "Guardrails" next to Foundational Model, "Encryption/IAM" next to Data, "Reviewed skills/tools" next to Agent Framework, "AgentCore Gateway" next to Service/Tooling, "CloudWatch/CloudTrail" next to Observability, "Private subnet/WAF" next to Network, "Session Manager/Identity" next to Credentials/Insider
- A vertical arrow along the left edge labeled "Attack surface, top to bottom"

COLOR PALETTE (USE ONLY THESE):
- AWS Orange: #FF9900
- AWS Dark: #232F3E
- Green: #3F8624
- Blue: #0073BB
- Black: #000000
- White: #FFFFFF

STYLE CONSTRAINTS:
- Canvas: 1200x800px, solid white background (#FFFFFF)
- All rectangles: Rounded corners 8px radius
- All text: Arial font family ONLY
- All icons: Simple, flat, monochrome
- Line widths: 2-3px consistently
- No shadows, gradients, or 3D effects
- No decorative elements
- Minimum 30px padding from canvas edges

CRITICAL RULES:
- Follow coordinates EXACTLY as specified
- Do NOT add creative embellishments
- Do NOT change colors
- Do NOT add extra elements
OUTPUT: PNG

---

## IMAGE — aws-openclaw-agents-session-aws-user-group-mumbai-cheatsheet.png
Filename: aws-openclaw-agents-session-aws-user-group-mumbai-cheatsheet.png

Create a AWS architecture diagram.

CONCEPT: A one-page recap connecting deployment choice, multi-tenancy model, and top security controls for running OpenClaw on AWS.
SHOW:
- Three labeled columns: "Deployment Options" (Lightsail, EC2, EKS, Bedrock AgentCore with one-line notes), "Multi-Tenancy" (Pool, Silo, Bridge with one-line notes), "Top Security Controls" (Session Manager, Private Subnet, Guardrails, Audit Logging)
- A small footer strip reading "OpenClaw on AWS — Quick Reference"
- Minimal icons per row rather than dense paragraphs, kept scannable

COLOR PALETTE (USE ONLY THESE):
- AWS Orange: #FF9900
- AWS Dark: #232F3E
- Green: #3F8624
- Blue: #0073BB
- Black: #000000
- White: #FFFFFF

STYLE CONSTRAINTS:
- Canvas: 1200x800px, solid white background (#FFFFFF)
- All rectangles: Rounded corners 8px radius
- All text: Arial font family ONLY
- All icons: Simple, flat, monochrome
- Line widths: 2-3px consistently
- No shadows, gradients, or 3D effects
- No decorative elements
- Minimum 30px padding from canvas edges

CRITICAL RULES:
- Follow coordinates EXACTLY as specified
- Do NOT add creative embellishments
- Do NOT change colors
- Do NOT add extra elements
OUTPUT: PNG
