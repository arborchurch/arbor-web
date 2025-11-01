#!/usr/bin/env tsx

/**
 * Fetch calendar events from Planning Center API and save to Hugo data file
 * 
 * Environment Variables Required:
 * - PLANNING_CENTER_APP_ID: Your Planning Center Application ID
 * - PLANNING_CENTER_SECRET: Your Planning Center Secret
 */

import fetch from 'node-fetch';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PLANNING_CENTER_APP_ID = process.env.PLANNING_CENTER_APP_ID;
const PLANNING_CENTER_SECRET = process.env.PLANNING_CENTER_SECRET;
const CALENDAR_API_BASE_URL = 'https://api.planningcenteronline.com/calendar/v2';
const OUTPUT_FILE = join(__dirname, '../../site/data/calendar.json');

interface CalendarEvent {
  id: string;
  name: string;
  description: string | null;
  summary: string | null;
  category: string | null;
  location: string | null;
  image_url: string | null;
  registration_url: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day_event: boolean;
  visible_in_church_center: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  if (!PLANNING_CENTER_APP_ID || !PLANNING_CENTER_SECRET) {
    console.error('Error: Missing required environment variables');
    console.error('Please set:');
    console.error('  - PLANNING_CENTER_APP_ID');
    console.error('  - PLANNING_CENTER_SECRET');
    process.exit(1);
  }
}

/**
 * Create auth header for Planning Center API
 */
function getAuthHeader(): string {
  return Buffer.from(
    `${PLANNING_CENTER_APP_ID}:${PLANNING_CENTER_SECRET}`
  ).toString('base64');
}

/**
 * Fetch calendar event instances from Planning Center API
 */
async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const authString = getAuthHeader();
  const url = `${CALENDAR_API_BASE_URL}/event_instances?filter=future&per_page=100&order=starts_at&include=event`;
  
  console.log('Fetching calendar events from Planning Center...');
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch calendar events: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const data = await response.json() as any;
  console.log(`Fetched ${data.data?.length || 0} calendar event instances`);
  
  return processCalendarEvents(data);
}

/**
 * Process calendar events and flatten to individual instances
 */
function processCalendarEvents(response: any): CalendarEvent[] {
  const eventsMap = new Map<string, any>();
  
  // Create a map of events by ID from the included resources
  if (response.included) {
    for (const item of response.included) {
      if (item.type === 'Event') {
        eventsMap.set(item.id, item);
      }
    }
  }

  // Flatten event instances
  const events: CalendarEvent[] = [];
  const now = new Date();
  
  for (const instance of response.data) {
    if (instance.type === 'EventInstance') {
      const eventId = instance.relationships?.event?.data?.id;
      const event = eventId ? eventsMap.get(eventId) : null;
      
      if (event) {
        // Filter: only include visible, non-archived events
        if (!event.attributes.visible_in_church_center || event.attributes.archived_at) {
          continue;
        }
        
        // Filter: skip events that have already ended
        const endsAt = instance.attributes.ends_at 
          ? new Date(instance.attributes.ends_at)
          : new Date(instance.attributes.starts_at);
        
        if (endsAt < now) {
          continue;
        }
        
        events.push({
          id: instance.id,
          name: event.attributes.name,
          description: event.attributes.description,
          summary: event.attributes.summary,
          category: event.attributes.category,
          location: instance.attributes.location || event.attributes.location,
          image_url: event.attributes.image_url,
          registration_url: event.attributes.registration_url,
          starts_at: instance.attributes.starts_at,
          ends_at: instance.attributes.ends_at,
          all_day_event: instance.attributes.all_day_event,
          visible_in_church_center: event.attributes.visible_in_church_center,
          created_at: event.attributes.created_at,
          updated_at: event.attributes.updated_at,
        });
      }
    }
  }

  console.log(`Processed ${events.length} calendar events (filtered for future, visible events)`);
  return events;
}

/**
 * Save events to JSON file
 */
function saveEvents(events: CalendarEvent[]): void {
  // Ensure the directory exists
  const dir = dirname(OUTPUT_FILE);
  mkdirSync(dir, { recursive: true });

  // Sort events by start date
  const sortedEvents = events.sort((a, b) => 
    new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  // Write the JSON file with a flat list
  writeFileSync(OUTPUT_FILE, JSON.stringify(sortedEvents, null, 2), 'utf-8');
  console.log(`\nSaved ${sortedEvents.length} events to ${OUTPUT_FILE}`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    validateEnvironment();
    
    const events = await fetchCalendarEvents();
    saveEvents(events);
    
    console.log('✓ Successfully fetched and saved calendar events');
  } catch (error) {
    console.error('Error fetching events:', error);
    process.exit(1);
  }
}

// Run the script
main();
