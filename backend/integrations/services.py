import requests
import json
import time
import hashlib
import hmac
from .models import Webhook, WebhookDelivery

def trigger_webhook_event(organization, event_name, payload):
    """
    Finds active webhooks for the org that subscribe to this event,
    and sends the payload.
    
    In production, this function should just enqueue a task (e.g. via Celery or Inngest)
    to call `send_webhook_request` asynchronously.
    """
    # Filter webhooks for this org
    webhooks = Webhook.objects.filter(organization=organization, is_active=True)
    
    for webhook in webhooks:
        # Check subscription
        # events is a JSON list e.g. ["lead.created", "deal.won"]
        if event_name in webhook.events or '*' in webhook.events:
            # Here we call it synchronously. Replace with async task call in prod.
            send_webhook_request(webhook, event_name, payload)

def send_webhook_request(webhook, event_name, payload):
    """
    Performs the actual HTTP request to the webhook URL.
    """
    start_time = time.time()
    
    # Prepare payload wrapper if needed, or send raw payload
    data_to_send = {
        'event': event_name,
        'payload': payload,
        'occurred_at': time.time()
    }
    json_data = json.dumps(data_to_send)
    
    # Sign the payload using the secret
    signature = hmac.new(
        webhook.secret.encode(),
        json_data.encode(),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        'Content-Type': 'application/json',
        'X-Hub-Signature': f'sha256={signature}',
        'X-Event-Name': event_name
    }
    
    status_code = None
    response_body = ""
    success = False
    
    try:
        response = requests.post(webhook.url, data=json_data, headers=headers, timeout=5)
        status_code = response.status_code
        response_body = response.text[:2000] # Truncate large responses
        success = 200 <= status_code < 300
    except Exception as e:
        status_code = 0
        response_body = str(e)
        success = False
        
    duration = int((time.time() - start_time) * 1000)
    
    # Log the delivery
    WebhookDelivery.objects.create(
        organization=webhook.organization,
        webhook=webhook,
        event=event_name,
        payload=payload, # Store original payload or full data_to_send
        status_code=status_code,
        response_body=response_body,
        success=success,
        duration_ms=duration
    )


from datetime import datetime
import uuid
import decimal
from django.apps import apps
from django.utils import timezone
from app.models import TenantModel


def build_tenant_backup_data(organization, since=None):
    """
    Builds a dictionary of model names and their records.
    If since is provided, it only fetches records updated after that date.
    """
    data = {
        'models': {},
        'metadata': {
            'organization_id': str(organization.id),
            'organization_name': organization.name,
            'generated_at': timezone.now().isoformat(),
            'since': since.isoformat() if since else None,
        }
    }

    # Include models from both 'app' and 'dashboard'
    target_apps = ['app', 'dashboard']
    exclude_models = ['syncrecord', 'synclog']

    for app_label in target_apps:
        for model in apps.get_app_config(app_label).get_models():
            model_name = model._meta.model_name
            if model_name in exclude_models:
                continue
                
            if not issubclass(model, TenantModel) or model._meta.abstract:
                continue

            queryset = model.objects.filter(organization=organization)
            if since:
                queryset = queryset.filter(updated_at__gt=since)

            rows = list(queryset.values())
            for row in rows:
                for key, value in list(row.items()):
                    if isinstance(value, datetime):
                        row[key] = value.isoformat()
                    elif hasattr(value, 'isoformat'):
                        row[key] = value.isoformat()
                    elif isinstance(value, uuid.UUID):
                        row[key] = str(value)
                    elif isinstance(value, decimal.Decimal):
                        row[key] = str(value)

            if rows or not since: # Always include the model key if it's a full backup
                data['models'][model_name] = rows

    return data


def push_backup_to_github(config, backup_data):
    """
    Push changed files to GitHub in a single atomic commit.
    Uses:
    1. Get latest commit SHA
    2. Create a Tree with multiple file blobs (only for changed files)
    3. Create a Commit pointing to the new Tree
    4. Update the branch reference
    """
    repo_path = f"{config.github_username}/{config.repo_name}" if "/" not in config.repo_name else config.repo_name
    api_url = f"https://api.github.com/repos/{repo_path}"
    
    headers = {
        "Authorization": f"token {config.github_access_token}",
        "Accept": "application/vnd.github.v3+json",
    }

    # 1. Get the current branch reference (latest commit SHA)
    ref_res = requests.get(f"{api_url}/git/ref/heads/{config.branch_name}", headers=headers)
    if ref_res.status_code != 200:
        return False, f"Could not find branch {config.branch_name}: {ref_res.text}"
    
    latest_commit_sha = ref_res.json()['object']['sha']

    # 2. Prepare the tree nodes (files)
    tree_nodes = []
    
    # Metadata file
    org_json_content = json.dumps(backup_data['metadata'], indent=2, ensure_ascii=False)
    if _has_file_changed(api_url, "backups/org.json", org_json_content, config.branch_name, headers):
        tree_nodes.append({
            "path": "backups/org.json",
            "mode": "100644",
            "type": "blob",
            "content": org_json_content
        })

    # Model files
    for model_name, records in backup_data['models'].items():
        file_path = f"backups/models/{model_name}.json"
        content = json.dumps(records, indent=2, ensure_ascii=False)
        
        if _has_file_changed(api_url, file_path, content, config.branch_name, headers):
            tree_nodes.append({
                "path": file_path,
                "mode": "100644",
                "type": "blob",
                "content": content
            })

    if not tree_nodes:
        return True, "No changes detected. Skipping backup."

    # 3. Create a new Tree
    tree_payload = {
        "base_tree": latest_commit_sha,
        "tree": tree_nodes
    }
    tree_res = requests.post(f"{api_url}/git/trees", headers=headers, json=tree_payload)
    if tree_res.status_code != 201:
        return False, f"Failed to create tree: {tree_res.text}"
    
    new_tree_sha = tree_res.json()['sha']

    # 4. Create a Commit
    commit_payload = {
        "message": f"Automated backup for {config.organization.name} at {timezone.now().isoformat()}",
        "tree": new_tree_sha,
        "parents": [latest_commit_sha]
    }
    commit_res = requests.post(f"{api_url}/git/commits", headers=headers, json=commit_payload)
    if commit_res.status_code != 201:
        return False, f"Failed to create commit: {commit_res.text}"
    
    new_commit_sha = commit_res.json()['sha']

    # 5. Update the Reference
    ref_payload = {"sha": new_commit_sha}
    update_res = requests.patch(f"{api_url}/git/refs/heads/{config.branch_name}", headers=headers, json=ref_payload)
    
    if update_res.status_code == 200:
        config.last_backup_at = timezone.now()
        config.save()
        return True, f"Successfully created single commit {new_commit_sha} with {len(tree_nodes)} files."
    else:
        return False, f"Failed to update reference: {update_res.text}"

def _has_file_changed(api_url, path, new_content, branch, headers):
    """Compares new content with the existing file on GitHub to avoid redundant updates."""
    url = f"{api_url}/contents/{path}?ref={branch}"
    res = requests.get(url, headers=headers)
    
    if res.status_code != 200:
        return True # File doesn't exist yet, so it changed
        
    # GitHub returns the content in base64
    import base64
    remote_content_b64 = res.json().get('content', '').replace('\n', '')
    try:
        remote_content = base64.b64decode(remote_content_b64).decode('utf-8')
    except Exception:
        return True

    # Simple string comparison (JSON is already pretty-printed identically)
    return remote_content != new_content
