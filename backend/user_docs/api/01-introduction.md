# Introduction

Welcome to the FounderStack CRM API. This API allows you to integrate your CRM data with third-party tools like n8n, Zapier, or your own custom applications.

## Base URL
All API requests should be made to:
`https://your-api.example.com/api/`

If you are developing locally, use:
`http://127.0.0.1:8000/api/`

## Multi-tenancy & Security
The API is built with multi-tenancy at its core. Your API Key is linked to your Organization. You will only ever see or modify data that belongs to your team.

## Response Format
All data is returned in JSON format. Lists are paginated by default.
