from datetime import timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from app.models import Person, ActivityLog
from dashboard.models import InteractionType, InteractionLog
from django.contrib.auth import get_user_model

User = get_user_model()


INTERACTION_TYPES = [
    {"name": "Send Connection Request", "description": "Sent LinkedIn connection request", "color": "#0a66c2", "icon": "linkedin"},
    {"name": "Cold Outreach", "description": "First outreach attempt", "color": "#f59e0b", "icon": "send"},
    {"name": "Responded", "description": "Contact responded to outreach", "color": "#22c55e", "icon": "message-circle"},
    {"name": "Booked Meeting", "description": "Scheduled a meeting or call", "color": "#8b5cf6", "icon": "calendar"},
    {"name": "Showed Call", "description": "Attended a call or demo", "color": "#10b981", "icon": "video"},
    {"name": "Follow-up", "description": "Followed up on a previous interaction", "color": "#3b82f6", "icon": "repeat"},
]


class Command(BaseCommand):
    help = "Populate realistic demo timelines for all contacts"

    def handle(self, *args, **kwargs):
        user = User.objects.get(email="demo@founderstack.com")

        interaction_types = {}
        for d in INTERACTION_TYPES:
            it, _ = InteractionType.objects.get_or_create(
                organization=user.organization, name=d["name"],
                defaults={"description": d["description"], "color": d["color"], "icon": d["icon"]},
            )
            interaction_types[d["name"]] = it

        people = Person.objects.filter(created_by=user).select_related("company")

        total_act = 0
        total_int = 0
        for p in people:
            events = build_events(p)
            for e in events:
                activity = ActivityLog.objects.create(
                    organization=p.organization, type=e["atype"], channel=e["channel"],
                    direction=e["direction"], title=e["title"], content=e["content"],
                    date=e["date"], related_person=p, related_company=p.company, user=user,
                )
                InteractionLog.objects.create(
                    organization=p.organization, interaction_type=interaction_types[e["itype"]],
                    notes=e["summary"], date=e["date"], related_person=p,
                    related_company=p.company, activity_log=activity, created_by=user,
                )
                total_act += 1
                total_int += 1
            self.stdout.write(f"  {p.name} ({p.stage}): {len(events)} events")

        self.stdout.write(f"\nDone! {total_act} ActivityLogs + {total_int} InteractionLogs across {people.count()} people.")


def ev(itype, atype, channel, direction, title, content, summary, days_ago):
    return {
        "itype": itype, "atype": atype, "channel": channel, "direction": direction,
        "title": title, "content": content, "summary": summary,
        "date": timezone.now() - timedelta(days=days_ago),
    }


def build_events(person):
    now = timezone.now()
    n = person.name.split()[0]
    c = person.company.name if person.company else "their company"
    stage = person.stage

    if stage == "Closed":
        return _closed(n, c)
    elif stage == "Negotiation":
        return _negotiation(n, c)
    elif stage == "Qualified":
        return _qualified(n, c)
    elif stage == "Lost":
        return _lost(n, c)
    else:
        return _lead(n, c, person.conversion_rate)


def _closed(n, c):
    return [
        ev("Send Connection Request", ActivityLog.Type.LINKEDIN_MSG, ActivityLog.Channel.LINKEDIN, ActivityLog.Direction.SENT,
           "LinkedIn connection request", f'Sent connection request to {n}.', f"Connected with {n} on LinkedIn", 40),
        ev("Cold Outreach", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
           "Cold outreach email", f"Sent intro email about FounderStack to {n} at {c}.", f"Sent cold email — no reply yet", 35),
        ev("Cold Outreach", ActivityLog.Type.WHATSAPP_MSG, ActivityLog.Channel.WHATSAPP, ActivityLog.Direction.SENT,
           "WhatsApp follow-up", f'"Hey {n}, just checking if you saw my email."', f"WhatsApp nudge — {n} replied", 30),
        ev("Responded", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.RECEIVED,
           f"{n} replied", f'{n}: "This looks interesting, tell me more."', f"{n} responded positively", 29),
        ev("Booked Meeting", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
           "Discovery call scheduled", f"Sent Calendly link. {n} booked a slot.", "Discovery call booked", 25),
        ev("Showed Call", ActivityLog.Type.CALL, ActivityLog.Channel.SYSTEM, ActivityLog.Direction.SENT,
           "Discovery call — 25 min", f"Great call with {n}. Shared pain points. Showed quick demo.", f"25-min discovery — strong interest", 22),
        ev("Showed Call", ActivityLog.Type.MEETING, ActivityLog.Channel.SYSTEM, ActivityLog.Direction.SENT,
           "Team demo — 45 min", f"Full team demo with {c}. Pipeline, AI actions, reporting.", f"45-min team demo — very positive", 15),
        ev("Follow-up", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
           "Sent proposal", f"Sent custom proposal with pricing for {c}.", f"Proposal sent — reviewing", 10),
        ev("Follow-up", ActivityLog.Type.CALL, ActivityLog.Channel.SYSTEM, ActivityLog.Direction.SENT,
           "Negotiation call", f"Discussed pricing. {n} wants annual discount. Approved.", f"Pricing negotiated", 5),
        ev("Showed Call", ActivityLog.Type.CALL, ActivityLog.Channel.SYSTEM, ActivityLog.Direction.SENT,
           "Closed won!", f"{n} signed! {c} is onboarded.", f"Deal closed — contract signed!", 1),
    ]


def _negotiation(n, c):
    return [
        ev("Send Connection Request", ActivityLog.Type.LINKEDIN_MSG, ActivityLog.Channel.LINKEDIN, ActivityLog.Direction.SENT,
           "LinkedIn connection request", f'Sent connection request to {n}.', f"Connected with {n} on LinkedIn", 30),
        ev("Cold Outreach", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
           "Cold outreach email", f"Sent intro email about FounderStack to {n} at {c}.", f"Sent cold email", 25),
        ev("Responded", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.RECEIVED,
           f"{n} replied", f'{n}: "Sounds interesting, let\'s talk."', f"{n} responded", 22),
        ev("Booked Meeting", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
           "Meeting scheduled", f"Booked discovery call with {n}.", "Discovery call booked", 18),
        ev("Showed Call", ActivityLog.Type.CALL, ActivityLog.Channel.SYSTEM, ActivityLog.Direction.SENT,
           "Discovery call — 30 min", f"30-min call. Discussed {c}'s needs. Scheduled team demo.", f"30-min discovery — team demo scheduled", 14),
        ev("Showed Call", ActivityLog.Type.MEETING, ActivityLog.Channel.SYSTEM, ActivityLog.Direction.SENT,
           "Team demo — 40 min", f"Full demo for {c} team. Strong engagement.", f"40-min team demo — engaged", 8),
        ev("Follow-up", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
           "Sent proposal", f"Sent proposal to {n} for {c}.", f"Proposal sent — negotiating", 4),
        ev("Follow-up", ActivityLog.Type.CALL, ActivityLog.Channel.SYSTEM, ActivityLog.Direction.SENT,
           "Negotiation call", f"Pricing discussion with {n}. Working through terms.", f"Active negotiation", 1),
    ]


def _qualified(n, c):
    return [
        ev("Send Connection Request", ActivityLog.Type.LINKEDIN_MSG, ActivityLog.Channel.LINKEDIN, ActivityLog.Direction.SENT,
           "LinkedIn connection request", f'Sent connection request to {n}.', f"Connected with {n} on LinkedIn", 25),
        ev("Cold Outreach", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
           "Cold outreach email", f"Sent intro email about FounderStack to {n} at {c}.", f"Sent cold email", 20),
        ev("Responded", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.RECEIVED,
           f"{n} replied", f'{n}: "Would love to see a demo."', f"{n} responded — wants demo", 17),
        ev("Booked Meeting", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
           "Demo scheduled", f"Booked demo with {n}.", "Demo booked", 14),
        ev("Showed Call", ActivityLog.Type.CALL, ActivityLog.Channel.SYSTEM, ActivityLog.Direction.SENT,
           "Discovery call — 20 min", f"20-min call. {n} interested. Team demo being scheduled.", f"20-min discovery — qualified", 8),
        ev("Follow-up", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
           "Follow-up with case study", f"Sent relevant case study to {n}.", f"Sent case study — awaiting team demo", 3),
    ]


def _lost(n, c):
    return [
        ev("Send Connection Request", ActivityLog.Type.LINKEDIN_MSG, ActivityLog.Channel.LINKEDIN, ActivityLog.Direction.SENT,
           "LinkedIn connection request", f'Sent connection request to {n}.', f"Connected with {n} on LinkedIn", 35),
        ev("Cold Outreach", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
           "Cold outreach email", f"Sent intro email to {n} at {c}.", f"Sent cold email", 28),
        ev("Responded", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.RECEIVED,
           f"{n} replied — not interested", f'{n}: "We renewed with our current CRM, not looking to switch."', f"Responded but not interested", 25),
        ev("Follow-up", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
           "Graceful exit", f"Replied graciously, set reminder to revisit in 6 months.", f"Lost — renewed with current CRM", 22),
    ]


def _lead(n, c, conv):
    if conv >= 50:
        return [
            ev("Send Connection Request", ActivityLog.Type.LINKEDIN_MSG, ActivityLog.Channel.LINKEDIN, ActivityLog.Direction.SENT,
               "LinkedIn connection request", f'Sent connection request to {n}.', f"Connected with {n} on LinkedIn", 18),
            ev("Cold Outreach", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
               "Cold outreach email", f"Sent intro email to {n} at {c}.", f"Sent cold email — waiting for reply", 14),
            ev("Follow-up", ActivityLog.Type.WHATSAPP_MSG, ActivityLog.Channel.WHATSAPP, ActivityLog.Direction.SENT,
               "WhatsApp follow-up", f'"Hey {n}, checking in on my email."', f"WhatsApp follow-up — no reply yet", 7),
        ]
    else:
        return [
            ev("Send Connection Request", ActivityLog.Type.LINKEDIN_MSG, ActivityLog.Channel.LINKEDIN, ActivityLog.Direction.SENT,
               "LinkedIn connection request", f'Sent connection request to {n}.', f"Connected with {n} on LinkedIn", 20),
            ev("Cold Outreach", ActivityLog.Type.EMAIL, ActivityLog.Channel.EMAIL, ActivityLog.Direction.SENT,
               "Cold outreach email", f"Sent intro email to {n} at {c}.", f"Sent cold email — no response yet", 15),
        ]
