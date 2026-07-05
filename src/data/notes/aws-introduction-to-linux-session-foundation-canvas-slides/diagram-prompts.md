# Diagram Prompts — introduction-to-linux

## Slide 9, image #1

Show a simple vertical stack — User at the top, then Applications, then the Operating System, then Hardware at the bottom — with arrows showing requests flowing down and responses flowing up. The point is that the OS is the go-between: applications ask it for hardware access, and it's the only layer that touches the hardware directly.

## Slide 14, image #1

A central "Kernel" node with five spokes radiating out to labeled nodes: Memory, Processes, File System Access, Devices, Resource Allocation. The point is that the kernel is the single hub coordinating all of these resources, not five separate unrelated systems.

## Slide 35, image #1

A three-branch lineage tree. Branch 1: Fedora leads to RHEL, which splits into Amazon Linux 2 and CentOS. Branch 2: Debian leads to Ubuntu. Branch 3: OpenSUSE leads to SUSE Enterprise Linux. The point is showing how community upstream projects feed commercial or derivative downstream distributions.

## Slide 42, image #1

A client machine holding a private key connects over SSH, through nested boxes labeled AWS Cloud > Availability Zone > VPC > Public Subnet > Security Group, arriving at an EC2 instance icon. The point is showing the layered network path a lab SSH connection travels, not the specific AWS icon set.
