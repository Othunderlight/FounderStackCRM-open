from django.core.management.base import BaseCommand
from app.models import Person

# 15 realistic last actions matching the CRM style from the post
LAST_ACTIONS = [
    "Hopped on a call to discuss Gulf Software's digital transformation roadmap. She's exploring AI-agent integration for their client portfolio. Call went great—she taught me a lot about enterprise sales cycles in the Gulf region. My internet dropped at the end, sending WhatsApp follow-up with collaboration proposal.",

    "Followed up on Future Tech's reporting dashboard requirements after demo. CTO expressed concerns about data migration complexity from their legacy system. Sent detailed migration plan + ROI breakdown. Vibe: cautious but interested. Next step: technical deep-dive with their dev team next Tuesday.",

    "Connected via LinkedIn at Kuwait Business Summit. Explained CRM-Agent automation concept—she asked about multi-language support for Arabic/English pipelines. Offered sandbox access. Agreed to intro call with sales director. Follow-up scheduled for next week with use-case deck.",

    "Had discovery call about Royal Tech's lead scoring workflow. Developer there is building internal tool, open to API integration instead. Showed live demo of webhook triggers. Very positive—requested API docs and pricing for 10-seat team. Sending technical spec sheet tomorrow.",

    "Post-demo follow-up with Smart Digital ops manager. Pain point: team wasting hours on manual data entry between spreadsheets. Showed unified inbox + auto-logging feature. She loved the simplicity. Agreed to pilot with 3 users. Onboarding call scheduled Thursday.",

    "Cold outreach follow-up via email—shared '5 Follow-Up Mistakes Costing You Deals' one-pager. No response yet, but open rate confirmed. Will try LinkedIn connection request with personalized note about their recent funding round in 4 days.",

    "Discovery call with Desert Innovations founder. He's scaling from 5 to 20 reps and needs pipeline visibility. Showed mobile app + real-time analytics. Impressed by offline mode. Discussed enterprise pricing. Sent proposal with 20% startup discount. Decision by month-end.",

    "Explained CRM-Agent concept via LinkedIn to Smart Systems CTO. Asked about integration with their existing WhatsApp Business setup. Scheduled 30-min technical walkthrough for next week. Sending API documentation + webhook examples in the meantime.",

    "Follow-up call with Future Solutions sales director. Discussed lead routing automation—currently manually assigning leads in spreadsheets. Showed round-robin + rule-based assignment. Positive reaction. Requested demo for team of 12. Scheduling group session for next Monday.",

    "Technical integration call with Smart Systems team in Kuwait. Walked through API endpoints and custom field mapping for their internal dashboard sync. Provided sandbox credentials. Developer confident, expects POC within 2 weeks. Checking in Friday for blockers.",

    "Re-engagement after 2 months silence—reached out with new AI meeting summaries feature announcement. Immediate positive response from Mena Systems product owner. Wants to restart evaluation with updated requirements. Fresh demo scheduled, focusing on activity tracking and reporting.",

    "Negotiation call about enterprise license for Royal Systems. Team grew past 40 users, migrating from Hubspot. Loves our simplicity and pricing. Discussing multi-year contract with custom SLA. Legal reviewing data residency clauses. Closing expected by mid-month.",

    "Closed-won onboarding kickoff 🎉—Smart Systems officially onboarded. Migrated 150 contacts and 30 opportunities. Team training completed, excited about AI-suggested next actions. Set up quarterly business review. Potential case study candidate for GCC market.",

    "Discovery call with Prime Solutions CTO in Cairo. Discussing CRM for their consulting arm—needs client-facing pipeline visibility. Showed custom views and reporting features. Interested but comparing with 2 competitors. Sent comparison doc + case study. Follow-up in 5 days.",

    "Quick coffee chat at Dubai Tech Meetup with Desert Innovations dev team. Discussed pain points with current tool—missing follow-ups, no context switching between deals. Showed mobile app on phone, impressed by last action summaries. Exchanged contacts, scheduling official demo next week.",
]

# Map to the 15 people from CSV (in order)
CONTACTS_DATA = [
    {"name": "Aisha Al-Dossari", "company": "Gulf Software"},
    {"name": "Sara Al-Ghamdi", "company": "Future Tech"},
    {"name": "Huda Al-Otaibi", "company": "Prime Holdings"},
    {"name": "Ibrahim Al-Fahad", "company": "Royal Tech"},
    {"name": "Layla Salem", "company": "Smart Digital"},
    {"name": "Reem Al-Otaibi", "company": "Arab Holdings"},
    {"name": "Youssef Salem", "company": "Desert Innovations"},
    {"name": "Zainab Al-Otaibi", "company": "Smart Systems"},
    {"name": "Salma Al-Harbi", "company": "Future Solutions"},
    {"name": "Salma Al-Harbi", "company": "Smart Systems"},
    {"name": "Ali Al-Dossari", "company": "Desert Innovations"},
    {"name": "Aisha Salem", "company": "Mena Systems"},
    {"name": "Ali Nasser", "company": "Smart Systems"},
    {"name": "Fatima Al-Fahad", "company": "Royal Systems"},
    {"name": "Aisha Al-Mansoori", "company": "Prime Solutions"},
]


class Command(BaseCommand):
    help = "Populate last_action field for demo contacts with realistic CRM entries"

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS("Starting last_action population..."))

        updated_count = 0

        for i, contact in enumerate(CONTACTS_DATA):
            try:
                person = Person.objects.get(
                    name=contact["name"],
                    company__name=contact["company"],
                )
                person.last_action = LAST_ACTIONS[i]
                person.save(update_fields=["last_action"])
                updated_count += 1
                self.stdout.write(f"  ✓ Updated: {contact['name']}")
            except Person.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(
                        f"  ✗ Not found: {contact['name']} @ {contact['company']}"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone! Updated {updated_count}/{len(LAST_ACTIONS)} contacts."
            )
        )
