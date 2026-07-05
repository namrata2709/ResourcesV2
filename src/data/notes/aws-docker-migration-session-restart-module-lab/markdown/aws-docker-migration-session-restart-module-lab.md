---
type: aws
title: Migrating a Web Application to Docker Containers
slug: docker-migration-session-restart-module-lab
topic_number: 8.1
date: 2026-07-01
date_modified:
keywords: [Docker, Docker containers, Amazon ECR, Dockerfile, container migration, Docker image, EC2, Node.js containerization, IAM, personal AWS account]
tags: [Docker, Containers, Amazon ECR, AWS Labs]
when_to_use: Use this lab when you need hands-on practice — entirely in your own AWS account, with nothing pre-provisioned for you — building source infrastructure from scratch, migrating an app and its database into Docker containers, and publishing the image to Amazon ECR.
comparison_topic: Containers vs Virtual Machines
audience: beginner
aws_doc_version: 2026-07-01
validated_against:
lecturer_name:
lecturer_url:
session_name: Module 8 — Containers — Lab 8.1 (Personal AWS Account Edition)
session_url:
---


[collapsible-section o]
## Introduction

Sofía, the developer at the café's newly acquired coffee-supplier business, has an inventory app that only runs because two specific servers happen to have Node.js and MySQL installed exactly right. In this lab you'll fix that fragility: you'll package the app and its database into **Docker containers** so they can run anywhere the Docker engine runs, then push the finished image to **Amazon ECR** so it's ready for future deployment.

[note]This version of the lab runs entirely in **your own AWS account** — there is no pre-built sandbox environment, no temporary IDE, and no auto-graded submission. You will provision every piece of infrastructure yourself, including the two source servers a hosted version of this lab would normally hand you already configured. Every resource you create is real and billable, so **Cleanup at the end is not optional**.[/note]



[/collapsible-section]

[collapsible-section]
## Background


[collapsible-section]
### What is Docker?

==Docker is a platform that packages an application together with everything it needs to run — code, runtime, system libraries, configuration — into a single portable unit called a **container**.== Think of it like a shipping container in global freight: before standardized containers, every cargo ship had to be loaded differently depending on what it carried — barrels, crates, sacks, machinery — all needing custom handling. Standard containers meant any crane, ship, or truck could move any cargo the same way. Docker does the same thing for software: any machine with the Docker engine installed can run your app the same way, regardless of what's installed on that machine's operating system.

A **Docker image** is the sealed shipping container itself — a read-only template built from instructions in a **Dockerfile**. A **Docker container** is what you get when you actually run that image — a live, running instance of it. One image can produce many running containers, the same way one shipping-container blueprint can produce thousands of identical physical containers.



[/collapsible-section]

[collapsible-section]
### Containers vs Virtual Machines

Learners frequently confuse containers with virtual machines because both "isolate" an application. The difference is what gets duplicated:

| Aspect | Container | Virtual Machine |
|---|---|---|
| What's virtualized | The application layer, on top of a shared host OS kernel | An entire guest OS, on top of a hypervisor |
| Startup time | Seconds | Minutes |
| Image size | Megabytes | Gigabytes |
| Resource overhead | Low — no duplicate OS kernel | Higher — each VM runs a full OS |
| Isolation strength | Process-level isolation | Full hardware-level isolation |
| Portability | Runs identically anywhere Docker runs | Tied to the hypervisor/format used |

==Containers share the host machine's OS kernel, while virtual machines each run their own full guest operating system== — this is the single fact most exam questions and interview questions are testing when they ask "why are containers lighter than VMs?"



[/collapsible-section]

[collapsible-section]
### Why does this matter for this lab?

Right now the coffee-supplier app is installed directly on the guest OS of an EC2 instance — if that instance's OS, Node.js version, or system libraries ever changed, the app could silently break. ==Moving the app into a container decouples the application from the specific server it happens to run on==, which is exactly the problem Sofía needs solved before the café can confidently scale, redeploy, or hand this application off to another team.

Running this lab in your own account adds a second, very practical lesson on top of the Docker one: everything you spin up (three EC2 instances, a security group, a key pair, an IAM role, an ECR repository) has a real cost profile and a real blast radius. Provisioning it deliberately — and tearing it all down afterward — is itself part of what a cloud engineer does every day.

[image:aws-docker-migration-lab8-1-before-after.png|Before/after: app and database installed directly on two EC2 guest OSes, versus both running as portable Docker containers on a single container host]




[/collapsible-section]

[/collapsible-section]

[collapsible-section]
## Lab Overview

**What you're building:** From a completely empty AWS account, you'll provision the identity, network, and compute resources the lab needs; stand up two "legacy" EC2 instances that run a Node.js/Express inventory application and its MySQL backend directly on the guest OS (recreating the fragile starting point); containerize both with Docker on a third EC2 instance acting as your container host; and finally push the finished application image to a new Amazon ECR repository.

- **Time estimate:** ~45-60 minutes for account/infrastructure setup (Tasks 1-3), ~60 minutes for the core migration (Tasks 4-8). Add 45-90 minutes if you work through the Extended Tasks and bonus projects.
- **Cost estimate:** This lab uses real AWS resources in your own account. Three `t3.micro` EC2 instances are Free Tier eligible (750 instance-hours/month combined, for 12 months on a new account) — outside Free Tier, budget roughly **$0.01-0.02/hour per instance** (~$0.03-0.06/hour for all three running together) in `us-east-1`. Amazon ECR gives 500 MB-month of private storage free; this lab's images comfortably fit inside that. There is no charge for the IAM user, IAM role, key pair, or security group themselves.
- **Prerequisites:** An AWS account where you can sign in as the root user at least once (to create an IAM user), basic command-line comfort, and a rough idea of what an EC2 instance and a public/private IP address are. No prior Docker experience needed.

[image:aws-docker-migration-lab8-1-build-flow.png|End-to-end flow: source code + Dockerfile → docker build → Docker image → docker run → running container]



[/collapsible-section]

[collapsible-section]
## What You Will Accomplish

[takeaways]
- Create a least-privilege-minded IAM user and an IAM role for EC2-to-ECR authentication, instead of using the root user or long-lived access keys
- Provision a key pair and a security group from scratch and reason about which ports actually need to be open
- Launch and manually configure two "legacy" EC2 instances that run a Node.js app and a MySQL database directly on their guest OS
- Launch a container host EC2 instance and install Docker, Git, and the AWS CLI on it
- Write a Dockerfile that packages a Node.js application into a Docker image
- Build a Docker image from a Dockerfile and run it as a container
- Diagnose and fix a container networking/configuration problem using environment variables
- Migrate a MySQL database's data into a Docker container using `mysqldump`
- Connect two containers so the app container can reach the database container
- Create an Amazon ECR repository and authenticate the Docker client to it using an IAM role instead of static credentials
- Tag and push a Docker image to Amazon ECR
- Fully tear down every resource you created, leaving no ongoing charges
[/takeaways]



[/collapsible-section]

[collapsible-section]
## Task 1: Setting Up Your AWS Environment

This task exists because a hosted version of this lab would normally do all of this for you before you ever see it. In your own account, you're doing it yourself — which is also where most of the transferable, job-relevant skill in this lab actually lives.


Create an IAM user for this lab (don't work as the root user).

Sign in to the AWS Management Console as the account root user, only for this one step.
Open the IAM console, choose Users → Create user.
Name it docker-lab-admin, enable console access with a custom password, and un-check "require password reset" for a personal lab account.
On the permissions step, choose Attach policies directly and attach AdministratorAccess.
[note]`AdministratorAccess` is a convenience for a personal learning account so you don't get blocked mid-lab by a missing permission. In a real team environment you would scope this down to only the EC2, IAM, and ECR actions this lab actually needs — least privilege, not administrator, is the production default.[/note]

Finish creating the user, then sign out of the root user and sign back in as docker-lab-admin for the rest of this lab.


screenshot: screenshot-iam-user-created.png | IAM console showing the newly created docker-lab-admin user with AdministratorAccess attached
[screenshot-guide]
file: screenshot-iam-user-created.png
task: Task 1: Setting Up Your AWS Environment
step: Finish the Create user wizard for docker-lab-admin
show: The user summary page showing the username, console access enabled, and the AdministratorAccess policy listed under permissions
[/screenshot-guide]


Create an EC2 key pair.

Open the EC2 console → Key Pairs (under Network & Security) → Create key pair.
Name it docker-lab-key, type RSA, format .pem (use .ppk only if you're connecting with PuTTY on Windows).
Download the file when prompted — this is your only chance to get it; AWS does not store a copy.
On macOS/Linux, lock down its permissions so SSH will accept it:
chmod 400 ~/Downloads/docker-lab-key.pem


[note]If you'd rather not manage a key file locally at all, you can skip key-pair-based SSH entirely and use EC2 Instance Connect (a browser-based terminal in the EC2 console) for every SSH step in this lab instead. Create the key pair anyway — some EC2 launch flows require selecting one.[/note]


Create a shared security group.

EC2 console → Security Groups → Create security group.
Name: docker-lab-sg. Description: "Shared SG for the Docker migration lab — SSH, app ports, and internal DB traffic."
VPC: your account's default VPC.
Add these inbound rules:


| Type | Port | Source | Purpose |
|---|---|---|---|
| SSH | 22 | My IP | Connect to any lab instance from your machine |
| Custom TCP | 80 | My IP | Browse the app directly on AppServerNode (Task 4) |
| Custom TCP | 3000 | My IP | Browse the containerized app on the container host (Task 5+) |
| Custom TCP | 3306 | Self (this security group's ID) | Let the container host and app instance reach MySQL on MysqlServerNode, without exposing 3306 to the internet |


You'll attach this one security group to all three EC2 instances in this lab — it's simpler to reason about than three separate groups, and the self-referencing rule means any instance in the group can reach any other instance in the group on port 3306 without opening that port publicly.


screenshot: screenshot-security-group-rules.png | EC2 security group inbound rules table showing SSH, port 80, port 3000 from My IP, and port 3306 with itself as the source
[screenshot-guide]
file: screenshot-security-group-rules.png
task: Task 1: Setting Up Your AWS Environment
step: Save the inbound rules for docker-lab-sg
show: All four inbound rules listed with their correct ports and sources, especially the self-referencing 3306 rule
[/screenshot-guide]


Create an IAM role so EC2 can authenticate to Amazon ECR without stored credentials.

IAM console → Roles → Create role.
Trusted entity type: AWS service. Use case: EC2.
Attach the AmazonElasticContainerRegistryFullAccess managed policy.
Name the role docker-lab-ecr-role and create it.

[important]This role — not a username/password or a long-lived access key pair — is what will let your container host authenticate to Amazon ECR in Task 8. You'll attach it directly to that instance when you launch it in Task 3. This is the AWS-recommended pattern: EC2 instances get temporary, automatically-rotated credentials from an attached role instead of static keys stored on disk.[/important]

screenshot: screenshot-iam-role-created.png | IAM console showing the docker-lab-ecr-role summary with EC2 as the trusted entity and AmazonElasticContainerRegistryFullAccess attached
[screenshot-guide]
file: screenshot-iam-role-created.png
task: Task 1: Setting Up Your AWS Environment
step: Finish the Create role wizard for docker-lab-ecr-role
show: The role summary page showing "Trusted entities: ec2.amazonaws.com" and the attached ECR policy
[/screenshot-guide]



[image:aws-docker-migration-lab8-1-account-setup.png|Relationship between the IAM user, the IAM role/instance profile, the shared security group, and the three EC2 instances this lab provisions]



[/collapsible-section]

[collapsible-section]
## Task 2: Launching and Configuring the Source Instances

In a hosted version of this lab, `AppServerNode` and `MysqlServerNode` already exist and are already configured when you start. Here, you're building the fragile "before" state yourself — which is exactly what makes the later migration meaningful instead of abstract.


Launch MysqlServerNode first (the app instance will need its address).

EC2 console → Launch instance.
Name: MysqlServerNode.
AMI: Amazon Linux 2023.
Instance type: t3.micro (Free Tier eligible).
Key pair: docker-lab-key.
Network settings → Select existing security group → docker-lab-sg.
Leave storage at the default 8 GiB gp3 volume.
Choose Launch instance, then wait for its status check to pass.



Connect to MysqlServerNode.

Copy its Public IPv4 address from the instance details.
From your terminal: ssh -i ~/Downloads/docker-lab-key.pem ec2-user@&lt;MysqlServerNode-public-ip&gt;
Or, from the EC2 console, select the instance → Connect → EC2 Instance Connect → Connect for a browser-based shell with no key needed.



Install and configure MariaDB (MySQL-compatible) on MysqlServerNode.
sudo dnf update -y
sudo dnf install -y mariadb105-server
sudo systemctl enable --now mariadb
By default MariaDB only listens on `127.0.0.1`. Allow connections from other instances in the lab:
sudo sed -i 's/^bind-address.*/bind-address=0.0.0.0/' /etc/my.cnf.d/mariadb-server.cnf
sudo systemctl restart mariadb


Create the database, seed a sample record, and create the app's database user.
sudo mysql &lt;&lt;'SQL'
CREATE DATABASE COFFEE;
USE COFFEE;
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  address VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(50),
  email VARCHAR(100),
  phone VARCHAR(20)
);
INSERT INTO suppliers (name, address, city, state, email, phone)
VALUES ('Nikki Wolf', '100 Main Street', 'Anytown', 'CA', 'nwolf@example.com', '4155551212');
CREATE USER 'nodeapp'@'%' IDENTIFIED BY 'coffee';
GRANT ALL PRIVILEGES ON COFFEE.* TO 'nodeapp'@'%';
FLUSH PRIVILEGES;
SQL
[note]This recreates, by hand, the database state a hosted version of this lab would give you pre-loaded. `coffee` is used as the password here to match the rest of this lab's steps — in any account you keep past today, replace it with a real secret and see the Extended Task on security review below.[/note]


Note the instance's private IPv4 address (EC2 console → instance details → Private IPv4 address) — you'll use this, not the public IP, as `APP_DB_HOST` from here on, since AppServerNode and the container host both reach it over the VPC's internal network at no data-transfer cost.

Launch AppServerNode. Repeat the launch steps above with Name AppServerNode, same AMI, instance type, key pair, and docker-lab-sg security group.

Connect to AppServerNode the same way you connected to MysqlServerNode.

Install Node.js, Git, and unzip, then download the lab's application source.
sudo dnf update -y
sudo dnf install -y nodejs git unzip
node --version
wget https://aws-tc-largeobjects.s3.us-west-2.amazonaws.com/CUR-TF-200-ACCDEV-2-91558/06-lab-containers/code.zip
unzip code.zip
sudo mv resources/codebase_partner /opt/codebase_partner
cd /opt/codebase_partner
sudo npm install
[note]This archive is AWS Training's own publicly hosted lab content bucket, used across multiple self-paced AWS courses — it isn't tied to any particular hosted lab session. If it's ever unavailable, use a copy of `codebase_partner` you saved from a previous run, or rebuild the app's structure from the `config.js` snippet shown in Task 4 (a small Express app with a `/suppliers` route backed by the `COFFEE` database).[/note]


Run the app directly on the guest OS, listening on port 80.
Open /opt/codebase_partner/app/config/config.js and confirm it reads `APP_DB_HOST`, `APP_DB_USER`, `APP_DB_PASSWORD`, and `APP_DB_NAME` from environment variables when present (see Task 4 for exactly how this fallback logic works). Then create a systemd service so the app survives reboots and keeps running after you disconnect:
sudo tee /etc/systemd/system/coffee-app.service &gt; /dev/null &lt;&lt;'UNIT'
[Unit]
Description=Coffee Supplier Node App (direct guest-OS install)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/codebase_partner
Environment=PORT=80
Environment=APP_DB_HOST=&lt;MysqlServerNode-private-ip&gt;
Environment=APP_DB_USER=nodeapp
Environment=APP_DB_PASSWORD=coffee
Environment=APP_DB_NAME=COFFEE
ExecStart=/usr/bin/npm start
Restart=on-failure
User=root

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now coffee-app
[note]Replace `&lt;MysqlServerNode-private-ip&gt;` with the address you noted earlier. Binding to port 80 is why this unit runs as `root` — a deliberate, temporary shortcut typical of a "fragile legacy install," and one more reason containerizing this app (which will run on an unprivileged port) is an improvement, not just a lateral move.[/note]


Verify locally, then from your browser.
curl -I http://localhost
Then open http://&lt;AppServerNode-public-ip&gt; in your browser — the coffee-suppliers website should load over plain HTTP (your browser's "not secure" warning is expected; there is no TLS certificate in this lab).

screenshot: screenshot-appservernode-live.png | Browser showing the coffee-suppliers homepage loaded from AppServerNode's public IP address
[screenshot-guide]
file: screenshot-appservernode-live.png
task: Task 2: Launching and Configuring the Source Instances
step: Load http://<AppServerNode-public-ip in a browser
show: The coffee-suppliers homepage with the navigation bar and "List of suppliers" link visible
[/screenshot-guide]





[/collapsible-section]

[collapsible-section]
## Task 3: Launching Your Container Host and Preparing the Development Environment


Launch the container host instance.

EC2 console → Launch instance. Name: DockerHost.
AMI: Amazon Linux 2023. Instance type: t3.micro (use t3.small if you plan to also run the Docker Compose bonus project, for a little more headroom).
Key pair: docker-lab-key. Security group: docker-lab-sg.
Expand Advanced details → IAM instance profile → select docker-lab-ecr-role. This is what replaces the LabIDE's pre-authenticated environment from a hosted version of this lab.
Launch the instance.


screenshot: screenshot-dockerhost-iam-role.png | EC2 launch wizard Advanced details panel showing docker-lab-ecr-role selected as the IAM instance profile
[screenshot-guide]
file: screenshot-dockerhost-iam-role.png
task: Task 3: Launching Your Container Host and Preparing the Development Environment
step: Select the IAM instance profile in Advanced details before launching DockerHost
show: The IAM instance profile dropdown with docker-lab-ecr-role selected
[/screenshot-guide]


Connect to DockerHost the same way you connected to the other two instances.

Install Docker, Git, and unzip.
sudo dnf update -y
sudo dnf install -y docker git unzip
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
Log out and reconnect (or run newgrp docker) so your shell picks up the new group membership, then confirm Docker works without `sudo`:
docker run hello-world


Verify the AWS CLI and the attached IAM role.
Amazon Linux 2023 ships with the AWS CLI v2 preinstalled:
aws --version
aws sts get-caller-identity
==`aws sts get-caller-identity` should show an assumed-role ARN for `docker-lab-ecr-role`, not an IAM user== — confirmation that DockerHost is authenticating through its attached role rather than any stored access key, exactly as intended in Task 1.


Download a fresh copy of the application source to build the Docker image from, using the same public archive as before:
wget https://aws-tc-largeobjects.s3.us-west-2.amazonaws.com/CUR-TF-200-ACCDEV-2-91558/06-lab-containers/code.zip
unzip code.zip
mkdir -p ~/containers/node_app
mv resources/codebase_partner ~/containers/node_app/



[note]DockerHost is your stand-in for the hosted VS Code IDE — a plain EC2 instance with Docker, Git, and the AWS CLI, reachable over SSH or EC2 Instance Connect. Every remaining Docker command in this lab runs here.[/note]



[/collapsible-section]

[collapsible-section]
## Task 4: Analyzing the Existing Application Infrastructure


In a browser, open http://&lt;AppServerNode-public-ip&gt; and choose List of suppliers to confirm the record you seeded in Task 2 is visible.
Test full CRUD: choose Add a new supplier, fill in the fields, submit, then edit and save a change (for example, modify the phone number) to confirm writes are working against the live database.
On DockerHost, open ~/containers/node_app/codebase_partner/app/config/config.js. The top of the file contains:
let config = {
  APP_DB_HOST: "3.82.161.206",
  APP_DB_USER: "nodeapp",
  APP_DB_PASSWORD: "coffee",
  APP_DB_NAME: "COFFEE"
}
followed by logic that overrides each key with an environment variable of the same name, if one is set:
Object.keys(config).forEach(key = {
  if (process.env[key] === undefined) {
    console.log(`[NOTICE] Value for key '${key}' not found in ENV, using default value.`)
  } else {
    config[key] = process.env[key]
  }
});
==This fallback pattern is exactly why AppServerNode needed an explicit `APP_DB_HOST` environment variable in Task 2 — without one, it silently falls back to whatever placeholder IP is hardcoded in the file, which almost certainly isn't your MysqlServerNode.== You'll rely on this same behavior to configure the containerized version in Task 5.

Note the app's key facts for later: it's an Express app, written in Node.js, and — as configured in Task 2 — it currently runs on port 80 when installed directly on a guest OS.




[/collapsible-section]

[collapsible-section]
## Task 5: Migrating the Application to a Docker Container


On DockerHost, move into the application directory:
cd ~/containers/node_app/codebase_partner

Create a Dockerfile:
FROM node:11-alpine
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "start"]
==`FROM` sets the base image, `WORKDIR` sets the in-container working directory, `COPY` brings in your source code, `RUN` executes a build-time command, `EXPOSE` documents the container's listening port, and `CMD` is the command that runs when the container starts.==

Build the image:
docker build --tag node_app .
Verify it exists with docker images.

Run a container from the image:
docker run -d --name node_app_1 -p 3000:3000 node_app
==The `-d` flag runs the container in the background (detached mode); `-p 3000:3000` publishes container port 3000 to the same port on the host.== Confirm it's serving traffic with curl http://localhost:3000.

Browse to http://&lt;DockerHost-public-ip&gt;:3000 (port 3000 is already open in `docker-lab-sg` from Task 1) to confirm the containerized app loads.
Choose List of suppliers in the containerized app — it fails, for the same reason AppServerNode failed in Task 2 before you set `APP_DB_HOST`: this container was launched with no environment variables at all, so it falls back to the hardcoded placeholder IP in `config.js`.
Stop and remove the broken container, then relaunch it with the correct database host passed in as an environment variable — this time pointing at MysqlServerNode's private IP, not AppServerNode's:
docker stop node_app_1 && docker rm node_app_1
docker run -d --name node_app_1 -p 3000:3000 -e APP_DB_HOST="&lt;MysqlServerNode-private-ip&gt;" node_app
[important]This is the core lesson of the lab: never bake environment-specific values (IPs, hostnames, credentials) into an image. Pass them at runtime with `-e` so the same image works in every environment.[/important]
Refresh the app and confirm List of suppliers now works, reading live from MysqlServerNode's database.

screenshot: screenshot-containerized-app-working.png | Browser showing http://<DockerHost-public-ip:3000/suppliers with the seeded supplier record loaded from the containerized app
[screenshot-guide]
file: screenshot-containerized-app-working.png
task: Task 5: Migrating the Application to a Docker Container
step: Reload the containerized app and open List of suppliers after relaunching with APP_DB_HOST set
show: The Suppliers page loading the seeded record, proving the container is now reaching MysqlServerNode over the VPC
[/screenshot-guide]





[/collapsible-section]

[collapsible-section]
## Task 6: Migrating the MySQL Database to a Docker Container


Dump the current database contents from MysqlServerNode, run from DockerHost:
mysqldump -P 3306 -h &lt;MysqlServerNode-private-ip&gt; -u nodeapp -p --databases COFFEE  ~/containers/my_sql.sql
Enter the password coffee when prompted. Open my_sql.sql and make a small edit to the INSERT INTO line (for example, change a street name) — this becomes your marker for confirming, later, that the app is really talking to the new containerized database and not the original one on MysqlServerNode.
Create a Dockerfile for the database in a new containers/mysql directory:
mkdir -p ~/containers/mysql && cd ~/containers/mysql
mv ~/containers/my_sql.sql .
FROM mysql:8.0.23
COPY ./my_sql.sql /
EXPOSE 3306

Free up disk space, then build the image:
docker rmi -f $(docker image ls -a -q) 2/dev/null
docker image prune -f && docker container prune -f
docker build --tag mysql_server .
[note]The first command intentionally removes every local image, including `node_app` — that's fine, you already pushed nothing yet and can rebuild it from the Dockerfile in Task 5 if you ever need to. It exists here purely to mirror the original lab's disk-space step; skip it if disk space isn't a concern on your instance size.[/note]

Run a container from the new MySQL image:
docker run --name mysql_1 -p 3306:3306 -e MYSQL_ROOT_PASSWORD=rootpw -d mysql_server

Load the dumped data and create an app-facing database user:
sed -i '1d' my_sql.sql
docker exec -i mysql_1 mysql -u root -prootpw < my_sql.sql
docker exec -i mysql_1 mysql -u root -prootpw -e "CREATE USER 'nodeapp' IDENTIFIED WITH mysql_native_password BY 'coffee'; GRANT all privileges on *.* to 'nodeapp'@'%';"





[/collapsible-section]

[collapsible-section]
## Task 7: Testing the MySQL Container with the Node Application


Stop and remove the app container so it can be relaunched pointing at the new database container:
docker stop node_app_1 && docker rm node_app_1

Find the MySQL container's internal Docker network IP address:
docker inspect mysql_1
Look for the IPAddress field under NetworkSettings (or the bridge network entry).

Launch the app container again, this time pointing APP_DB_HOST at the MySQL container's internal IP instead of any EC2 instance's IP:
docker run -d --name node_app_1 -p 3000:3000 -e APP_DB_HOST=&lt;mysql-container-ip&gt; node_app
[image:aws-docker-migration-lab8-1-container-network.png|Both containers running on the Docker bridge network, node_app reaching mysql via its internal container IP instead of any EC2 instance]

Reload the app and choose List of suppliers. Seeing your edited street name confirms `node_app_1` is now reading from `mysql_1`, not from the original `MysqlServerNode` EC2 instance.

screenshot: screenshot-app-connected-to-container-db.png | The Suppliers page displaying the record with the edited street name confirming the containerized database is now the data source
[screenshot-guide]
file: screenshot-app-connected-to-container-db.png
task: Task 7: Testing the MySQL Container with the Node Application
step: Reload the running application and open List of suppliers
show: The supplier record with the modified street name, proving the source is the mysql_1 container
[/screenshot-guide]



[note]Leave both containers running for now — you'll use them again in several of the Extended Tasks below before moving on to Cleanup.[/note]



[/collapsible-section]

[collapsible-section]
## Task 8: Adding the Docker Images to Amazon ECR


Look up your AWS account ID from the console user-name menu, then authenticate the Docker client to Amazon ECR:
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin &lt;account-id&gt;.dkr.ecr.us-east-1.amazonaws.com
==This succeeds with no stored credentials on DockerHost at all — `aws ecr get-login-password` is served by the temporary credentials from the `docker-lab-ecr-role` instance profile you attached in Task 3.==

[warning]Creating an Amazon ECR repository and pushing images to it is Free Tier eligible up to 500 MB-month of storage per repository; storage beyond that (and any pull data-transfer out of AWS) is billable in your account. This lab's images comfortably fit inside the free allowance, but remember Cleanup below if you don't intend to keep them.[/warning]
Create the repository:
aws ecr create-repository --repository-name node-app

Tag the image with your registry ID so it points at your new repository:
docker tag node_app:latest &lt;registry-id&gt;.dkr.ecr.us-east-1.amazonaws.com/node-app:latest
Confirm with docker images.

Push the image to Amazon ECR:
docker push &lt;registry-id&gt;.dkr.ecr.us-east-1.amazonaws.com/node-app:latest

Confirm the image landed in the repository:
aws ecr list-images --repository-name node-app

screenshot: screenshot-ecr-repository-image.png | Amazon ECR console showing the node-app repository with the pushed "latest" image tag and its digest
[screenshot-guide]
file: screenshot-ecr-repository-image.png
task: Task 8: Adding the Docker Images to Amazon ECR
step: Open the Amazon ECR console and view the node-app repository's Images tab
show: The image row with tag "latest", its digest, and the pushed-at timestamp
[/screenshot-guide]



[image:aws-docker-migration-lab8-1-ecr-push-flow.png|docker login → docker tag → docker push flow, ending with the tagged image stored in the Amazon ECR repository]



[/collapsible-section]

[collapsible-section]
## Extended Task: Inspect the Docker Image

[note]The Extended Tasks below are independent of each other — do as many or as few as you'd like, in any order, using the containers and image you already built. None of them require new AWS resources.[/note]


Run docker history node_app and identify which instruction produced the largest layer.
Why does Docker cache layers between builds, and which instruction in the node_app Dockerfile is most likely to invalidate that cache on every rebuild?




[/collapsible-section]

[collapsible-section]
## Extended Task: Analyze Running Containers


Run docker inspect node_app_1 and docker inspect mysql_1.
For each container, find its internal IP address, its environment variables, its mounted volumes (if any), and its exposed ports.
Explain in your own words what each of those sections tells you about how the container is configured.




[/collapsible-section]

[collapsible-section]
## Extended Task: View and Interpret Logs


Run docker logs node_app_1 and docker logs mysql_1.
What does each log show at startup? Are there any warnings?
How would these logs help you troubleshoot a production incident where the app is returning errors?




[/collapsible-section]

[collapsible-section]
## Extended Task: Simulate an Application Failure


Stop the MySQL container: docker stop mysql_1.
Try accessing the app's List of suppliers page and record the exact error shown.
Restart MySQL: docker start mysql_1, then verify the app recovers.
Reflect: what does this failure mode tell you about the dependency between the two containers, and how might you make the app fail more gracefully?




[/collapsible-section]

[collapsible-section]
## Extended Task: Compare Docker Base Images


Pull three variants of the Node base image: docker pull node:11-alpine, docker pull node:20-alpine, docker pull node:20.
Run docker images and compare their sizes.
Which would you choose for this app going forward, and why? What risk would you want to test for before switching `node_app`'s Dockerfile from `node:11-alpine` to a newer tag?




[/collapsible-section]

[collapsible-section]
## Extended Task: Container Networking Investigation


Run docker network ls and docker network inspect bridge.
Which network are `node_app_1` and `mysql_1` using?
Why do containers on this network receive private IP addresses instead of being directly reachable from outside the host?
How does this compare to the `docker-lab-sg` security group you configured in Task 1, which controls traffic at the EC2 instance level rather than the container level?




[/collapsible-section]

[collapsible-section]
## Extended Task: Security Review

Working entirely in your own account raises the stakes on this review — these are resources you're responsible for keeping secure.


Identify every place in this lab where a credential was passed in plain text on the command line or stored in a plain-text file (`config.js`, `docker run -e`, the systemd unit, the `mysqldump`/`mysql` commands).
Identify every port opened in `docker-lab-sg` and whether it's scoped as tightly as it could be.
Propose, without implementing it, how you would replace the hardcoded `coffee` password with a secret retrieved at runtime from AWS Secrets Manager.
The `coffee-app.service` systemd unit on AppServerNode runs the app as `root` so it can bind port 80. What's the containerized version's equivalent risk, if any — and why does `EXPOSE 3000` inside a container change that calculus?




[/collapsible-section]

[collapsible-section]
## Extended Task: Amazon ECR Digest Investigation


Run aws ecr describe-images --repository-name node-app and locate the `imageDigest` field.
What is an image digest, and why is it immutable in a way a tag like `latest` isn't?
How many image layers were uploaded when you pushed `node_app`?
If you rebuilt and re-pushed `node_app:latest` right now with no code changes, would the digest change? Why or why not?




[/collapsible-section]

[collapsible-section]
## Extended Task: Challenge Task — No Step-by-Step Instructions

Only the objective is given below. Work out the steps yourself using what you've already done in this lab.

 Deploy a second Node.js container on DockerHost, on a different host port (3001), using the same `node_app` image, ensuring it connects to the same `mysql_1` container as `node_app_1`.

You'll need to figure out: a unique container name, the correct `-p` mapping, the correct `-e APP_DB_HOST` value, and how to verify both containers are independently reachable and both reading the same data.



[/collapsible-section]

[collapsible-section]
## Cleanup

[warning]Every resource in this lab is running in your own AWS account and is billing in real time. Complete every step below even if you plan to keep experimenting later — you can always relaunch from these notes.[/warning]


On DockerHost, stop and remove both running containers and any extras from the Extended Tasks:
docker stop node_app_1 mysql_1
docker rm node_app_1 mysql_1

Remove local Docker images:
docker rmi node_app mysql_server &lt;registry-id&gt;.dkr.ecr.us-east-1.amazonaws.com/node-app:latest 2/dev/null

Delete the Amazon ECR repository and every image inside it:
aws ecr delete-repository --repository-name node-app --force

In the EC2 console, select all three instances (DockerHost, AppServerNode, MysqlServerNode) and choose Instance state → Terminate instance.
Once all three instances show Terminated, delete the security group: EC2 console → Security Groups → select docker-lab-sg → Delete.
Delete the key pair: EC2 console → Key Pairs → select docker-lab-key → Delete. Also delete the local `.pem` file from your machine.
In the IAM console, delete the role docker-lab-ecr-role (this also removes its instance profile).
If you created docker-lab-admin only for this lab, either delete the IAM user or, at minimum, deactivate any access keys and remove console access to avoid leaving standing credentials in your account.
Double-check the EC2 console's Instances list shows nothing running, and the ECR console shows no repositories, before you close this lab out.




[/collapsible-section]

[collapsible-section]
## Overall Summary

[takeaways]
- A Docker image is a read-only template built from a Dockerfile; a container is a running instance of that image
- Containers share the host OS kernel, which is why they start in seconds and are far smaller than virtual machines
- Provisioning your own IAM user, key pair, security group, and IAM role is the same groundwork any real AWS project needs before infrastructure work can even begin
- An EC2 instance profile lets a container host authenticate to Amazon ECR with temporary, auto-rotated credentials instead of long-lived access keys
- `docker build` reads a Dockerfile and produces an image; `docker run` launches a container from that image
- Never hardcode environment-specific values like database hosts into an image — pass them at runtime with `-e` environment variables
- `docker exec` and `docker inspect` let you look inside a running container's process and configuration state
- Migrating a database to a container means dumping the data (`mysqldump`), baking it into a new image, and seeding a fresh container-based MySQL instance
- Two containers on the same Docker bridge network can reach each other using their internal container IP addresses
- An image tag (like `latest`) can move between images; an image digest is an immutable fingerprint of the exact image content
- Cleanup is not optional in a personal AWS account — every EC2 instance, security group, and stored image keeps costing you (or keeps existing as a security surface) until you explicitly remove it
[/takeaways]



[/collapsible-section]

[collapsible-section]
## Glossary

[glossary]
t: Docker
d: A platform for packaging an application and everything it needs into a portable, runnable unit
e: e.g. Docker lets the same coffee-supplier app run identically on DockerHost, a laptop, or a teammate's machine
[/glossary]

[glossary]
t: Docker Image
d: A read-only template, built from a Dockerfile, that contains an application's code, runtime, and dependencies
e: e.g. the node_app image built with `docker build --tag node_app .`
[/glossary]

[glossary]
t: Docker Container
d: A running instance of a Docker image
e: e.g. `node_app_1`, created by running `docker run` against the node_app image
[/glossary]

[glossary]
t: Dockerfile
d: A text file containing step-by-step instructions Docker uses to build an image
e: e.g. a Dockerfile that starts `FROM node:11-alpine` and ends with `CMD ["npm", "run", "start"]`
[/glossary]

[glossary]
t: Docker Engine
d: The background service that builds images and runs, stops, and manages containers on a host machine
e: e.g. the Docker Engine installed on DockerHost in Task 3
[/glossary]

[glossary]
t: Base Image
d: The starting image a Dockerfile builds on top of, declared with the FROM instruction
e: e.g. `node:11-alpine` is the base image for the node_app Dockerfile
[/glossary]

[glossary]
t: Alpine Linux
d: A minimal Linux distribution commonly used as a Docker base image because of its small size
e: e.g. `node:11-alpine` is far smaller than a full `node:11` image
[/glossary]

[glossary]
t: Image Layer
d: One cached filesystem change produced by a single Dockerfile instruction, stacked to form the final image
e: e.g. each of RUN, COPY, and EXPOSE in a Dockerfile creates its own layer
[/glossary]

[glossary]
t: Image Tag
d: A human-readable label attached to a specific version of an image, such as latest or v1
e: e.g. `docker tag node_app:latest node_app:production`
[/glossary]

[glossary]
t: Image Digest
d: An immutable, content-based fingerprint (SHA-256 hash) that uniquely identifies an exact image, unlike a tag which can be reassigned
e: e.g. the digest returned by `aws ecr describe-images` after pushing to Amazon ECR
[/glossary]

[glossary]
t: Amazon ECR (Elastic Container Registry)
d: A managed AWS service for storing, managing, and sharing Docker container images
e: e.g. the node-app repository created in Task 8 of this lab
[/glossary]

[glossary]
t: ECR Repository
d: A named collection inside Amazon ECR that stores one or more versions (tags) of a Docker image
e: e.g. the `node-app` repository created with `aws ecr create-repository`
[/glossary]

[glossary]
t: Container Registry
d: A service that stores and distributes Docker images, whether public (Docker Hub) or private (Amazon ECR)
e: e.g. Docker pulls the `node:11-alpine` base image from Docker Hub, a public container registry
[/glossary]

[glossary]
t: docker build
d: The command that reads a Dockerfile and produces a Docker image
e: e.g. `docker build --tag node_app .`
[/glossary]

[glossary]
t: docker run
d: The command that creates and starts a container from a Docker image
e: e.g. `docker run -d --name node_app_1 -p 3000:3000 node_app`
[/glossary]

[glossary]
t: docker exec
d: A command that runs a new process, such as a shell, inside an already-running container
e: e.g. `docker exec -i mysql_1 mysql -u root -prootpw`
[/glossary]

[glossary]
t: docker ps
d: A command that lists currently running containers (docker container ls is the newer equivalent)
e: e.g. running `docker ps` to find the container ID of mysql_1
[/glossary]

[glossary]
t: docker inspect
d: A command that returns detailed JSON configuration and runtime information about an image or container
e: e.g. `docker inspect mysql_1` to find its internal IP address
[/glossary]

[glossary]
t: docker logs
d: A command that prints the standard output/error logs generated by a container
e: e.g. `docker logs node_app_1` to check for startup errors
[/glossary]

[glossary]
t: docker tag
d: A command that assigns a new name/tag to an existing local image, without duplicating its layers
e: e.g. `docker tag node_app:latest <registry-id.dkr.ecr.us-east-1.amazonaws.com/node-app:latest`
[/glossary]

[glossary]
t: docker push
d: A command that uploads a tagged local image to a remote container registry
e: e.g. `docker push <registry-id.dkr.ecr.us-east-1.amazonaws.com/node-app:latest`
[/glossary]

[glossary]
t: Detached Mode (-d)
d: A docker run flag that starts a container in the background instead of attaching your terminal to it
e: e.g. `docker run -d --name node_app_1 ...`
[/glossary]

[glossary]
t: Port Mapping (-p)
d: A docker run flag that connects a port on the host machine to a port inside the container
e: e.g. `-p 3000:3000` maps host port 3000 to container port 3000
[/glossary]

[glossary]
t: EXPOSE Instruction
d: A Dockerfile instruction that documents which port the container listens on (does not itself publish the port)
e: e.g. `EXPOSE 3000` in the node_app Dockerfile
[/glossary]

[glossary]
t: WORKDIR Instruction
d: A Dockerfile instruction that sets the working directory inside the image for subsequent instructions
e: e.g. `WORKDIR /usr/src/app`
[/glossary]

[glossary]
t: Environment Variable (-e)
d: A key-value setting passed into a container at runtime, often used to configure behavior without changing the image
e: e.g. `-e APP_DB_HOST="<ip-address"` telling the app where to find its database
[/glossary]

[glossary]
t: Bridge Network
d: Docker's default private network that lets containers on the same host communicate using internal IP addresses
e: e.g. node_app_1 and mysql_1 communicating over the default bridge network in Task 7
[/glossary]

[glossary]
t: mysqldump
d: A MySQL/MariaDB command-line utility that exports a database's schema and data into a portable SQL file
e: e.g. `mysqldump -P 3306 -h <ip -u nodeapp -p --databases COFFEE  my_sql.sql`
[/glossary]

[glossary]
t: Amazon EC2
d: AWS's virtual server (compute instance) service, used in this lab to host the app, the database, and the container host
e: e.g. the AppServerNode, MysqlServerNode, and DockerHost instances you launch yourself
[/glossary]

[glossary]
t: IAM User
d: An identity in AWS Identity and Access Management representing a person or workload, with its own console password and/or access keys
e: e.g. the docker-lab-admin user you created in Task 1 to avoid working as the root user
[/glossary]

[glossary]
t: IAM Role
d: An AWS identity with permissions that can be assumed temporarily by a service, application, or user, instead of using long-lived credentials
e: e.g. docker-lab-ecr-role, assumed automatically by DockerHost to authenticate to Amazon ECR
[/glossary]

[glossary]
t: Instance Profile
d: A container for an IAM role that lets an EC2 instance assume that role automatically at launch
e: e.g. the instance profile attached to DockerHost in Task 3, generated automatically when you created docker-lab-ecr-role
[/glossary]

[glossary]
t: Security Group
d: A virtual, stateful firewall attached to EC2 instances that controls inbound and outbound traffic by rule
e: e.g. docker-lab-sg, allowing SSH, port 80, port 3000, and self-referencing port 3306 traffic
[/glossary]

[glossary]
t: Key Pair (EC2)
d: A public/private key combination used to securely authenticate SSH connections to an EC2 instance, without a password
e: e.g. docker-lab-key.pem, used to SSH into all three EC2 instances in this lab
[/glossary]

[glossary]
t: EC2 Instance Connect
d: A browser-based SSH connection method built into the EC2 console, usable without a downloaded key pair
e: e.g. connecting to MysqlServerNode from the EC2 console instead of a local terminal
[/glossary]

[glossary]
t: AWS Free Tier
d: A set of usage allowances (like 750 EC2 instance-hours/month) available at no cost, typically for a new AWS account's first 12 months
e: e.g. three t3.micro instances running for this lab's duration typically stay within Free Tier limits
[/glossary]

[glossary]
t: aws sts get-caller-identity
d: An AWS CLI command that returns the identity (user, role, or account) currently being used to make API calls
e: e.g. run on DockerHost in Task 3 to confirm it's authenticating as docker-lab-ecr-role, not a stored access key
[/glossary]



[/collapsible-section]

[collapsible-section]
## Interview Questions

[interview]
q: What is Docker, in one sentence?
a: Docker is a platform for packaging an application with everything it needs to run into a portable container that behaves the same on any machine with the Docker engine installed.
d: easy
cat: complexity
[/interview]

[interview]
q: What's the difference between a Docker image and a Docker container?
a: An image is the read-only, built template; a container is a running instance of that image. You can start many containers from one image.
d: easy
cat: complexity
[/interview]

[interview]
q: Why are Docker containers faster to start than virtual machines?
a: Containers share the host's OS kernel instead of booting a full guest operating system, so there's far less to initialize — usually seconds instead of minutes.
d: easy
cat: complexity
[/interview]

[interview]
q: What does the FROM instruction in a Dockerfile do?
a: It sets the base image the new image is built on top of, such as node:11-alpine, which supplies the OS layer and runtime the rest of the Dockerfile builds on.
d: easy
cat: implementation
[/interview]

[interview]
q: What's the purpose of the EXPOSE instruction, and does it actually open a port?
a: EXPOSE documents which port the containerized app listens on; it doesn't publish that port to the host by itself — you still need the -p flag on docker run to map it.
d: easy
cat: implementation
[/interview]

[interview]
q: What does the -d flag do on docker run?
a: It runs the container in detached mode, meaning it runs in the background and returns your terminal immediately instead of attaching to the container's output.
d: easy
cat: implementation
[/interview]

[interview]
q: What does docker ps show you?
a: A list of currently running containers, including their container ID, image, status, and published ports.
d: easy
cat: implementation
[/interview]

[interview]
q: How do you check the logs of a running container?
a: docker logs <container-name-or-id prints the container's standard output and error streams, which is usually the first place to look when a container isn't behaving.
d: easy
cat: implementation
[/interview]

[interview]
q: What is Amazon ECR?
a: Amazon Elastic Container Registry is AWS's managed service for storing and distributing private Docker images, similar in role to Docker Hub but integrated with IAM and other AWS services.
d: easy
cat: complexity
[/interview]

[interview]
q: What's the difference between docker stop and docker rm?
a: docker stop gracefully stops a running container but leaves it on disk; docker rm deletes the container entirely. You typically stop before you remove.
d: easy
cat: implementation
[/interview]

[interview]
q: Why did the containerized Node app fail to connect to the database the first time it was run in this lab?
a: The container was started without the APP_DB_HOST environment variable, so the app fell back to a hardcoded IP address baked into the source code that didn't match the actual MySQL host.
d: easy
cat: application
[/interview]

[interview]
q: What command do you use to open a shell inside a running container?
a: docker exec -ti <container-id sh opens an interactive shell session inside the container so you can inspect files, processes, or environment variables directly.
d: easy
cat: implementation
[/interview]

[interview]
q: Why did this lab attach an IAM role to the EC2 instance instead of running aws configure with an access key?
a: An attached IAM role gives the instance temporary, automatically-rotated credentials with no secret stored on disk, which is safer than a long-lived access key that could be copied, leaked, or forgotten in a config file.
d: easy
cat: complexity
[/interview]

[interview]
q: What's the purpose of a security group in this lab?
a: It's a stateful virtual firewall controlling which inbound traffic — SSH, HTTP on port 80, the app on port 3000, and MySQL on port 3306 — is allowed to reach each EC2 instance, and from where.
d: easy
cat: complexity
[/interview]

[interview]
q: A teammate says "our app works locally but breaks in the container — the database connection just times out." Walk through how you'd debug it.
a: (Situation) The containerized app can't reach the database that works fine outside the container. (Task) Find why the network path is broken. (Action) I'd check docker inspect on both containers for their network and IP, confirm the app was launched with the correct APP_DB_HOST value via -e, run docker logs to see the exact connection error, and confirm both containers are on the same Docker network. (Result) In almost every case like this the fix is either a missing/incorrect environment variable or the two containers being on different networks.
d: medium
cat: application
[/interview]

[interview]
q: Why did this lab pass the database host as an environment variable instead of hardcoding it into the Dockerfile?
a: Hardcoding a specific IP into the image would tie that image to one environment — the same image needs to work with a different database host in dev, staging, and production, so the value belongs in the container's runtime configuration, not baked into the build.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: What happens to data written to a MySQL container if that container is deleted, and how would you prevent losing it?
a: Data written after the image was built lives only in the container's writable layer and is lost when the container is removed unless a Docker volume or bind mount is attached to persist it outside the container's lifecycle.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: Explain the difference between an image tag and an image digest.
a: A tag like "latest" is a mutable, human-friendly pointer that can be reassigned to a different image at any time; a digest is an immutable SHA-256 hash of the exact image content, so it always identifies one specific build.
d: medium
cat: complexity
[/interview]

[interview]
q: Why do you need to authenticate Docker to Amazon ECR before pushing an image, and how is that authentication typically done?
a: ECR repositories are private by default and protected by IAM, so the Docker client needs short-lived credentials; you get an authorization token with aws ecr get-login-password and pipe it into docker login so subsequent push/pull commands are authorized.
d: medium
cat: implementation
[/interview]

[interview]
q: A client's application container works fine when tested alone but can't reach the database container after both are restarted. What's the most likely cause and how would you confirm it?
a: (Situation) Both containers restarted and connectivity broke. (Task) Determine why. (Action) Container internal IP addresses on the default bridge network aren't guaranteed to stay the same across restarts, so I'd run docker inspect on the database container to get its current IP and compare it against what the app container was launched with. (Result) If the IPs differ, that's the cause — the fix is either relaunching the app container with the new IP or, better, using a user-defined Docker network with DNS-based container name resolution so IPs don't need to be tracked manually.
d: medium
cat: application
[/interview]

[interview]
q: Why did this lab use a security group with a self-referencing rule for port 3306 instead of opening it to "My IP" like the other ports?
a: Port 3306 only needs to be reachable from other instances doing legitimate database work — the app and container host — not from your personal laptop directly, so scoping the source to the security group itself keeps the database off the public internet while still letting the lab's own instances talk to it.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: Why is it good practice to run docker image prune periodically?
a: Every build and rebuild can leave behind unused intermediate images and layers, which quietly consume disk space; prune removes the ones no longer referenced by any container.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: Why would you choose a smaller base image like node:11-alpine over the full node:11 image?
a: Smaller base images mean smaller image sizes, faster builds and pulls, and a reduced attack surface since fewer packages are present — the trade-off is that Alpine's minimal package set can occasionally miss a library a dependency expects.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: How does port mapping differ from the EXPOSE instruction, conceptually?
a: EXPOSE is documentation baked into the image about which port the app listens on internally; port mapping via -p is a runtime decision about whether and how that internal port is made reachable from the host machine.
d: medium
cat: complexity
[/interview]

[interview]
q: This lab manually dumped and reloaded a MySQL database into a container. Why might a production team avoid running their production database itself inside a container?
a: Databases need durable, high-performance persistent storage and careful backup/failover handling; teams commonly prefer a managed service like Amazon RDS for the database tier and reserve containers for stateless application logic that's easy to scale and replace.
d: hard
cat: tradeoffs
[/interview]

[interview]
q: If you needed to run two instances of the node_app container simultaneously on the same host, what would you need to change from this lab's setup?
a: Each container needs a unique name and a unique host port to map to (since two containers can't both bind host port 3000), and both should be pointed at the same APP_DB_HOST so they share the same backend data.
d: hard
cat: application
[/interview]

[interview]
q: What are the architectural trade-offs of migrating this lab's setup from standalone containers to Amazon ECS in production?
a: ECS adds orchestration — automatic restarts, scaling based on load, rolling deployments, and integration with a load balancer — at the cost of more moving pieces to configure (task definitions, services, IAM roles, networking) compared to a single docker run command; it's the right trade for anything beyond a single fixed host.
d: hard
cat: tradeoffs
[/interview]

[interview]
q: Why does an image digest matter more than a tag when you need reproducible deployments?
a: Because "latest" can silently point to a different build tomorrow than it does today, pinning a deployment to a specific digest guarantees you're always running the exact bytes that were tested, which matters for auditability and rollback.
d: hard
cat: tradeoffs
[/interview]

[interview]
q: This lab attached AdministratorAccess to a lab-only IAM user for convenience. What would a least-privilege version of this lab's IAM permissions actually need to contain?
a: Scoped EC2 permissions to launch/terminate specific instance types and manage the lab's security group and key pair, IAM permissions limited to creating and passing the one ECR role, and ECR permissions limited to repository creation and image push/pull — deliberately excluding broad access to unrelated services the lab never touches.
d: hard
cat: tradeoffs
[/interview]



[/collapsible-section]

[collapsible-section]
## Multiple Choice Questions

[mcq]
q: What is a Docker image?
o: A running instance of an application | A read-only template used to create containers | A virtual machine snapshot | A network configuration file
c: 1
e: A Docker image is the read-only, built template — created from a Dockerfile — that a container is launched from.
w: A running instance is a container, not an image. Docker images are not VM snapshots. Networking is configured separately from the image itself.
d: beginner
[/mcq]

[mcq]
q: Which Dockerfile instruction sets the base image for a new image?
o: RUN | COPY | FROM | CMD
c: 2
e: FROM declares the starting image (e.g. node:11-alpine) that the rest of the Dockerfile builds on top of.
w: RUN executes build-time commands. COPY brings files into the image. CMD sets the container's startup command.
d: beginner
[/mcq]

[mcq]
q: What does the -d flag do when used with docker run?
o: Deletes the container after it exits | Runs the container in detached (background) mode | Downloads the image before running | Disables networking for the container
c: 1
e: -d launches the container in the background, immediately returning control of the terminal.
w: There is no automatic delete behavior tied to -d. Downloading happens automatically if the image isn't local, regardless of -d. Networking is unaffected by -d.
d: beginner
[/mcq]

[mcq]
q: In this lab, which command builds a Docker image from a Dockerfile named node_app?
o: docker run --tag node_app . | docker build --tag node_app . | docker create node_app . | docker push node_app .
c: 1
e: docker build reads the Dockerfile in the specified directory (here, the current directory) and produces an image tagged node_app.
w: docker run starts a container, it doesn't build an image. docker create makes a container without starting it. docker push uploads an already-built image to a registry.
d: beginner
[/mcq]

[mcq]
q: What is the purpose of the -p 3000:3000 flag on docker run?
o: It sets the container's process priority | It maps host port 3000 to container port 3000 | It limits the container to 3000 MB of memory | It sets a 3000-second timeout
c: 1
e: The -p flag publishes a container port to a port on the host machine, in the format host:container.
w: Process priority isn't controlled by -p. Memory limits use a different flag (--memory). Timeouts aren't configured with -p.
d: beginner
[/mcq]

[mcq]
q: Which command lists currently running Docker containers?
o: docker images | docker ps | docker build | docker network ls
c: 1
e: docker ps (or the newer docker container ls) lists running containers along with their ID, image, and status.
w: docker images lists images, not containers. docker build creates images. docker network ls lists networks, not containers.
d: beginner
[/mcq]

[mcq]
q: What command uploads a locally tagged image to Amazon ECR?
o: docker upload | docker save | docker push | docker export
c: 2
e: docker push uploads a tagged local image to whatever registry the tag points at, such as an ECR repository URI.
w: There is no docker upload command. docker save writes an image to a local tar archive, it doesn't upload anywhere. docker export produces a filesystem archive of a container, not an image push.
d: beginner
[/mcq]

[mcq]
q: In this lab, why did the containerized Node app initially fail to load the suppliers list?
o: The Dockerfile was missing the EXPOSE instruction | The container was launched without the correct APP_DB_HOST environment variable | The MySQL container wasn't built yet | The security group blocked port 80
c: 1
e: The app fell back to a hardcoded database IP because no APP_DB_HOST environment variable was passed to docker run, so it never reached the real MySQL host.
w: EXPOSE was present in the Dockerfile. The MySQL migration happens in a later task and isn't the cause of this specific failure. The failure was a database connection error, not a blocked port.
d: beginner
[/mcq]

[mcq]
q: What does docker exec -ti <container-id sh do?
o: Deletes the container | Opens an interactive shell session inside the running container | Stops the container | Rebuilds the container's image
c: 1
e: docker exec runs a new process — here, an interactive shell — inside an already-running container, letting you inspect it from the inside.
w: This command doesn't delete, stop, or rebuild anything; it only opens a shell session inside the running container.
d: beginner
[/mcq]

[mcq]
q: What is Amazon ECR primarily used for?
o: Running EC2 instances | Storing and distributing Docker container images | Hosting relational databases | Managing IAM policies
c: 1
e: Amazon ECR is a managed container registry for storing, versioning, and distributing private Docker images.
w: EC2 hosting, database hosting, and IAM policy management are all separate AWS services unrelated to ECR's core purpose.
d: beginner
[/mcq]

[mcq]
q: Which command creates a new Amazon ECR repository from the AWS CLI?
o: aws ecr create-repository --repository-name node-app | aws ecr new-repository --name node-app | aws ecr init --repository node-app | aws ecr add-repo --repository-name node-app
c: 0
e: aws ecr create-repository --repository-name node-app is the correct AWS CLI command to create a new ECR repository.
w: new-repository, init, and add-repo are not valid ECR CLI subcommands.
d: beginner
[/mcq]

[mcq]
q: What must you do before you can docker push an image to Amazon ECR?
o: Nothing — push works with no setup | Authenticate the Docker client to ECR with docker login | Manually create the image in the ECR console first | Enable public access on the repository
c: 1
e: You must authenticate with docker login using a token from aws ecr get-login-password before ECR will accept a push.
w: Push always requires authentication. Images are created locally with docker build, not manually in the console. ECR repositories default to private and don't need to be public to push.
d: beginner
[/mcq]

[mcq]
q: What does the COPY . . instruction do in the node_app Dockerfile?
o: Copies the Dockerfile itself into the image | Copies the contents of the build context into the image's working directory | Copies environment variables into the container | Duplicates the base image layer
c: 1
e: COPY . . copies everything in the current build context (the app source directory) into the image's current WORKDIR.
w: COPY doesn't specifically target the Dockerfile, environment variables, or duplicate base layers — it copies files from the build context.
d: beginner
[/mcq]

[mcq]
q: Why does node_app use node:11-alpine instead of a larger base image?
o: Alpine images support more npm packages | Alpine images are much smaller, reducing image size and attack surface | Alpine is required for Express apps | Larger images can't be pushed to ECR
c: 1
e: Alpine-based images are stripped down to a minimal footprint, which keeps build and pull times fast and reduces the number of packages that could contain vulnerabilities.
w: Alpine has no special npm compatibility advantage, Express has no Alpine requirement, and image size doesn't affect whether an image can be pushed to ECR.
d: beginner
[/mcq]

[mcq]
q: What happens if you run docker stop node_app_1 && docker rm node_app_1?
o: The image node_app is deleted | The running container is stopped and then permanently removed | The container is only paused | The ECR repository is deleted
c: 1
e: docker stop halts the container process, and docker rm deletes the stopped container object entirely; the underlying image is untouched.
w: The image itself is not deleted by this command. This does more than pause — the container is removed. ECR is unaffected by local docker commands.
d: beginner
[/mcq]

[mcq]
q: Which command shows a container's internal Docker network IP address?
o: docker logs | docker inspect | docker history | docker tag
c: 1
e: docker inspect returns detailed JSON about a container, including its NetworkSettings block with its internal IP address.
w: docker logs shows output logs, docker history shows image build layers, and docker tag renames/retags an image — none report the container's IP.
d: beginner
[/mcq]

[mcq]
q: What does the mysqldump utility do?
o: Restarts a MySQL server | Exports a database's schema and data to a portable SQL file | Deletes a MySQL database | Installs MySQL on a new host
c: 1
e: mysqldump exports the contents of a database into a .sql file that can later be used to seed another MySQL instance.
w: mysqldump doesn't restart, delete, or install MySQL — it only exports data.
d: beginner
[/mcq]

[mcq]
q: In the mysql_server Dockerfile, what does COPY ./my_sql.sql / accomplish?
o: It runs the SQL file immediately during the build | It copies the SQL dump file into the image so it's available when the container starts | It uploads the file to Amazon ECR | It deletes the file from the build context
c: 1
e: COPY places the SQL dump inside the image's filesystem; a later step in the lab actually loads it into the running database with docker exec.
w: COPY does not execute SQL, interact with ECR, or delete files from the build context.
d: beginner
[/mcq]

[mcq]
q: What AWS CLI command authenticates the Docker client for pushing to Amazon ECR?
o: aws ecr get-login-password (piped into docker login) | docker login --username AWS with no token | aws ecr authenticate | aws ecr get-token
c: 0
e: aws ecr get-login-password retrieves a short-lived authorization token, which is piped into docker login to authenticate the Docker client.
w: docker login alone has no ECR-specific credentials without the piped token. aws ecr authenticate and aws ecr get-token are not valid ECR CLI subcommands.
d: beginner
[/mcq]

[mcq]
q: In this lab's own-account setup, why was an IAM role attached to DockerHost instead of running aws configure with an access key?
o: aws configure doesn't exist in the AWS CLI | An attached role provides temporary, auto-rotated credentials with nothing stored on disk | Roles are required to install Docker | Access keys can't authenticate to ECR
c: 1
e: An IAM role attached as an instance profile supplies temporary credentials automatically, avoiding the risk of a long-lived access key sitting in a config file on the instance.
w: aws configure is a real, commonly used command. Roles have nothing to do with installing Docker. Access keys can authenticate to ECR too — the role is simply the safer choice.
d: beginner
[/mcq]

[mcq]
q: What is the purpose of the docker-lab-sg security group's self-referencing rule on port 3306?
o: It blocks all traffic on port 3306 | It allows instances that are members of the security group to reach each other on port 3306, without exposing that port publicly | It only allows traffic from the AWS root account | It opens port 3306 to the entire internet
c: 1
e: A self-referencing rule scopes the allowed source to "anything using this same security group," letting AppServerNode and DockerHost reach MysqlServerNode's database port without opening it to the public internet.
w: The rule allows specific traffic, it doesn't block everything. It has nothing to do with the root account specifically. It's the opposite of opening the port to the whole internet.
d: beginner
[/mcq]

[mcq]
q: What is the main functional difference between a Docker container and a virtual machine?
o: Containers can't run Linux applications | Containers share the host OS kernel instead of running their own guest OS | Containers require a hypervisor | VMs start faster than containers
c: 1
e: Containers rely on the host's kernel for isolation, while VMs each boot an independent guest OS on top of a hypervisor — this is why containers are lighter and faster.
w: Containers commonly run Linux applications. Containers don't require a hypervisor. VMs are typically slower to start than containers, not faster.
d: intermediate
[/mcq]

[mcq]
q: A company wants their app's database host configurable per environment (dev/staging/prod) without rebuilding the Docker image. What's the correct approach?
o: Hardcode three different Dockerfiles, one per environment | Pass the database host as a runtime environment variable via -e | Store the host in the base image | Rebuild the image each time the environment changes
c: 1
e: Passing configuration like a database host as a runtime environment variable keeps one image portable across every environment.
w: Maintaining separate Dockerfiles per environment duplicates effort unnecessarily. Baking it into the base image reintroduces the original problem. Rebuilding per environment defeats the purpose of a portable image.
d: intermediate
[/mcq]

[mcq]
q: Why did this lab need to discover the mysql_1 container's internal IP address before relaunching node_app_1?
o: Because ECR requires it for image tagging | Because the app container connects to the database container using that internal IP as APP_DB_HOST | Because Docker requires manual IP assignment for all containers | Because the security group needed the container's IP
c: 1
e: Once the database was containerized, the app needed to reach it inside the Docker bridge network, which meant using the database container's internal IP as the APP_DB_HOST value.
w: ECR tagging doesn't involve container internal IPs. Docker assigns container IPs automatically by default. Security groups apply to EC2 network interfaces, not individual container IPs on the host's internal bridge network.
d: intermediate
[/mcq]

[mcq]
q: What is the practical difference between an image tag like "latest" and an image digest?
o: They are functionally identical | A tag is mutable and can be reassigned; a digest is an immutable content hash of one exact image | A digest is only used for VM images | Tags are only usable inside private registries
c: 1
e: A tag is a movable pointer that can be reassigned to a different image build over time, while a digest permanently and uniquely identifies one specific image's exact contents.
w: They behave very differently, digests apply to Docker images (not VM images specifically), and tags work in both public and private registries.
d: intermediate
[/mcq]

[mcq]
q: Why is docker image prune useful after repeated docker build runs during development?
o: It deletes running containers | It removes dangling/unused images that accumulate from repeated builds, freeing disk space | It pushes images to ECR automatically | It rebuilds the Dockerfile
c: 1
e: Every build can leave behind intermediate images no longer referenced by a tag; prune reclaims the disk space they occupy.
w: prune doesn't touch running containers, push images, or rebuild anything — it only removes unused images/containers.
d: intermediate
[/mcq]

[mcq]
q: What would happen to the data in the mysql_1 container if it were removed with docker rm without first exporting the data or attaching a volume?
o: The data automatically migrates to Amazon ECR | The data is permanently lost | The data is automatically backed up by Docker | Nothing — data always persists across container removal
c: 1
e: Without a volume or bind mount, a container's writable-layer data disappears when the container is removed — this lab's data survives specifically because it was baked into the image via the mysqldump copy, not because containers preserve data by default.
w: ECR stores images, not container runtime data. Docker doesn't auto-back-up container data. Data does not persist by default once a container without a volume is removed.
d: intermediate
[/mcq]

[mcq]
q: Which of the following correctly explains why sed -i '1d' my_sql.sql was run before loading the dump into mysql_1?
o: To compress the file before import | To remove a line (commonly a CREATE DATABASE or version-specific line) that would conflict with the container's expected setup before import | To encrypt the file | To rename the database inside the file
c: 1
e: sed -i '1d' deletes the first line of the file — a common cleanup step to strip out a line that would otherwise cause an import conflict.
w: sed doesn't compress, encrypt, or rename database contents — it only edits text lines in place.
d: intermediate
[/mcq]

[mcq]
q: What's the MOST cost-effective way to keep Amazon ECR storage costs low for images no longer being deployed?
o: Leave every pushed image tag indefinitely | Set up ECR lifecycle policies to expire old/untagged images automatically | Increase EC2 instance size | Disable ECR entirely
c: 1
e: ECR lifecycle policies can automatically expire untagged or old images based on rules you define, avoiding unbounded storage growth without manual cleanup.
w: Leaving every image indefinitely increases storage cost over time. EC2 instance size is unrelated to ECR storage billing. Disabling ECR removes the ability to store any images at all.
d: intermediate
[/mcq]

[mcq]
q: In production, why would a team commonly avoid running their primary MySQL database as a plain Docker container the way this lab does?
o: Docker cannot run MySQL at all | Containers lack durable persistent storage and automated failover by default, which production databases typically require | MySQL only runs on Windows containers | Containers cannot expose port 3306
c: 1
e: Production databases need durable storage, backups, and high availability that a bare container doesn't provide out of the box — teams commonly use a managed service like Amazon RDS instead, or pair containers with well-configured persistent volumes.
w: Docker can run MySQL fine, as shown in this lab. MySQL isn't restricted to Windows containers. Port 3306 can be exposed from a container exactly as done in this lab.
d: intermediate
[/mcq]

[mcq]
q: Which AWS service would be the MOST appropriate next step for orchestrating this lab's two containers across multiple hosts with auto-scaling?
o: Amazon S3 | Amazon ECS | Amazon Route 53 | AWS IAM
c: 1
e: Amazon ECS is a container orchestration service designed to run, scale, and manage containers like the ones built in this lab across a fleet of hosts.
w: S3 is object storage, Route 53 is DNS, and IAM manages identity/permissions — none of them orchestrate containers.
d: intermediate
[/mcq]

[mcq]
q: A security review flags that this lab's Dockerfiles and commands pass database credentials as plain command-line arguments and environment variables. What's the BEST production-grade fix?
o: Nothing needs to change | Store credentials in a secrets manager (e.g. AWS Secrets Manager) and inject them at runtime rather than passing them as visible CLI arguments | Hardcode the credentials into the Dockerfile instead | Email the credentials to the team
c: 1
e: A secrets manager keeps credentials out of shell history, image layers, and process listings, retrieving them securely at container runtime instead.
w: Doing nothing leaves credentials exposed. Hardcoding into the Dockerfile is worse, since it bakes secrets into the image itself. Emailing credentials is an insecure distribution method.
d: intermediate
[/mcq]

[mcq]
q: Why does pinning a deployment to a specific image digest rather than a tag like "latest" matter for reproducibility?
o: Digests deploy faster than tags | "latest" can silently point to a different image tomorrow, while a digest always refers to one exact, unchanging set of image content | Digests are required by Docker to run any container | Tags cannot be used with Amazon ECR
c: 1
e: Because a tag is a mutable pointer, deploying by tag risks running a different image than what was tested; a digest guarantees byte-for-byte reproducibility.
w: Digests don't affect deploy speed, aren't required to run a container, and tags are fully supported in Amazon ECR.
d: advanced
[/mcq]

[mcq]
q: This lab's node_app image installs npm dependencies with RUN npm install as a single layer combined with the full COPY . . of source code. What's the main downside of this layer ordering for iterative development builds?
o: It causes the app to run slower | Any source code change invalidates the npm install layer's cache, forcing a full dependency reinstall on every rebuild | It prevents the image from being pushed to ECR | It breaks the EXPOSE instruction
c: 1
e: Because COPY . . happens before RUN npm install, Docker's layer cache is invalidated by any source file change — even ones unrelated to dependencies — forcing npm install to rerun. A more efficient pattern copies package.json first, runs npm install, then copies the rest of the source.
w: Runtime speed, ECR push capability, and the EXPOSE instruction are unaffected by this layer ordering — the issue is purely build-cache efficiency.
d: advanced
[/mcq]

[mcq]
q: A team wants to run two replicas of node_app_1 on the same host for basic redundancy, both talking to the same mysql_1 container. Which change is REQUIRED beyond what this lab does?
o: Nothing, docker run can be repeated identically | Each replica needs a unique container name and a unique host port mapping, since two containers can't bind the same host port | mysql_1 must be duplicated as well | The Dockerfile must be rewritten
c: 1
e: Docker will reject a second container trying to bind the same host port, so each replica needs its own --name and its own host-side port in the -p mapping (e.g. 3000:3000 and 3001:3000), while both can share the same backend database container.
w: Repeating the exact command fails on the port conflict. The database doesn't need duplicating for this scenario. The Dockerfile itself doesn't need to change to add replicas.
d: advanced
[/mcq]



[/collapsible-section]

[collapsible-section]
## Hands-On Projects

[hands-on]
[project]
title: Bonus Project 1: Convert This Lab to Docker Compose
objective: Replace the manual docker build / docker run / docker exec sequence used throughout this lab with a single docker-compose.yml that starts both containers together, on their own dedicated network, with one command.
time: 30-45 min
cost: Free tier eligible — uses the same DockerHost instance already running, no new billable resources
prereqs: Completed Tasks 5-7 of this lab | Docker Compose plugin installed on DockerHost (verify with docker compose version; install with sudo dnf install -y docker-compose-plugin if missing)
step: On DockerHost, in ~/containers, create a docker-compose.yml defining two services — node_app (build from ./node_app/codebase_partner) and mysql (build from ./mysql) — plus a shared user-defined network
step: In the node_app service definition, set environment APP_DB_HOST to the mysql service's name (e.g. APP_DB_HOST=mysql) instead of an IP address, relying on Compose's built-in DNS resolution between services
step: Stop and remove the containers created earlier in the lab (docker stop node_app_1 mysql_1 && docker rm node_app_1 mysql_1) so ports 3000 and 3306 are free
step: Run docker compose up -d and confirm both services start
screenshot: screenshot-compose-up.png | Terminal output of `docker compose up -d` showing both the node_app and mysql services created and started
[screenshot-guide]
file: screenshot-compose-up.png
task: Bonus Project 1: Convert This Lab to Docker Compose
step: Run docker compose up -d on DockerHost
show: The terminal output listing both services as "Created" and "Started"
[/screenshot-guide]
step: Verify the app in the browser at http://<DockerHost-public-ip:3000/suppliers, confirming the suppliers list still loads correctly using the Compose-managed containers
screenshot: screenshot-compose-app-working.png | The Suppliers page loading correctly with containers now managed by Docker Compose
[screenshot-guide]
file: screenshot-compose-app-working.png
task: Bonus Project 1: Convert This Lab to Docker Compose
step: Load the Suppliers page after switching to Compose-managed containers
show: The Suppliers page displaying the seeded record, confirming Compose's service-name DNS resolution worked
[/screenshot-guide]
step: Clean up by running docker compose down to stop and remove both services and the network in one command
[/project]

[project]
title: Bonus Project 2: Production-Readiness Prep for the Coffee Supplier Platform
objective: Sketch and partially implement the production path for this app — replacing the mysql container with Amazon RDS and moving credentials out of environment variables — without fully deploying a production system.
time: 60-90 min
cost: Amazon RDS db.t3.micro is Free Tier eligible for 12 months (750 hours/month); AWS Secrets Manager charges roughly $0.40/secret/month plus API call costs outside its own free tier — budget under $1 for the duration of this project if you complete Cleanup promptly
prereqs: Completed Task 8 of this lab | Comfortable creating resources in the RDS and Secrets Manager consoles
step: In the RDS console, launch a MySQL db.t3.micro instance in the same VPC as your lab instances, using a new DB subnet group and a security group that allows inbound 3306 only from docker-lab-sg
screenshot: screenshot-rds-instance-created.png | RDS console showing the new MySQL instance in "Available" status with its endpoint visible
[screenshot-guide]
file: screenshot-rds-instance-created.png
task: Bonus Project 2: Production-Readiness Prep for the Coffee Supplier Platform
step: Wait for the new RDS instance to reach Available status
show: The instance status, engine version, and endpoint hostname in the RDS console
[/screenshot-guide]
step: From DockerHost, run the same mysqldump/import sequence from Task 6 against the RDS endpoint instead of mysql_1, seeding it with the COFFEE database
step: In AWS Secrets Manager, store the database credentials (APP_DB_HOST, APP_DB_USER, APP_DB_PASSWORD, APP_DB_NAME) as a single JSON secret instead of passing them as docker run -e flags
step: Update the IAM role attached to DockerHost to also allow secretsmanager:GetSecretValue for that specific secret
step: Relaunch node_app_1 with a small startup script that retrieves the secret via the AWS CLI/SDK before starting the app, instead of hardcoded -e flags
screenshot: screenshot-app-using-secrets-manager.png | The Suppliers page loading correctly with the app now sourcing its database credentials from Secrets Manager instead of docker run flags
[screenshot-guide]
file: screenshot-app-using-secrets-manager.png
task: Bonus Project 2: Production-Readiness Prep for the Coffee Supplier Platform
step: Load the Suppliers page after switching the app to Secrets-Manager-sourced credentials
show: The Suppliers page working correctly, with no visible -e flags containing plaintext credentials in the docker run command used to start it
[/screenshot-guide]
step: [warning]This project provisions a billable RDS instance and a billable Secrets Manager secret. Delete the RDS instance (skip the final snapshot for a lab environment) and the secret in Cleanup below as soon as you're done.[/warning] Delete the RDS instance and the Secrets Manager secret to avoid ongoing charges
[/project]
[/hands-on]



[/collapsible-section]

[collapsible-section]
## Learning Checklist

[checklist]
cat: 📚 Concepts Mastered
- Explain the difference between a Docker image and a Docker container
- Explain why containers share the host OS kernel while VMs each run a full guest OS
- Describe what a Dockerfile is and what FROM, WORKDIR, COPY, RUN, EXPOSE, and CMD each do
- Explain why environment-specific values should be passed at runtime rather than hardcoded into an image
- Describe the difference between an image tag and an image digest
- Explain what Amazon ECR is and how it relates to Docker Hub
- Explain why an IAM role attached to an EC2 instance is safer than a long-lived access key stored on that instance
[/checklist]

[checklist]
cat: 🛠️ Skills Acquired
- Create an IAM user, an IAM role, a key pair, and a security group from scratch in a personal AWS account
- Launch and manually configure an EC2 instance to run a Node.js app or a MySQL/MariaDB database directly on the guest OS
- Write a working Dockerfile for a Node.js application
- Build a Docker image and run it as a container with docker build and docker run
- Diagnose a container networking/configuration failure using docker logs and docker inspect
- Migrate a MySQL database's data into a Docker container using mysqldump
- Connect two containers on the same host so one can reach the other
- Authenticate the Docker client to Amazon ECR using an attached IAM role and push a tagged image
- Fully tear down a multi-resource AWS environment with no leftover charges
[/checklist]

[checklist]
cat: 🎓 Exam Ready
- Recall that containers virtualize at the application layer while VMs virtualize the full OS
- Recall that a tag is mutable while a digest is immutable
- Identify when Amazon ECS or Amazon EKS becomes the right choice over standalone containers
- Recall that ECR authentication requires a token from aws ecr get-login-password piped into docker login
- Identify the security risk of hardcoding credentials into an image versus injecting them at runtime
- Recall that an EC2 instance profile is how an instance assumes an IAM role automatically
[/checklist]

[checklist]
cat: 💼 Hands-On Done
- Completed Task 1-3: provisioned an IAM user, IAM role, key pair, security group, and container host from scratch
- Completed Task 4-8: migrated the coffee-supplier app and database to Docker containers and pushed the image to Amazon ECR
- Completed at least one Extended Task: inspected image layers, container config, logs, or simulated a dependency failure
- Completed Bonus Project 1: rebuilt the lab's setup using Docker Compose
- Completed Bonus Project 2: moved the database to Amazon RDS and credentials to Secrets Manager
- Ran Cleanup — terminated all EC2 instances, deleted the ECR repository, security group, key pair, and IAM role
[/checklist]



[/collapsible-section]

[collapsible-section]
## Reflection Questions

[reflection]
q: Why did containerizing the app expose a configuration bug (the hardcoded database IP) that wasn't obvious when the app ran directly on AppServerNode's guest OS?
hint: Think about what was implicitly providing the correct environment variable before, and what changed when the app moved into a container.
[/reflection]

[reflection]
q: If you deleted the mysql_1 container right now without having baked the mysqldump file into its image, what would happen to the supplier data — and how could you have prevented that?
hint: Consider what a Docker volume or bind mount is for, versus data that only lives in a container's writable layer.
[/reflection]

[reflection]
q: This lab used a container's internal bridge-network IP address for the app-to-database connection. What could go wrong with that approach if the containers are restarted independently, and how does Docker Compose's service-name DNS resolve it?
hint: Internal container IPs aren't guaranteed to stay fixed across a stop/start cycle.
[/reflection]

[reflection]
q: Why might a company choose Amazon RDS over a self-managed MySQL container for their production database, even after seeing how straightforward it was to containerize MySQL in this lab?
hint: Think about backups, failover, patching, and durability — not just whether it's technically possible to run MySQL in a container.
[/reflection]

[reflection]
q: What would need to change about this lab's Dockerfiles and run commands to safely support running two app replicas on the same host at once?
hint: Consider what happens when two containers both try to bind the same host port.
[/reflection]

[reflection]
q: Why does Amazon ECR authenticate with a short-lived token from aws ecr get-login-password rather than a long-lived username and password?
hint: Think about the security trade-offs of credentials that expire quickly versus ones that don't.
[/reflection]

[reflection]
q: The lab's Dockerfile copies all source code before running npm install. How would reordering these steps change what gets rebuilt the next time only application code (not dependencies) changes?
hint: Docker caches each instruction's layer and only reruns instructions whose inputs changed.
[/reflection]

[reflection]
q: This lab attached AdministratorAccess to a lab-only IAM user for convenience. If you were setting this lab up for a team rather than yourself, what specific permissions would you scope the IAM user and the EC2 role down to instead?
hint: List the exact services this lab actually touches — EC2, IAM (to create/pass one role), and ECR — and think about which actions within each are genuinely needed versus merely convenient.
[/reflection]



[/collapsible-section]

[collapsible-section]
## Links & References

[ref]
text: Docker Overview — Official Docker Documentation
url: https://docs.docker.com/get-started/docker-overview/
[/ref]

[ref]
text: Dockerfile Reference — Official Docker Documentation
url: https://docs.docker.com/reference/dockerfile/
[/ref]

[ref]
text: Amazon Elastic Container Registry — Official AWS Documentation
url: https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html
[/ref]

[ref]
text: Amazon ECR Pricing
url: https://aws.amazon.com/ecr/pricing/
[/ref]

[ref]
text: Amazon ECR FAQs
url: https://aws.amazon.com/ecr/faqs/
[/ref]

[ref]
text: IAM Roles for Amazon EC2 — Official AWS Documentation
url: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html
[/ref]

[ref]
text: Amazon EC2 Security Groups — Official AWS Documentation
url: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
[/ref]

[ref]
text: AWS Free Tier
url: https://aws.amazon.com/free/
[/ref]

[ref]
text: AWS Well-Architected Framework — Reliability Pillar
url: https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html
[/ref]

[ref]
text: Amazon Elastic Container Service (ECS) — Official AWS Documentation
url: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html
[/ref]



[/collapsible-section]

[image-prompts]
aws-docker-migration-lab8-1-before-after.png:
CONCEPT: Shows the "before" state (app and database installed directly on two EC2 guest OSes) transforming into the "after" state (both running as portable Docker containers on one container host)
SHOW:
- Left half labeled "Before": two separate dashed EC2 instance boxes, "AppServerNode" containing a purple "node app" bar, "MysqlServerNode" containing a blue "mysql" bar, each on top of a light green "EC2 instance guest OS" bar, connected by a "Network connectivity" arrow
- Right half labeled "After": one dashed EC2 instance box labeled "DockerHost", containing an orange "Docker Engine" bar on a green "EC2 instance guest OS" bar, with two small dashed container boxes on top holding "node app" and "mysql" bars respectively, connected to each other by a short "Network connectivity" arrow
- A large arrow from the left half to the right half labeled "Migrate"

---
aws-docker-migration-lab8-1-build-flow.png:
CONCEPT: Shows the sequential flow from source code and a Dockerfile through docker build into a Docker image, then through docker run into a running container
SHOW:
- Left box labeled "Build directory" containing two items: "App code base" and "Dockerfile"
- Arrow labeled "docker build" pointing right from the build directory to a box labeled "Docker image"
- Arrow labeled "docker run" pointing right from the Docker image box to a box labeled "Docker container"
- Small icon or label near the Dockerfile indicating it references a "Base image" pulled from a registry

---
aws-docker-migration-lab8-1-account-setup.png:
CONCEPT: Shows how the IAM user, the IAM role/instance profile, and the shared security group relate to the three EC2 instances provisioned in this lab
SHOW:
- Top left: a small person icon labeled "IAM User: docker-lab-admin" with an arrow labeled "signs in to" pointing to the AWS Management Console
- Top right: a badge icon labeled "IAM Role: docker-lab-ecr-role" with a dashed arrow labeled "attached as instance profile" pointing down to one specific instance box labeled "DockerHost"
- Center: a large dashed rectangle labeled "Security group: docker-lab-sg" containing three instance boxes side by side — "AppServerNode", "MysqlServerNode", and "DockerHost" — each shown as a small EC2 icon
- Small labeled arrows between the instance boxes inside the security group rectangle showing "port 3306 (self-referencing rule)" and separate external arrows from outside the rectangle labeled "22, 80, 3000 from My IP"

---
aws-docker-migration-lab8-1-container-network.png:
CONCEPT: Shows two containers, node_app and mysql, communicating over Docker's internal bridge network using container IP addresses rather than EC2 instance IPs
SHOW:
- One dashed outer box labeled "DockerHost (EC2 instance)" containing an orange "Docker Engine" bar
- Inside it, two dashed container boxes side by side: left one labeled "node_app_1" with a purple "node app" bar and "Bins/Libs", right one labeled "mysql_1" with a blue "mysql" bar and "Bins/Libs"
- A bidirectional arrow between the two containers labeled "Bridge network — internal container IP"
- A crossed-out arrow pointing outward to a faded "MysqlServerNode EC2 instance" box, indicating the app no longer talks to the original EC2-hosted database

---
aws-docker-migration-lab8-1-ecr-push-flow.png:
CONCEPT: Shows the sequence of docker login (via an IAM role, not static keys), docker tag, and docker push moving a local image into an Amazon ECR repository
SHOW:
- Left box labeled "Local Docker image: node_app:latest" on DockerHost
- Small badge icon labeled "docker-lab-ecr-role (instance profile)" feeding into a "docker login" step via an arrow labeled "aws ecr get-login-password"
- Arrow labeled "docker tag" pointing to a box labeled "Tagged image: <registry-id.dkr.ecr.us-east-1.amazonaws.com/node-app:latest"
- Arrow labeled "docker push" pointing from the tagged image box to a final box labeled "Amazon ECR repository: node-app" containing a small "latest" tag icon inside it
[/image-prompts]
