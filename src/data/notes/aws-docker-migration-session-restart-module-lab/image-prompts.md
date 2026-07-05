## IMAGE — aws-docker-migration-lab8-1-before-after.png
Filename: aws-docker-migration-lab8-1-before-after.png

Create a AWS architecture diagram.

CONCEPT: Shows the "before" state (app and database installed directly on two EC2 guest OSes) transforming into the "after" state (both running as portable Docker containers on one container host)
SHOW:
- Left half labeled "Before": two separate dashed EC2 instance boxes, "AppServerNode" containing a purple "node app" bar, "MysqlServerNode" containing a blue "mysql" bar, each on top of a light green "EC2 instance guest OS" bar, connected by a "Network connectivity" arrow
- Right half labeled "After": one dashed EC2 instance box labeled "DockerHost", containing an orange "Docker Engine" bar on a green "EC2 instance guest OS" bar, with two small dashed container boxes on top holding "node app" and "mysql" bars respectively, connected to each other by a short "Network connectivity" arrow
- A large arrow from the left half to the right half labeled "Migrate"

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

## IMAGE — aws-docker-migration-lab8-1-build-flow.png
Filename: aws-docker-migration-lab8-1-build-flow.png

Create a AWS architecture diagram.

CONCEPT: Shows the sequential flow from source code and a Dockerfile through docker build into a Docker image, then through docker run into a running container
SHOW:
- Left box labeled "Build directory" containing two items: "App code base" and "Dockerfile"
- Arrow labeled "docker build" pointing right from the build directory to a box labeled "Docker image"
- Arrow labeled "docker run" pointing right from the Docker image box to a box labeled "Docker container"
- Small icon or label near the Dockerfile indicating it references a "Base image" pulled from a registry

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

## IMAGE — aws-docker-migration-lab8-1-account-setup.png
Filename: aws-docker-migration-lab8-1-account-setup.png

Create a AWS architecture diagram.

CONCEPT: Shows how the IAM user, the IAM role/instance profile, and the shared security group relate to the three EC2 instances provisioned in this lab
SHOW:
- Top left: a small person icon labeled "IAM User: docker-lab-admin" with an arrow labeled "signs in to" pointing to the AWS Management Console
- Top right: a badge icon labeled "IAM Role: docker-lab-ecr-role" with a dashed arrow labeled "attached as instance profile" pointing down to one specific instance box labeled "DockerHost"
- Center: a large dashed rectangle labeled "Security group: docker-lab-sg" containing three instance boxes side by side — "AppServerNode", "MysqlServerNode", and "DockerHost" — each shown as a small EC2 icon
- Small labeled arrows between the instance boxes inside the security group rectangle showing "port 3306 (self-referencing rule)" and separate external arrows from outside the rectangle labeled "22, 80, 3000 from My IP"

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

## IMAGE — aws-docker-migration-lab8-1-container-network.png
Filename: aws-docker-migration-lab8-1-container-network.png

Create a AWS architecture diagram.

CONCEPT: Shows two containers, node_app and mysql, communicating over Docker's internal bridge network using container IP addresses rather than EC2 instance IPs
SHOW:
- One dashed outer box labeled "DockerHost (EC2 instance)" containing an orange "Docker Engine" bar
- Inside it, two dashed container boxes side by side: left one labeled "node_app_1" with a purple "node app" bar and "Bins/Libs", right one labeled "mysql_1" with a blue "mysql" bar and "Bins/Libs"
- A bidirectional arrow between the two containers labeled "Bridge network — internal container IP"
- A crossed-out arrow pointing outward to a faded "MysqlServerNode EC2 instance" box, indicating the app no longer talks to the original EC2-hosted database

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

## IMAGE — aws-docker-migration-lab8-1-ecr-push-flow.png
Filename: aws-docker-migration-lab8-1-ecr-push-flow.png

Create a AWS architecture diagram.

CONCEPT: Shows the sequence of docker login (via an IAM role, not static keys), docker tag, and docker push moving a local image into an Amazon ECR repository
SHOW:
- Left box labeled "Local Docker image: node_app:latest" on DockerHost
- Small badge icon labeled "docker-lab-ecr-role (instance profile)" feeding into a "docker login" step via an arrow labeled "aws ecr get-login-password"
- Arrow labeled "docker tag" pointing to a box labeled "Tagged image: <registry-id.dkr.ecr.us-east-1.amazonaws.com/node-app:latest"
- Arrow labeled "docker push" pointing from the tagged image box to a final box labeled "Amazon ECR repository: node-app" containing a small "latest" tag icon inside it

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
