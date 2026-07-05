# Screenshot Guide

One entry per screenshot. Capture each in sequence during the lab.

---

## Project 1: Build and Deploy Your Own AWS Health Skill

### 1. `screenshot-iam-policy-created.png`

**Console action:** Navigate to IAM > Policies > Create Policy > JSON editor, paste iam-policy.json contents, name it OpenClawAWSHealthReadOnly, and click Create policy

**What must be visible:** IAM policy JSON editor with all nine Describe/List/Get actions visible, policy name field filled with "OpenClawAWSHealthReadOnly", Create policy button visible

**Trainer note:** Ensure all nine action lines are visible in the JSON pane — scroll if needed before capturing

---

### 2. `screenshot-iam-user-attached.png`

**Console action:** Open the openclaw-bot IAM user, go to the Permissions tab, and attach OpenClawAWSHealthReadOnly

**What must be visible:** IAM user detail page with Permissions tab active, OpenClawAWSHealthReadOnly listed under "Attached directly" with a green checkmark or policy ARN visible

---

### 3. `screenshot-access-key-created.png`

**Console action:** Under the openclaw-bot user's Security credentials tab, click Create access key, select "Other" as the use case, and complete creation

**What must be visible:** Access key creation success screen with the Access key ID value visible; Secret access key field blurred or covered before capture

**Trainer note:** Never capture the actual secret access key value — blur it before screenshotting

---

### 4. `screenshot-local-test-success.png`

**Console action:** Run `npx tsx scripts/aws-health.ts` in the terminal with all three env vars exported

**What must be visible:** Terminal window displaying the AWS Health Report header, at least one EC2 instance block with name, type, AZ, state, and CPU average, and the "Health check complete." footer line

**Trainer note:** Zoom the terminal font to at least 14pt so all field labels are legible

---

### 5. `screenshot-whatsapp-live-report.png`

**Console action:** From WhatsApp, send the message "check my AWS health" to the OpenClaw agent number

**What must be visible:** WhatsApp chat window with the user message "check my AWS health" visible and the agent's reply below it containing EC2 instance status or ECS service status data

**Trainer note:** Capture the full reply bubble including at least one EC2 or ECS field — crop out any personal phone UI above the chat

---

## Project 2: Harden the IAM Policy and Test Failure Modes

### 6. `screenshot-policy-review.png`

**Console action:** Open the OpenClawAWSHealthReadOnly policy in IAM, click the JSON tab, and review all actions

**What must be visible:** IAM policy JSON view with all nine ec2/ecs/cloudwatch Describe/List/Get actions visible and no Create/Modify/Delete actions present

---

### 7. `screenshot-access-denied.png`

**Console action:** After removing ecs:DescribeServices from the policy, re-run `npx tsx scripts/aws-health.ts` and capture the error

**What must be visible:** Terminal output with the AccessDeniedException error message clearly visible, including the action name that was denied

---

### 8. `screenshot-resource-not-found.png`

**Console action:** Run `npx tsx scripts/aws-health.ts --only ecs --cluster does-not-exist` and place the output alongside the AccessDeniedException output from the previous step

**What must be visible:** Two terminal panes side by side — left pane showing AccessDeniedException from the earlier broken-policy test, right pane showing ResourceNotFoundException from the wrong cluster name

**Trainer note:** Use a split-terminal tool or take two separate captures and arrange them in a simple side-by-side layout before screenshotting

---

### 9. `screenshot-credentials-error.png`

**Console action:** Run `unset AWS_ACCESS_KEY_ID` then re-run `npx tsx scripts/aws-health.ts` to trigger the credentials error

**What must be visible:** Terminal output with the CredentialsProviderError message clearly visible

**Trainer note:** After capturing, immediately run `export AWS_ACCESS_KEY_ID=...` to restore the variable before continuing

---
