---
type: aws
title: Introduction to Computing
slug: introduction-to-computing
presentation: true
source_type: pdf
source_title: internal computing-fundamentals training deck (19 slides)
audience: beginner
session_name: Cloud Foundations
keywords: [computing basics, hardware, software, cpu, memory, storage, networking, operating system]
tags: [computing-fundamentals, it-basics]
---

[slide type="title"]
# Introduction to Computing
[/slide]

[slide type="objectives"]
## What You'll Learn
- Why technology matters in everyday life
- The core vocabulary used to talk about computers
- How hardware and software divide up the work
[/slide]

[slide type="section-divider"]
## Living in a Digital World
[/slide]

[slide type="engage"]
[think]
Think back to the last thing you did online — shopping, streaming, messaging a friend. What device did you use, and what app or service made it possible?
[/think]
[/slide]

[slide type="concept"]
## Technology Touches Almost Everything
- Learning and research
- Shopping and banking
- Home security
- Staying in touch with people
- Entertainment
[/slide]

[slide type="concept"]
## Three Building Blocks
- Applications — the software you actually interact with
- Computers — the physical or virtual machines that run applications
- Networks — the connections that let computers and apps talk to each other
[/slide]

[slide type="section-divider"]
## Speaking the Language of Computing
[/slide]

[slide type="concept"]
## What Is an Application?
- A program: a set of instructions a computer carries out to do a task
- Written in a programming language, then compiled or run as code
- "Software" is just another word for a computer program
[/slide]

[slide type="concept"]
## Where Applications Live
- Web app — runs on a server, opened through a browser
- Mobile app — installed on and run from a phone or tablet
- Desktop app — installed on and run from a laptop or PC
- IoT app — runs on a connected device like a smart thermostat or watch
[/slide]

[slide type="diagram"]
## Two Halves of Every Computer
[diagram-prompt]
CONCEPT: A simple two-column split diagram. Left column labeled "Hardware" with four stacked icons/labels: Motherboard, CPU, Memory, Storage Drive, Network Card. Right column labeled "Software" with two stacked icons/labels: Operating System, Applications. A center divider or connecting arrow shows software running "on top of" hardware. Flat AWS-style icon language, no vendor branding, no copied artwork.
[/diagram-prompt]
[/slide]

[slide type="concept"]
## The Motherboard Ties It Together
- A circuit board that every other hardware part plugs into
- Connects the CPU, memory, storage, network card, and ports
- Sometimes called the system board
[/slide]

[slide type="concept"]
## The CPU Does the Thinking
- Carries out the instructions applications and the OS send it
- Handles logic, arithmetic, and input/output operations
- Multiple cores let it work on more than one thing at a time
- Also called the processor
[notes]
Think of the CPU as the part of the computer that actually executes work, one instruction at a time. Every button click, calculation, or file save eventually becomes a small instruction the CPU carries out.

A core is essentially one independent execution unit. A CPU with four cores can genuinely work on four separate instruction streams at once, which is why more cores usually means a computer can stay responsive even while running several demanding programs together.
[/notes]
[/slide]

[slide type="concept"]
## Memory Is Short-Term Workspace
- Holds the instructions and data the CPU is actively using
- Volatile — its contents disappear when the power goes off
- Sized in megabytes or gigabytes; more memory usually means smoother performance
- Also called RAM
[notes]
Memory works like a desk the CPU keeps its current work spread out on — fast to reach, but wiped clean the moment the computer loses power. That's the key difference from a storage drive, which is more like a filing cabinet: slower to search through, but nothing disappears when you close the drawer.

This is also why closing unused programs frees up memory: each open program is taking up desk space, even if you're not actively looking at it.
[/notes]
[/slide]

[slide type="concept"]
## Storage Drives Keep Things Permanently
- Hold files, installed programs, and documents long-term
- Two common types: spinning hard disk drives (HDD) and flash-based solid state drives (SSD)
- Data survives a power-off, unlike memory
- Speed is measured in MB/s or IOPS
[/slide]

[slide type="diagram"]
## How Devices Reach Each Other
[diagram-prompt]
CONCEPT: Show several device icons (laptop, phone, printer) connecting into a central router/switch icon, with one path labeled "Ethernet cable" (wired) and another labeled "Wi-Fi signal" (wireless), and the router icon connecting outward to a cloud icon labeled "Internet — the largest network of all." Flat AWS-style icon language, original layout, no copied artwork.
[/diagram-prompt]
[/slide]

[slide type="concept"]
## The Network Interface Card
- The hardware that lets a computer join a network
- Can be wired (Ethernet) or wireless (Wi-Fi)
- Throughput measured in gigabits per second (Gbps)
- Also called a network adapter
[/slide]

[slide type="concept"]
## The Operating System Runs the Show
- Coordinates how applications share the CPU, memory, storage, and network
- Gives you a way to interact with the machine — command line or graphical interface
- Examples: Windows, macOS, Linux distributions, iOS, Android
[/slide]

[slide type="engage"]
[poll]
Which of these is volatile — meaning its contents are lost when the power goes off?
A) Solid state drive
B) Hard disk drive
C) Memory (RAM)
[reveal]C — Memory (RAM) is volatile and temporary. Both drive types (A and B) are persistent storage; their data survives a restart.[/reveal]
[/poll]
[/slide]

[slide type="recap"]
## Recap: Speaking the Language of Computing
- Applications are programs; they run as web, mobile, desktop, or IoT software
- Hardware (motherboard, CPU, memory, storage, network card) does the physical work
- Software (OS + applications) tells the hardware what to do
[/slide]

[slide type="summary"]
## Summary
- Technology now underpins education, commerce, security, communication, and entertainment
- Every digital experience rests on three building blocks: applications, computers, and networks
- A computer splits its work between hardware (the physical parts) and software (the instructions those parts run)
- The CPU processes, memory holds active work temporarily, storage keeps data permanently, and the network interface card connects it all to the outside world
[/slide]
