#!/usr/bin/env tsx

/**
 * Fetch FEATURED events from Planning Center API and save to Hugo data file
 * 
 * This script finds events tagged as "Featured" in Planning Center Calendar,
 * downloads their images, and saves the event data to a JSON file.
 * 
 * Environment Variables Required:
 * - PLANNING_CENTER_APP_ID: Your Planning Center Application ID
 * - PLANNING_CENTER_SECRET: Your Planning Center Secret
 */

import fetch from 'node-fetch';
import { writeFileSync, mkdirSync, existsSync, createWriteStream } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PLANNING_CENTER_APP_ID = process.env.PLANNING_CENTER_APP_ID;
const PLANNING_CENTER_SECRET = process.env.PLANNING_CENTER_SECRET;
const CALENDAR_API_BASE_URL = 'https://api.planningcenteronline.com/calendar/v2';
const OUTPUT_FILE = join(__dirname, '../../site/data/events.json');
const IMAGES_DIR = join(__dirname, '../../site/static/events');

interface PlanningCenterEvent {
  type: string;
  id: string;
  attributes: {
    approval_status: string;
    archived_at: string | null;
    created_at: string;
    description: string | null;
    featured: boolean;
    image_url: string | null;
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
    church_center_url: string | null;
    created_at: string;
    ends_at: string | null;
    location: string | null;
    name: string;
    starts_at: string;
    updated_at: string;
    image_url?: string | null;
    description?: string | null;
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

interface FeaturedEvent {
  event_id: string;
  instance_id: string;
  name: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
  local_image: string | null;
  church_center_url: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day_event: boolean;
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
 * Make an authenticated request to Planning Center API
 */
async function apiRequest(url: string): Promise<any> {
  const authString = getAuthHeader();
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  return response.json();
}

/**
 * Fetch future event instances with their parent events
 */
async function fetchFutureEventInstances(): Promise<any> {
  console.log('Fetching future event instances from Planning Center...');
  
  // Get future event instances and include the parent event data
  const url = `${CALENDAR_API_BASE_URL}/event_instances?filter=future&per_page=100&order=starts_at&include=event`;
  
  const data = await apiRequest(url);
  console.log(`Fetched ${data.data?.length || 0} event instances`);
  
  return data;
}

/**
 * Download an image from a URL and save it locally
 */
async function downloadImage(imageUrl: string, eventId: string): Promise<string | null> {
  try {
    // Create images directory if it doesn't exist
    if (!existsSync(IMAGES_DIR)) {
      mkdirSync(IMAGES_DIR, { recursive: true });
      console.log(`Created images directory: ${IMAGES_DIR}`);
    }
    
    // Parse the URL to get extension
    const url = new URL(imageUrl);
    let extension = extname(url.pathname) || '.jpg';
    
    // Clean up extension (remove query params from extension if any)
    extension = extension.split('?')[0];
    if (!extension || extension === '.') {
      extension = '.jpg';
    }
    
    const filename = `event-${eventId}${extension}`;
    const localPath = join(IMAGES_DIR, filename);
    
    // Check if file already exists
    if (existsSync(localPath)) {
      console.log(`  Image already exists: ${filename}`);
      return `/events/${filename}`;
    }
    
    console.log(`  Downloading image: ${filename}`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }
    
    if (!response.body) {
      throw new Error('No response body');
    }
    
    const fileStream = createWriteStream(localPath);
    await pipeline(response.body, fileStream);
    
    console.log(`  ✓ Saved: ${filename}`);
    return `/events/${filename}`;
  } catch (error) {
    console.error(`  ✗ Failed to download image: ${error}`);
    return null;
  }
}

/**
 * Process event instances and create featured events list
 * Only includes events where the parent Event has featured=true
 */
async function processFeaturedEvents(response: any): Promise<FeaturedEvent[]> {
  const eventsMap = new Map<string, PlanningCenterEvent>();
  
  // Create a map of events by ID from the included resources
  if (response.included) {
    for (const item of response.included) {
      if (item.type === 'Event') {
        eventsMap.set(item.id, item);
      }
    }
  }
  
  console.log(`\nFound ${eventsMap.size} unique parent events in included data`);
  
  // Log featured events
  let featuredCount = 0;
  for (const [id, event] of eventsMap) {
    if (event.attributes.featured) {
      featuredCount++;
      console.log(`  Featured: ${event.attributes.name} (id: ${id})`);
    }
  }
  console.log(`Total featured events: ${featuredCount}`);

  const featuredEvents: FeaturedEvent[] = [];
  const now = new Date();
  let skippedNotFeatured = 0;
  
  console.log('\nProcessing events (filtering for featured=true)...');
  
  for (const instance of response.data || []) {
    if (instance.type === 'EventInstance') {
      const eventId = instance.relationships?.event?.data?.id;
      const event = eventId ? eventsMap.get(eventId) : null;
      
      // Skip if we don't have the parent event
      if (!event) {
        continue;
      }
      
      // Skip if not featured
      if (!event.attributes.featured) {
        skippedNotFeatured++;
        continue;
      }
      
      console.log(`\n  Featured Event: ${instance.attributes.name}`);
      console.log(`    Starts: ${instance.attributes.starts_at}`);
      console.log(`    Church Center URL: ${instance.attributes.church_center_url}`);
      
      // Skip events that have already ended
      const endsAt = instance.attributes.ends_at 
        ? new Date(instance.attributes.ends_at)
        : new Date(instance.attributes.starts_at);
      
      if (endsAt < now) {
        console.log(`    ❌ Skipped: Event has ended`);
        continue;
      }
      
      // Check visibility
      if (!event.attributes.visible_in_church_center) {
        console.log(`    ❌ Skipped: Not visible in Church Center`);
        continue;
      }
      if (event.attributes.archived_at) {
        console.log(`    ❌ Skipped: Event is archived`);
        continue;
      }
      
      // Get image URL (prefer instance image, fallback to event image)
      const imageUrl = instance.attributes.image_url || event?.attributes.image_url || null;
      let localImage: string | null = null;
      
      if (imageUrl) {
        console.log(`    Image URL: ${imageUrl}`);
        localImage = await downloadImage(imageUrl, instance.id);
      } else {
        console.log(`    No image available`);
      }
      
      console.log(`    ✅ Including event`);
      
      featuredEvents.push({
        event_id: eventId || instance.id,
        instance_id: instance.id,
        name: instance.attributes.name,
        description: instance.attributes.description || event?.attributes.summary || event?.attributes.description || null,
        location: instance.attributes.location,
        image_url: imageUrl,
        local_image: localImage,
        church_center_url: instance.attributes.church_center_url,
        starts_at: instance.attributes.starts_at,
        ends_at: instance.attributes.ends_at,
        all_day_event: instance.attributes.all_day_event,
      });
    }
  }

  console.log(`\nSkipped ${skippedNotFeatured} non-featured events`);
  console.log(`Processed ${featuredEvents.length} featured events`);
  return featuredEvents;
}

/**
 * Save events to JSON file
 */
function saveEvents(events: FeaturedEvent[]): void {
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
    
    // Fetch all future event instances with their parent events
    const instancesResponse = await fetchFutureEventInstances();
    
    // Process and filter for featured events only
    const featuredEvents = await processFeaturedEvents(instancesResponse);
    
    // Save to JSON file
    saveEvents(featuredEvents);
    
    console.log('\n✓ Successfully fetched and saved featured events');
  } catch (error) {
    console.error('Error fetching events:', error);
    process.exit(1);
  }
}

// Run the script
main();
