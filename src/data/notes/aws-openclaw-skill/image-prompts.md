## IMAGE — aws-openclaw-skill-overview.png
Filename: aws-openclaw-skill-overview.png

Create a AWS architecture diagram.

CONCEPT: How a single WhatsApp message becomes a live AWS infrastructure report
SHOW:
- WhatsApp chat bubble at left containing the message "check my AWS health"
- Arrow labeled "trigger" into a central robot/agent icon labeled "OpenClaw Agent (local)"
- Arrow labeled "executes skill" from the agent into a cloud icon labeled "AWS APIs"
- Arrow labeled "structured report" back into a second WhatsApp chat bubble showing a short status summary
- Small lock icon near the AWS cloud labeled "read-only credentials"

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

## IMAGE — aws-openclaw-skill-architecture-diagram.png
Filename: aws-openclaw-skill-architecture-diagram.png

Create a AWS architecture diagram.

CONCEPT: The six-stage request/response architecture from WhatsApp to AWS and back
SHOW:
- Six boxes left to right connected by arrows: "WhatsApp User" -> "OpenClaw Agent (Local)" -> "AWS Health Skill (SKILL.md)" -> "AWS SDK v3" -> "EC2 / ECS / CloudWatch" -> "WhatsApp Response"
- A small IAM shield icon below the "AWS SDK v3" box labeled "read-only IAM role"
- Arrows colored differently for request flow (forward) vs response flow (return), with a small legend

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

## IMAGE — aws-openclaw-skill-ec2-ecs-report-fields.png
Filename: aws-openclaw-skill-ec2-ecs-report-fields.png

Create a AWS architecture diagram.

CONCEPT: Side-by-side comparison of exactly which fields the skill reports for EC2 versus ECS
SHOW:
- Left column header "EC2" listing: instance name/ID, type, AZ, state, system status check, 15-min CPU average
- Right column header "ECS" listing: clusters and services, running vs desired count, deployment rollout state, last 5 stopped tasks with reason
- A simple divider line between the two columns
- AWS service icons (compute box for EC2, container boxes for ECS) above each column header

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

## IMAGE — aws-openclaw-skill-script-data-flow.png
Filename: aws-openclaw-skill-script-data-flow.png

Create a AWS architecture diagram.

CONCEPT: Internal execution flow of aws-health.ts from startup to chat output, including its error paths
SHOW:
- Sequential boxes top to bottom: "Load env vars (keys, region)" -> "Initialize EC2/ECS/CloudWatch clients" -> "Call Describe/List/Get APIs" -> "Format structured report" -> "Print to stdout (relayed to chat)"
- Small branch off "Call Describe/List/Get APIs" pointing to an error box labeled "catch AccessDenied / ResourceNotFound / CredentialsProviderError"

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

## IMAGE — aws-openclaw-skill-setup-sequence.png
Filename: aws-openclaw-skill-setup-sequence.png

Create a AWS architecture diagram.

CONCEPT: The end-to-end setup sequence an engineer follows to get the skill working, from zero to a live WhatsApp test
SHOW:
- Five numbered steps in a horizontal timeline: "1. Clone repo + npm install" -> "2. Create read-only IAM user + policy" -> "3. Test script locally with env vars" -> "4. Copy skill into OpenClaw + configure openclaw.json" -> "5. Restart gateway + test from WhatsApp"
- Small checkmark icon above each completed step

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

## IMAGE — aws-openclaw-skill-cheatsheet.png
Filename: aws-openclaw-skill-cheatsheet.png

Create a AWS architecture diagram.

CONCEPT: A one-page summary cheat sheet tying together skill structure, IAM rules, and the request/response flow
SHOW:
- Three stacked sections: "Skill = folder + SKILL.md", "IAM = Describe/List/Get only, no root keys", "Flow = WhatsApp -> Agent -> Skill -> AWS SDK -> Response"
- A small "DO" checklist (dedicated IAM user, read-only policy, test locally first) and "DON'T" list (root keys, write permissions, skip gateway restart) side by side at the bottom

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
