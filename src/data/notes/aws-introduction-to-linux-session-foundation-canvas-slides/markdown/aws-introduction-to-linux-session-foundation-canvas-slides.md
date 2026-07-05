---
type: aws
title: Introduction to Linux
slug: introduction-to-linux
topic_number: 02
date: 2026-07-02
date_modified: 2026-07-02
keywords: [linux, kernel, distributions, shell, bash, man pages, ssh, ec2, aws restart]
tags: [linux, aws-restart, foundations, linux-fundamentals]
when_to_use: Use before any hands-on Linux CLI lab, to give learners with no prior Linux exposure a shared vocabulary (kernel, shell, distribution, daemon) and a first look at connecting to a remote instance.
presentation: true
source_type: pdf
source_title: RSLX EN-US SG M02 INTROLINUX (Introduction to Linux — Linux Fundamentals)
slide_count: 47
audience: beginner
session_name: AWS re/start - Linux Fundamentals
---

[slide type="title"]
# Introduction to Linux
Linux Fundamentals
[/slide]

[slide type="objectives"]
## What You'll Learn
- Explain what Linux is and why its openness matters
- Identify the core pieces that make up a working Linux system
- Tell the command line and graphical interfaces apart, and when each is used
- Pull up built-in help for any Linux command without leaving the terminal
- Recognize the major Linux distributions and trace where they come from
[/slide]

[slide type="section-divider"]
## Understanding Linux
[/slide]

[slide type="concept"]
## Hardware vs. Software
- Hardware is a computer's physical parts: CPU, memory, storage, network card
- Software is the programs installed on top of that hardware
- An operating system is a special category of software
- It sits between the user and the hardware, managing both
[/slide]

[slide type="concept"]
## Defining Linux
- Linux is an operating system, not a single fixed product
- It's free to use, and its source code is published for anyone to read
- Because the code is open, anyone can inspect, modify, or extend it
- That openness is exactly why so many different "flavors" of Linux exist
[/slide]

[slide type="concept"]
## What Makes Linux, Linux
- Open source, released under the GNU General Public License (GPL)
- Multi-user and multi-tasking — many people, many programs, running at once
- Built with networking support from the ground up
- Ships with a large set of built-in system tools and utilities
[/slide]

[slide type="concept"]
## Where Linux Came From
- Created in 1991 by Linus Torvalds, then a student at the University of Helsinki
- Modeled on Unix, an operating system dating back to the late 1960s
- Modular — pieces can be added or swapped out as needed
- Known for stability, rarely needing a restart to keep running
- Flexible enough to run as either a desktop OS or a server OS
[/slide]

[slide type="concept"]
## What's a Distribution?
- A "distro" is Linux packaged up and ready to install
- Because Linux is open source, anyone can build and tailor their own
- Distros are typically downloaded and installed from an image file
- Examples: Amazon Linux 2, Red Hat Enterprise Linux (RHEL), Debian, Ubuntu
[/slide]

[slide type="diagram"]
## How Does an Operating System Fit Between You and the Hardware?
[diagram-prompt]
CONCEPT: Show a simple vertical stack — User at the top, then Applications, then the Operating System, then Hardware at the bottom — with arrows showing requests flowing down and responses flowing up. The point is that the OS is the go-between: applications ask it for hardware access, and it's the only layer that touches the hardware directly.
[/diagram-prompt]
[/slide]

[slide type="engage"]
[poll]
Quick check
Which of these is NOT true about Linux?
A) It is open source
B) Only one person can use it at a time
C) It supports multi-tasking
[reveal]B — Linux supports multiple users and multiple tasks running at the same time.[/reveal]
[/poll]
[/slide]

[slide type="recap"]
## Recap: Understanding Linux
- Linux is a free, open-source operating system inspired by Unix
- It supports many simultaneous users and many simultaneous tasks
- A distribution bundles the Linux kernel with extra tools for a specific purpose
[/slide]

[slide type="section-divider"]
## Inside a Linux System
[/slide]

[slide type="concept"]
## The Kernel: Linux's Control Center
- The kernel is the core program at the heart of every Linux system
- It decides which running program gets CPU time, and when
- It hands out memory to the operating system and to applications
- It manages access to hardware — disks, network cards, and other devices
[/slide]

[slide type="diagram"]
## What Does the Kernel Actually Manage?
[diagram-prompt]
CONCEPT: A central "Kernel" node with five spokes radiating out to labeled nodes: Memory, Processes, File System Access, Devices, Resource Allocation. The point is that the kernel is the single hub coordinating all of these resources, not five separate unrelated systems.
[/diagram-prompt]
[/slide]

[slide type="concept"]
## Daemons: Programs Working in the Background
- A daemon runs continuously without a user directly controlling it
- It typically exists to serve other programs or the system as a whole
- Process names traditionally end in "d" — a convention, not a hard rule
- Examples: syslogd captures and stores system messages; sshd handles secure remote connections
[/slide]

[slide type="concept"]
## Applications: What Users Actually Touch
- An application is software built to help with one type of task or activity
- Word processors, web browsers, email clients, media players — all applications
- They sit on top of the kernel and daemons, drawing on the resources those layers provide
[/slide]

[slide type="concept"]
## Data Files and How They're Named
- A data file holds content a program reads or writes — text, music, images
- Files can be grouped into directories to keep things organized
- A full file reference follows this pattern: [directoryName]fileName[.extension]
- Example: /pictures/dog.gif — directory "pictures", file "dog", extension ".gif"
[/slide]

[slide type="concept"]
## Configuration Files
- These files store the settings a program reads when it starts up
- Example: /etc/group lists which users are allowed on the system
- Some configuration files run a set of commands automatically at startup
- Common extensions: .cnf, .conf, .cfg, .cf, .ini
[/slide]

[slide type="engage"]
[think]
If a program keeps forgetting your preferences after every restart, would you check a data file or a configuration file first — and why?
[/think]
[/slide]

[slide type="recap"]
## Recap: Inside a Linux System
- The kernel is the core that manages memory, processes, and hardware access
- Daemons run quietly in the background providing system services
- Applications, data files, and configuration files round out a working system
[/slide]

[slide type="section-divider"]
## Talking to Linux
[/slide]

[slide type="concept"]
## Two Ways to Interface with Linux
- Command line interface (CLI): type commands, get results — lighter on resources, scriptable
- Graphical user interface (GUI): point-and-click, visually similar across Linux, Windows, and macOS
- Most Linux servers run CLI-only; most desktop workstations lean on the GUI
[/slide]

[slide type="concept"]
## The Shell: Your Command Interpreter
- The shell is what reads and executes the commands you type
- It translates your input into an action the kernel then carries out
- Different distributions can support different shell options
[/slide]

[slide type="concept"]
## Shell Types You Might Encounter
- sh — the original Bourne shell, the Unix ancestor of the others
- bash — the Bourne-again shell, and the default on most Linux distributions
- ksh — the KornShell, common on other Unix systems
- This course focuses on bash exclusively, since it's the Linux default
[/slide]

[slide type="engage"]
[poll]
Quick check
True or false: bash is the default shell on most Linux distributions.
A) True
B) False
[reveal]A — True. Bash (the Bourne-again shell) is the default shell for most Linux distributions.[/reveal]
[/poll]
[/slide]

[slide type="recap"]
## Recap: Talking to Linux
- CLI and GUI are two different doors into the same system
- The shell is what interprets the commands you type
- Bash is the shell you'll use for the rest of this course
[/slide]

[slide type="section-divider"]
## Finding Your Way: Built-in Help
[/slide]

[slide type="concept"]
## Manual Pages: Linux's Built-in Help
- Man pages are Linux's own documentation — no internet connection needed
- Every command has a page covering its purpose, syntax, and options
- You access them with the man command
- "Did you check the man pages?" is the classic first reply to any Linux question
[/slide]

[slide type="concept"]
## Reading a Man Page
- Name — what the command is and what it does, in brief
- Synopsis — the exact syntax to use
- Description — a fuller explanation of behavior
- Options — what each flag or switch changes
- Syntax: man <commandName>, e.g. man man
[/slide]

[slide type="concept"]
## Navigating Inside a Man Page
- Up/Down arrow — scroll one line at a time
- Page Up/Page Down — scroll a full page
- Space bar — also scrolls down a page
- Forward slash plus text (/searchString) — search within the page
- q — quit back to the command line
[/slide]

[slide type="engage"]
[predict]
Before we continue... if you forgot the exact syntax for the cp command, what would you type to find out?
[reveal]man cp — this opens the manual page showing cp's syntax, description, and options.[/reveal]
[/predict]
[/slide]

[slide type="recap"]
## Recap: Built-in Help
- Man pages are always available, offline, on any Linux system
- The man command surfaces a command's name, syntax, description, and options
- A handful of keys let you scroll and search without leaving the terminal
[/slide]

[slide type="section-divider"]
## Choosing a Distribution
[/slide]

[slide type="concept"]
## Where Major Distributions Come From
- Fedora — sponsored mainly by Red Hat (an IBM company); used to develop and mature features
- Fedora feeds into RHEL, which forms the basis for Amazon Linux 2 and CentOS
- Debian — built strictly around open-source principles; Canonical's Ubuntu derives from it
- OpenSUSE — sponsored by the German company SUSE; basis for SUSE Enterprise Linux
[/slide]

[slide type="diagram"]
## How Are These Distributions Related?
[diagram-prompt]
CONCEPT: A three-branch lineage tree. Branch 1: Fedora leads to RHEL, which splits into Amazon Linux 2 and CentOS. Branch 2: Debian leads to Ubuntu. Branch 3: OpenSUSE leads to SUSE Enterprise Linux. The point is showing how community upstream projects feed commercial or derivative downstream distributions.
[/diagram-prompt]
[/slide]

[slide type="concept"]
## Amazon Linux 2
- AWS's own enterprise-class Linux distribution
- Purpose-built to run on AWS virtual machines (EC2)
- Derived from RHEL
- Applies critical security updates automatically when an instance boots
[/slide]

[slide type="concept"]
## CentOS
- Short for Community Enterprise Operating System
- A free, enterprise-class distribution derived from RHEL
- Used as the lab environment distribution throughout this course
- Discontinued by Red Hat in December 2020, replaced by CentOS Stream
[/slide]

[slide type="engage"]
[pause]
CentOS was discontinued in favor of CentOS Stream back in 2020. Why might a training course still choose to build labs on CentOS?
[/pause]
[/slide]

[slide type="recap"]
## Recap: Choosing a Distribution
- Nearly every major distro traces back to Fedora, Debian, or OpenSUSE
- Amazon Linux 2 is AWS's own RHEL-derived distribution, tuned for EC2
- CentOS is RHEL-derived and free, though now succeeded by CentOS Stream
[/slide]

[slide type="section-divider"]
## Connecting to a Remote Linux Server
[/slide]

[slide type="concept"]
## Getting Into the Lab
- Labs run through Vocareum, which spins up your working AWS environment
- "Start Lab" provisions the EC2 instance you'll work on
- The Details panel shows the instance's IP address and a link to your private key
- You generally won't need the AWS Console for the Linux labs, but it's worth exploring
[/slide]

[slide type="diagram"]
## What Does the Lab Connection Path Look Like?
[diagram-prompt]
CONCEPT: A client machine holding a private key connects over SSH, through nested boxes labeled AWS Cloud > Availability Zone > VPC > Public Subnet > Security Group, arriving at an EC2 instance icon. The point is showing the layered network path a lab SSH connection travels, not the specific AWS icon set.
[/diagram-prompt]
[/slide]

[slide type="concept"]
## Private Keys: PEM and PPK
- Every EC2 instance in this course uses a default user: ec2-user
- Connecting requires a private key, generated for you automatically
- .pem is the standard key format ("Privacy Enhanced Mail")
- PuTTY on Windows uses .ppk instead — PuTTYgen converts between the two
- Both formats are provided directly in the lab
[/slide]

[slide type="concept"]
## Connecting with SSH or PuTTY
- Mac or Linux: use the ssh command directly from a terminal, with the .pem key
- Windows: use PuTTY, a graphical SSH client, with the .ppk key
- SSH connections travel over port 22, opened by the instance's security group
[/slide]

[slide type="engage"]
[scenario]
You're on a Windows laptop and just downloaded your lab's .pem key. What's your next step to connect to the EC2 instance?
[reveal]Convert the .pem to a .ppk with PuTTYgen (or use the .ppk already provided), open PuTTY, enter the instance's IP as the host on port 22, and connect as ec2-user.[/reveal]
[/scenario]
[/slide]

[slide type="recap"]
## Recap: Connecting to a Remote Server
- Vocareum starts your lab and hands you connection details
- A private key (.pem or .ppk) authenticates your connection as ec2-user
- SSH — via terminal or PuTTY — is how you'll reach every lab instance in this course
[/slide]

[slide type="summary"]
## Summary
- Linux is a free, open-source, Unix-inspired operating system that supports multiple users and tasks at once
- A distribution packages the Linux kernel together with complementary tools and applications
- The kernel manages memory, processes, and hardware; daemons, applications, data files, and configuration files fill out the rest of a working system
- Every distro offers a CLI, and bash is the default shell you'll use throughout this course
- The man command is your built-in reference for any command's syntax and options
- Most major distributions trace back to a Fedora, Debian, or OpenSUSE lineage
- You'll connect to your lab's EC2 instance over SSH, authenticated with a private key
[/slide]
