# Planning Center Scripts

Scripts for fetching data from the Planning Center API.

## Setup

1. Install dependencies:
   ```bash
   cd scripts/planning-center
   npm install
   ```

2. Create a `.env` file with your Planning Center credentials:
   ```bash
   PLANNING_CENTER_APP_ID=your_app_id_here
   PLANNING_CENTER_SECRET=your_secret_here
   ```

## Getting Planning Center API Credentials

1. Log in to your Planning Center account
2. Go to https://api.planningcenteronline.com/oauth/applications
3. Create a new Personal Access Token
4. Copy the Application ID and Secret

## Scripts

### fetch-events.ts

Fetches upcoming events from both Planning Center Calendar and Registrations APIs and saves them to `site/data/events.json` as a flattened, sorted array for use in the Hugo site.

**Usage:**
```bash
# From the scripts/planning-center directory:
npm run fetch-events

# Or using tsx directly:
tsx fetch-events.ts

# Or from the project root:
cd scripts/planning-center && npm run fetch-events
```

**Environment Variables:**
- `PLANNING_CENTER_APP_ID` - Your Planning Center Application ID (required)
- `PLANNING_CENTER_SECRET` - Your Planning Center Secret (required)

**Data Sources:**
- **Calendar API**: Event instances from the Calendar app (recurring events are flattened to individual instances)
- **Registrations API**: Signup events from the Registrations app

**Output:**
The script creates `site/data/events.json` with the following structure:
```json
{
  "last_updated": "2025-10-25T...",
  "count": 25,
  "events": [
    {
      "source": "calendar",
      "event_id": "12345",
      "instance_id": "67890",
      "name": "Sunday Service",
      "description": "Join us for worship...",
      "summary": "Weekly worship service",
      "category": "Service",
      "location": "Main Sanctuary",
      "image_url": "https://...",
      "registration_url": "https://...",
      "visible_in_church_center": true,
      "starts_at": "2025-10-27T10:00:00Z",
      "ends_at": "2025-10-27T11:30:00Z",
      "all_day_event": false,
      "created_at": "2025-01-01T...",
      "updated_at": "2025-01-15T..."
    },
    {
      "source": "registrations",
      "event_id": "54321",
      "name": "Women's Retreat",
      "description": "Annual retreat for women...",
      "summary": null,
      "category": null,
      "location": "Camp Location",
      "image_url": null,
      "registration_url": "https://...",
      "visible_in_church_center": true,
      "starts_at": "2025-11-01T09:00:00Z",
      "ends_at": "2025-11-03T16:00:00Z",
      "all_day_event": false,
      "created_at": "2025-01-10T...",
      "updated_at": "2025-01-20T..."
    }
  ]
}
```

**Notes:**
- Events are returned as a flat array, sorted chronologically by `starts_at`
- Calendar events with multiple instances are flattened (each instance is a separate event)
- The `source` field indicates whether the event came from "calendar" or "registrations"
- Calendar events include an `instance_id` field; registration events do not

## Using in Hugo

Once the events data is saved to `site/data/events.json`, you can access it in your Hugo templates. The events are provided as a flat, chronologically sorted array:

```html
{{ range .Site.Data.events.events }}
  <div class="event">
    <h3>{{ .name }}</h3>
    <p>{{ .description }}</p>
    <time datetime="{{ .starts_at }}">
      {{ dateFormat "Monday, January 2, 2006 at 3:04 PM" .starts_at }}
    </time>
    {{ if .ends_at }}
      <span> - {{ dateFormat "3:04 PM" .ends_at }}</span>
    {{ end }}
    {{ if .location }}
      <p class="location">{{ .location }}</p>
    {{ end }}
    {{ if .registration_url }}
      <a href="{{ .registration_url }}" class="register-btn">Register</a>
    {{ end }}
    <span class="source">Source: {{ .source }}</span>
  </div>
{{ end }}
```

**Filter by source:**
```html
<!-- Only show calendar events -->
{{ range .Site.Data.events.events }}
  {{ if eq .source "calendar" }}
    <!-- ... -->
  {{ end }}
{{ end }}

<!-- Only show registration events -->
{{ range .Site.Data.events.events }}
  {{ if eq .source "registrations" }}
    <!-- ... -->
  {{ end }}
{{ end }}
```

## Automation

You can automate this script to run periodically using:

- **Cron job**: Add to your crontab to run daily
- **CI/CD**: Run as part of your build process (e.g., Netlify build command)
- **GitHub Actions**: Schedule to run and commit updates

Example Netlify build command:
```bash
cd scripts/planning-center && npm install && npm run fetch-events && cd ../.. && hugo --minify
```
