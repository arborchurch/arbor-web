#!/usr/bin/env tsx

/**
 * Fetch events from Planning Center API and save to Hugo data file
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
const REGISTRATIONS_API_BASE_URL = 'https://api.planningcenteronline.com/registrations/v2';
const OUTPUT_FILE = join(__dirname, '../../site/data/events.json');

interface PlanningCenterEvent {
  type: string;
  id: string;
  attributes: {
    archived_at: string | null;
    category: string | null;
    created_at: string;
    description: string | null;
    image_url: string | null;
    location: string | null;
    name: string;
    percent_approved: number;
    percent_rejected: number;
    registration_url: string | null;
    summary: string | null;
    updated_at: string;
    visible_in_church_center: boolean;
  };
}

interface EventInstance {
  type: string;
  id: string;
  attributes: {
    all_day_event: boolean;
    created_at: string;
    ends_at: string | null;
    location: string | null;
    starts_at: string;
    updated_at: string;
  };
  relationships?: {
    event?: {
      data?: {
        type: string;
        id: string;
      };
    };
  };
}

interface RegistrationSignup {
  type: string;
  id: string;
  attributes: {
    archived: boolean;
    close_at: string | null;
    description: string | null;
    logo_url: string | null;
    name: string;
    new_registration_url: string | null;
    open_at: string | null;
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    event?: {
      data?: {
        type: string;
        id: string;
      };
    };
  };
}

interface RegistrationEvent {
  type: string;
  id: string;
  attributes: {
    name: string;
    description: string | null;
    logo: string | null;
    summary: string | null;
    visible_in_church_center: boolean;
    banner_image_url: string | null;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    created_at: string;
    updated_at: string;
  };
}

interface FlattenedEvent {
  source: 'calendar' | 'registrations';
  event_id: string;
  instance_id?: string;
  name: string;
  description: string | null;
  summary: string | null;
  category: string | null;
  location: string | null;
  image_url: string | null;
  registration_url: string | null;
  visible_in_church_center: boolean;
  starts_at: string;
  ends_at: string | null;
  all_day_event: boolean;
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
async function fetchCalendarEvents(): Promise<any> {
  const authString = getAuthHeader();
  const url = `${CALENDAR_API_BASE_URL}/event_instances?filter=future&per_page=100&order=starts_at&include=event`;
  
  console.log('Fetching calendar event instances from Planning Center...');
  
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
  
  return data;
}

/**
 * Fetch registration events (signups) from Planning Center API
 */
async function fetchRegistrationSignups(): Promise<any> {
  const authString = getAuthHeader();
  const allSignups: any[] = [];
  const allIncluded: any[] = [];
  let offset = 0;
  const perPage = 100;
  let hasMore = true;
  
  console.log('Fetching registration signups from Planning Center...');
  
  while (hasMore) {
    const url = `${REGISTRATIONS_API_BASE_URL}/signups?per_page=${perPage}&offset=${offset}&include=event`;
    
    console.log(`  Fetching page at offset ${offset}...`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch registration signups: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data = await response.json() as any;
    const fetchedCount = data.data?.length || 0;
    
    console.log(`  Fetched ${fetchedCount} signups`);
    
    if (fetchedCount === 0) {
      hasMore = false;
    } else {
      allSignups.push(...data.data);
      if (data.included) {
        allIncluded.push(...data.included);
      }
      
      // Check if there are more pages
      if (fetchedCount < perPage) {
        hasMore = false;
      } else {
        offset += perPage;
      }
    }
  }
  
  console.log(`Fetched total of ${allSignups.length} registration signups across all pages`);
  
  return {
    data: allSignups,
    included: allIncluded,
  };
}

/**
 * Process calendar events and flatten to individual instances
 */
function processCalendarEvents(response: any): FlattenedEvent[] {
  const eventsMap = new Map<string, PlanningCenterEvent>();
  
  // Create a map of events by ID from the included resources
  if (response.included) {
    for (const item of response.included) {
      if (item.type === 'Event') {
        eventsMap.set(item.id, item);
      }
    }
  }

  // Flatten event instances
  const flattenedEvents: FlattenedEvent[] = [];
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
        
        flattenedEvents.push({
          source: 'calendar',
          event_id: event.id,
          instance_id: instance.id,
          name: event.attributes.name,
          description: event.attributes.description,
          summary: event.attributes.summary,
          category: event.attributes.category,
          location: instance.attributes.location || event.attributes.location,
          image_url: event.attributes.image_url,
          registration_url: event.attributes.registration_url,
          visible_in_church_center: event.attributes.visible_in_church_center,
          starts_at: instance.attributes.starts_at,
          ends_at: instance.attributes.ends_at,
          all_day_event: instance.attributes.all_day_event,
          created_at: event.attributes.created_at,
          updated_at: event.attributes.updated_at,
        });
      }
    }
  }

  console.log(`Processed ${flattenedEvents.length} calendar event instances (filtered)`);
  return flattenedEvents;
}

/**
 * Process registration signups and merge with event data
 */
function processRegistrationSignups(response: any): FlattenedEvent[] {
  const eventsMap = new Map<string, RegistrationEvent>();
  
  // Create a map of events by ID from the included resources
  if (response.included) {
    for (const item of response.included) {
      if (item.type === 'Event') {
        eventsMap.set(item.id, item);
      }
    }
  }

  const flattenedEvents: FlattenedEvent[] = [];
  const now = new Date();
  let filtered = { archived: 0, notOpen: 0, closed: 0, eventPassed: 0, visibility: 0 };
  
  console.log(`\nProcessing ${response.data?.length || 0} signups...`);
  
  for (const signup of response.data) {
    if (signup.type === 'Signup') {
      console.log(`\n  Signup: ${signup.attributes.name}`);
      console.log(`    Archived: ${signup.attributes.archived}`);
      console.log(`    Opens at: ${signup.attributes.open_at}`);
      console.log(`    Closes at: ${signup.attributes.close_at}`);
      
      // Filter: skip archived signups
      if (signup.attributes.archived) {
        console.log(`    ❌ Filtered: archived`);
        filtered.archived++;
        continue;
      }
      
      // Filter: check if signup has opened yet
      if (signup.attributes.open_at) {
        const openAt = new Date(signup.attributes.open_at);
        if (openAt > now) {
          console.log(`    ❌ Filtered: not open yet`);
          filtered.notOpen++;
          continue;
        }
      }
      
      // Filter: check if signup has closed
      if (signup.attributes.close_at) {
        const closeAt = new Date(signup.attributes.close_at);
        if (closeAt < now) {
          console.log(`    ❌ Filtered: signup has closed`);
          filtered.closed++;
          continue;
        }
      }
      
      // Get associated event for additional metadata
      const eventId = signup.relationships?.event?.data?.id;
      const event = eventId ? eventsMap.get(eventId) : null;
      
      console.log(`    Event ID: ${eventId}, Found: ${!!event}`);
      
      if (event) {
        console.log(`    Event starts: ${event.attributes.starts_at}`);
        console.log(`    Event visible: ${event.attributes.visible_in_church_center}`);
        
        // Filter: skip if the event itself has already passed
        const eventStartsAt = new Date(event.attributes.starts_at);
        if (eventStartsAt < now) {
          console.log(`    ❌ Filtered: event has already started/passed`);
          filtered.eventPassed++;
          continue;
        }
        
        // Filter: only include if visible in church center (from event)
        if (!event.attributes.visible_in_church_center) {
          console.log(`    ❌ Filtered: event not visible in church center`);
          filtered.visibility++;
          continue;
        }
      }
      
      console.log(`    ✅ Including signup`);
      
      // Merge signup and event data
      flattenedEvents.push({
        source: 'registrations',
        event_id: signup.id,
        name: signup.attributes.name,
        // Prefer event description if available, fallback to signup description
        description: event?.attributes.description || signup.attributes.description,
        summary: event?.attributes.summary || null,
        category: null,
        location: event?.attributes.location || null,
        // Use event banner/logo if available, then signup logo
        image_url: event?.attributes.banner_image_url || event?.attributes.logo || signup.attributes.logo_url || null,
        registration_url: signup.attributes.new_registration_url,
        visible_in_church_center: event?.attributes.visible_in_church_center ?? true,
        starts_at: event?.attributes.starts_at || signup.attributes.open_at || signup.attributes.created_at,
        ends_at: event?.attributes.ends_at || null,
        all_day_event: false,
        created_at: event?.attributes.created_at || signup.attributes.created_at,
        updated_at: event?.attributes.updated_at || signup.attributes.updated_at,
      });
    }
  }

  console.log(`\nFiltered out:`);
  console.log(`  - Archived: ${filtered.archived}`);
  console.log(`  - Not open yet: ${filtered.notOpen}`);
  console.log(`  - Signup closed: ${filtered.closed}`);
  console.log(`  - Event passed: ${filtered.eventPassed}`);
  console.log(`  - Not visible: ${filtered.visibility}`);
  console.log(`Processed ${flattenedEvents.length} registration signups (filtered)`);
  return flattenedEvents;
}

/**
 * Save events to JSON file
 */
function saveEvents(events: FlattenedEvent[]): void {
  // Ensure the directory exists
  const dir = dirname(OUTPUT_FILE);
  mkdirSync(dir, { recursive: true });

  // Sort events by start date
  const sortedEvents = events.sort((a, b) => 
    new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  // Write the JSON file
  const output = {
    last_updated: new Date().toISOString(),
    count: sortedEvents.length,
    events: sortedEvents,
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nSaved ${sortedEvents.length} events to ${OUTPUT_FILE}`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    validateEnvironment();
    
    // Fetch from both APIs
    const [calendarResponse, registrationResponse] = await Promise.all([
      fetchCalendarEvents(),
      fetchRegistrationSignups(),
    ]);
    
    // Process both sources
    const calendarEvents = processCalendarEvents(calendarResponse);
    const registrationEvents = processRegistrationSignups(registrationResponse);
    
    // Combine all events
    const allEvents = [...calendarEvents, ...registrationEvents];
    
    console.log(`\nTotal events: ${allEvents.length}`);
    console.log(`  - Calendar: ${calendarEvents.length}`);
    console.log(`  - Registrations: ${registrationEvents.length}`);
    
    saveEvents(allEvents);
    
    console.log('✓ Successfully fetched and saved events');
  } catch (error) {
    console.error('Error fetching events:', error);
    process.exit(1);
  }
}

// Run the script
main();
