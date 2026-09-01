how many request per minute can self hosted n8n handle for a single flow
Self-hosted n8n does not have a hard-coded limit on requests per minute; instead, its capacity is strictly defined by your infrastructure and configuration. 
Performance Benchmarks
Execution Capacity: A single n8n instance can handle up to 220 workflow executions per second (~13,200 per minute) under optimal conditions.
Scalability: This can be further increased by using Queue Mode, which offloads tasks to multiple worker instances coordinated via Redis. 
Key Factors Affecting Throughput
The actual number of requests your specific flow can handle depends on:
Hardware Specs: A standard production setup usually starts with at least 2 vCPUs and 4GB RAM. For heavy workloads, 4 vCPUs and 8–16GB RAM are recommended.
Workflow Complexity: CPU-intensive tasks (like large data transformations or code nodes) or memory-heavy operations (like processing large files) will significantly reduce the requests per minute.
Concurrency Settings: In "Regular Mode," n8n processes everything on one instance. To prevent crashes during traffic spikes, you can set a global limit using the N8N_CONCURRENCY_PRODUCTION_LIMIT environment variable.
Database Performance: Since n8n writes execution data to a database, using PostgreSQL instead of the default SQLite is essential for high-throughput flows.
External API Limits: If your flow calls external services, those services' own rate limits will likely become the bottleneck before n8n does. 
Optimization Tips
Pruning: Enable Automatic Data Pruning to keep the database from slowing down as execution history grows.
Binary Data: If processing large files, switch the binary data mode to filesystem (N8N_DEFAULT_BINARY_DATA_MODE=filesystem) to save RAM.
Monitoring: Use the /metrics endpoint with Prometheus and Grafana to track your "executions per minute" in real-time. 
Would you like a guide on setting up Queue Mode with Redis to handle higher request volumes?
AI responses may include mistakes. Learn more




undefined
undefined
undefined
10 sites
n8n Self-Hosting: What the Docs Can Teach (If You Actually Read ...
19 May 2025 — I gathered my most useful findings from deep inside the n8n documentation. * The Power of Self-Hosting n8n. Explanation. Self-host...

Medium

Performance and benchmarking - n8n Docs
Performance and benchmarking. n8n can handle up to 220 workflow executions per second on a single instance, with the ability to sc...

n8n Docs

Handling API rate limits - n8n Docs
API rate limits are restrictions on request frequency. For example, an API may limit the number of requests you can make per minut...

n8n Docs
Show all
so lets say i have a sync betten my crm and notion, iam gonna use self hosted n8n worf;low fo rthis, leyts say i have 100 user, how much reues is epxected to be and howmuch it can cctually habdle?

my vps is kvm2 hostinger, and i have the other ppa with is the crm it self hosted thier along side n8n
To give you an accurate estimate, we have to look at the "traffic math" vs. your server's "ceiling."
Based on your setup (Hostinger KVM2: 2 vCPU, 4GB RAM) and hosting both the CRM and n8n on the same machine, here is the breakdown:
1. Expected Request Volume
For 100 users syncing between a CRM and Notion, the "requests per minute" isn't constant; it happens in bursts.
Average Usage: If each user updates 10 records a day, that’s only 1,000 requests/day. n8n won't even break a sweat.
Peak Usage: If all 100 users start their workday at 9:00 AM and perform bulk updates, you might see 10–20 requests per second for a few minutes.
The "Webhook Storm": If your CRM sends a webhook to n8n for every field change, a single user could trigger 5 requests in 5 seconds.
2. How much can your KVM2 handle?
Since your CRM and n8n are sharing the same 2 vCPUs, they are fighting for resources.
Mode	Estimated Capacity (on KVM2)	Recommendation
Standard Mode	~30–60 requests/minute	Good for light syncing.
Optimised (Postgres)	~200–500 requests/minute	Use PostgreSQL instead of SQLite.
Queue Mode	1,000+ requests/minute	Overkill for 100 users, but very stable.
[!IMPORTANT]
The real bottleneck for a CRM-to-Notion sync isn't n8n; it is Notion's API limits. Notion enforces a rate limit of 3 requests per second. If n8n sends data faster than that, Notion will reject the requests.
3. Recommended Configuration for your VPS
To ensure your CRM doesn't crash when n8n is busy, I recommend these settings in your .env file:
Database: Do not use SQLite. Use PostgreSQL. It handles concurrent writes much better.
Memory Management: Set N8N_RELEASING_CASES_MEM_LIMIT=3500 to prevent n8n from eating all the RAM and crashing your CRM.
Execution Data: Set EXECUTIONS_DATA_SAVE_ON_SUCCESS=none. This prevents the database from bloating and saves massive amounts of CPU/Disk I/O.
Concurrency Control: Set N8N_CONCURRENCY_PRODUCTION_LIMIT=5. This ensures n8n only processes 5 syncs at a exact same time, leaving the rest of the CPU power for your CRM users.
The Verdict
Can it handle 100 users?
Yes. As long as you aren't doing "bulk imports" of 10,000 leads at once, a KVM2 VPS is plenty for a 100-person team. The CRM and n8n will sit idle most of the time.
Would you like me to show you how to configure the n8n environment variables to limit the CPU usage so your CRM stays fast?
