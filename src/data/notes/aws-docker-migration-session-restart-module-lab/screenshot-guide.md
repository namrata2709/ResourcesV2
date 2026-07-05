# Screenshot Guide

One entry per screenshot. Capture each in sequence during the lab.

---

## Task 1: Setting Up Your AWS Environment

### 1. `screenshot-iam-user-created.png`

**Console action:** Finish the Create user wizard for docker-lab-admin

**What must be visible:** The user summary page showing the username, console access enabled, and the AdministratorAccess policy listed under permissions

---

### 2. `screenshot-security-group-rules.png`

**Console action:** Save the inbound rules for docker-lab-sg

**What must be visible:** All four inbound rules listed with their correct ports and sources, especially the self-referencing 3306 rule

---

### 3. `screenshot-iam-role-created.png`

**Console action:** Finish the Create role wizard for docker-lab-ecr-role

**What must be visible:** The role summary page showing "Trusted entities: ec2.amazonaws.com" and the attached ECR policy

---

## Task 2: Launching and Configuring the Source Instances

### 4. `screenshot-appservernode-live.png`

**Console action:** Load http://<AppServerNode-public-ip in a browser

**What must be visible:** The coffee-suppliers homepage with the navigation bar and "List of suppliers" link visible

---

## Task 3: Launching Your Container Host and Preparing the Development Environment

### 5. `screenshot-dockerhost-iam-role.png`

**Console action:** Select the IAM instance profile in Advanced details before launching DockerHost

**What must be visible:** The IAM instance profile dropdown with docker-lab-ecr-role selected

---

## Task 5: Migrating the Application to a Docker Container

### 6. `screenshot-containerized-app-working.png`

**Console action:** Reload the containerized app and open List of suppliers after relaunching with APP_DB_HOST set

**What must be visible:** The Suppliers page loading the seeded record, proving the container is now reaching MysqlServerNode over the VPC

---

## Task 7: Testing the MySQL Container with the Node Application

### 7. `screenshot-app-connected-to-container-db.png`

**Console action:** Reload the running application and open List of suppliers

**What must be visible:** The supplier record with the modified street name, proving the source is the mysql_1 container

---

## Task 8: Adding the Docker Images to Amazon ECR

### 8. `screenshot-ecr-repository-image.png`

**Console action:** Open the Amazon ECR console and view the node-app repository's Images tab

**What must be visible:** The image row with tag "latest", its digest, and the pushed-at timestamp

---

## Bonus Project 1: Convert This Lab to Docker Compose

### 9. `screenshot-compose-up.png`

**Console action:** Run docker compose up -d on DockerHost

**What must be visible:** The terminal output listing both services as "Created" and "Started"

---

### 10. `screenshot-compose-app-working.png`

**Console action:** Load the Suppliers page after switching to Compose-managed containers

**What must be visible:** The Suppliers page displaying the seeded record, confirming Compose's service-name DNS resolution worked

---

## Bonus Project 2: Production-Readiness Prep for the Coffee Supplier Platform

### 11. `screenshot-rds-instance-created.png`

**Console action:** Wait for the new RDS instance to reach Available status

**What must be visible:** The instance status, engine version, and endpoint hostname in the RDS console

---

### 12. `screenshot-app-using-secrets-manager.png`

**Console action:** Load the Suppliers page after switching the app to Secrets-Manager-sourced credentials

**What must be visible:** The Suppliers page working correctly, with no visible -e flags containing plaintext credentials in the docker run command used to start it

---
