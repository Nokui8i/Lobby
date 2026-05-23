import {
  applyFeedSearchFilters,
  DEFAULT_FEED_SORT_ID,
  EMPTY_FEED_SEARCH_FILTERS,
  sortFeedListings,
  type FeedSearchFilters,
  type FeedSortId,
} from "./feedFilters";
import type { RentalListing } from "./types";

const DEMO_PREFIX = "demo-feed-";

const DEMO_PUBLISHER: RentalListing["publisher"] = {
  id: "demo-publisher",
  displayName: "מפרסם לדוגמה",
  responseTimeLabel: "תגובה מהירה",
};

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

type DemoSeed = {
  n: number;
  title: string;
  city: string;
  neighborhood: string;
  streetHint: string;
  priceIls: number;
  rooms: number;
  sizeSqm: number;
  floor: number;
  totalFloors: number;
  image: string;
  features: RentalListing["features"];
  publishedDaysAgo: number;
};

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=960&h=540&q=80`;

const DEMO_SEEDS: DemoSeed[] = [
  {
    n: 1,
    title: "דירת 3 חדרים מוארת",
    city: "תל אביב",
    neighborhood: "פלורנטין",
    streetHint: "רחוב הארבעה",
    priceIls: 7200,
    rooms: 3,
    sizeSqm: 78,
    floor: 3,
    totalFloors: 5,
    image: UNSPLASH("photo-1522708323590-d24dbb6b0267"),
    features: ["elevator", "balcony", "airConditioning"],
    publishedDaysAgo: 1,
  },
  {
    n: 2,
    title: "סטודיו מעוצב ליד הים",
    city: "תל אביב",
    neighborhood: "הצפון הישן",
    streetHint: "בן יהודה",
    priceIls: 5400,
    rooms: 2,
    sizeSqm: 42,
    floor: 2,
    totalFloors: 4,
    image: UNSPLASH("photo-1502672260266-1c1ef2d93688"),
    features: ["furnished", "renovated"],
    publishedDaysAgo: 2,
  },
  {
    n: 3,
    title: "4 חדרים עם מרפסת שמש",
    city: "רמת גן",
    neighborhood: "מרום נווה",
    streetHint: "הרצל",
    priceIls: 6800,
    rooms: 4,
    sizeSqm: 96,
    floor: 6,
    totalFloors: 9,
    image: UNSPLASH("photo-1560448204-e02f11c3d0e2"),
    features: ["parking", "elevator", "mamad"],
    publishedDaysAgo: 0,
  },
  {
    n: 4,
    title: "דירה משופצת בקומה גבוהה",
    city: "גבעתיים",
    neighborhood: "בורוכוב",
    streetHint: "ויצמן",
    priceIls: 7500,
    rooms: 3.5,
    sizeSqm: 88,
    floor: 8,
    totalFloors: 10,
    image: UNSPLASH("photo-1493809842364-78817add7ffb"),
    features: ["elevator", "renovated", "airConditioning"],
    publishedDaysAgo: 3,
  },
  {
    n: 5,
    title: "3 חדרים שקטים",
    city: "חיפה",
    neighborhood: "כרמל",
    streetHint: "יוסף",
    priceIls: 4200,
    rooms: 3,
    sizeSqm: 72,
    floor: 1,
    totalFloors: 4,
    image: UNSPLASH("photo-1484154218962-a197022b5858"),
    features: ["balcony", "parking"],
    publishedDaysAgo: 4,
  },
  {
    n: 6,
    title: "דירת גן מרווחת",
    city: "הרצליה",
    neighborhood: "הרצליה פיתוח",
    streetHint: "סוקולוב",
    priceIls: 9800,
    rooms: 5,
    sizeSqm: 120,
    floor: 0,
    totalFloors: 2,
    image: UNSPLASH("photo-1600585152915-d208bec867a1"),
    features: ["parking", "mamad", "pets"],
    publishedDaysAgo: 1,
  },
  {
    n: 7,
    title: "2.5 חדרים לזוג צעיר",
    city: "תל אביב",
    neighborhood: "נווה צדק",
    streetHint: "שבזי",
    priceIls: 6100,
    rooms: 2.5,
    sizeSqm: 58,
    floor: 2,
    totalFloors: 3,
    image: UNSPLASH("photo-1505693416388-ac5ce068fe85"),
    features: ["furnished", "balcony"],
    publishedDaysAgo: 5,
  },
  {
    n: 8,
    title: "פנטהאוז עם נוף פתוח",
    city: "ראשון לציון",
    neighborhood: "נווה דקלים",
    streetHint: "הרצל",
    priceIls: 8900,
    rooms: 4,
    sizeSqm: 110,
    floor: 12,
    totalFloors: 12,
    image: UNSPLASH("photo-1600596542815-ffad4c1539a9"),
    features: ["elevator", "parking", "airConditioning"],
    publishedDaysAgo: 2,
  },
  {
    n: 9,
    title: "דירה מרוהטת מוכנה לכניסה",
    city: "ירושלים",
    neighborhood: "טלביה",
    streetHint: "רחביה",
    priceIls: 6500,
    rooms: 3,
    sizeSqm: 70,
    floor: 4,
    totalFloors: 6,
    image: UNSPLASH("photo-1600607687939-ce8a6c25118c"),
    features: ["furnished", "elevator", "mamad"],
    publishedDaysAgo: 6,
  },
  {
    n: 10,
    title: "3 חדרים ליד פארק",
    city: "פתח תקווה",
    neighborhood: "כפר גנים",
    streetHint: "חיים עוזר",
    priceIls: 5200,
    rooms: 3,
    sizeSqm: 76,
    floor: 3,
    totalFloors: 7,
    image: UNSPLASH("photo-1600585154340-be6161a56a0c"),
    features: ["parking", "balcony"],
    publishedDaysAgo: 3,
  },
  {
    n: 11,
    title: "סטודיו חדש בבניין",
    city: "תל אביב",
    neighborhood: "הצפון החדש",
    streetHint: "אבן גבירול",
    priceIls: 4800,
    rooms: 2,
    sizeSqm: 38,
    floor: 5,
    totalFloors: 8,
    image: UNSPLASH("photo-1522708323590-d24dbb6b0267"),
    features: ["elevator", "renovated"],
    publishedDaysAgo: 0,
  },
  {
    n: 12,
    title: "4.5 חדרים משפחתית",
    city: "חולון",
    neighborhood: "אגרוב",
    streetHint: "סוקולוב",
    priceIls: 5800,
    rooms: 4.5,
    sizeSqm: 105,
    floor: 2,
    totalFloors: 4,
    image: UNSPLASH("photo-1493809842364-78817add7ffb"),
    features: ["parking", "mamad", "balcony"],
    publishedDaysAgo: 7,
  },
  {
    n: 13,
    title: "דירה מוארת עם מעלית",
    city: "באר שבע",
    neighborhood: "נווה מנחם",
    streetHint: "הרצוג",
    priceIls: 3200,
    rooms: 3,
    sizeSqm: 68,
    floor: 5,
    totalFloors: 8,
    image: UNSPLASH("photo-1484154218962-a197022b5858"),
    features: ["elevator", "airConditioning"],
    publishedDaysAgo: 4,
  },
  {
    n: 14,
    title: "3 חדרים ליד תחבורה",
    city: "נתניה",
    neighborhood: "קרית השרון",
    streetHint: "הרצל",
    priceIls: 4500,
    rooms: 3,
    sizeSqm: 74,
    floor: 4,
    totalFloors: 6,
    image: UNSPLASH("photo-1505693416388-ac5ce068fe85"),
    features: ["parking", "balcony"],
    publishedDaysAgo: 2,
  },
  {
    n: 15,
    title: "דירת גג עם מרפסת",
    city: "תל אביב",
    neighborhood: "לב תל אביב",
    streetHint: "לילינבלום",
    priceIls: 8200,
    rooms: 3,
    sizeSqm: 82,
    floor: 7,
    totalFloors: 7,
    image: UNSPLASH("photo-1600596542815-ffad4c1539a9"),
    features: ["renovated", "balcony", "airConditioning"],
    publishedDaysAgo: 1,
  },
  {
    n: 16,
    title: "2 חדרים קומפקטי",
    city: "רמת השרון",
    neighborhood: "מרכז",
    streetHint: "אחוזה",
    priceIls: 5600,
    rooms: 2,
    sizeSqm: 48,
    floor: 1,
    totalFloors: 3,
    image: UNSPLASH("photo-1600607687939-ce8a6c25118c"),
    features: ["parking"],
    publishedDaysAgo: 8,
  },
  {
    n: 17,
    title: "5 חדרים בבית צמוד",
    city: "מודיעין",
    neighborhood: "בוכמן",
    streetHint: "הנחל",
    priceIls: 6400,
    rooms: 5,
    sizeSqm: 130,
    floor: 0,
    totalFloors: 2,
    image: UNSPLASH("photo-1600585152915-d208bec867a1"),
    features: ["parking", "mamad", "pets", "balcony"],
    publishedDaysAgo: 5,
  },
  {
    n: 18,
    title: "3 חדרים משופצת",
    city: "אשדוד",
    neighborhood: "רובע יא",
    streetHint: "הציונות",
    priceIls: 3800,
    rooms: 3,
    sizeSqm: 80,
    floor: 3,
    totalFloors: 5,
    image: UNSPLASH("photo-1600585154340-be6161a56a0c"),
    features: ["elevator", "renovated"],
    publishedDaysAgo: 3,
  },
  {
    n: 19,
    title: "דירה שקטה עם חניה",
    city: "כפר סבא",
    neighborhood: "כפר סבא הירוקה",
    streetHint: "ויצמן",
    priceIls: 5900,
    rooms: 4,
    sizeSqm: 92,
    floor: 2,
    totalFloors: 5,
    image: UNSPLASH("photo-1600566752355-35792bedcfea"),
    features: ["parking", "mamad", "balcony"],
    publishedDaysAgo: 6,
  },
  {
    n: 20,
    title: "סטודיו מרכזי",
    city: "תל אביב",
    neighborhood: "הקריה",
    streetHint: "יהודה הלוי",
    priceIls: 5100,
    rooms: 2,
    sizeSqm: 40,
    floor: 4,
    totalFloors: 6,
    image: UNSPLASH("photo-1502672260266-1c1ef2d93688"),
    features: ["furnished", "airConditioning"],
    publishedDaysAgo: 0,
  },
  {
    n: 21,
    title: "3.5 חדרים מרווח",
    city: "הוד השרון",
    neighborhood: "מגדיאל",
    streetHint: "הפארק",
    priceIls: 6200,
    rooms: 3.5,
    sizeSqm: 90,
    floor: 3,
    totalFloors: 5,
    image: UNSPLASH("photo-1600585154340-be6161a56a0c"),
    features: ["parking", "elevator", "balcony"],
    publishedDaysAgo: 2,
  },
  {
    n: 22,
    title: "דירה חדשה מקבלן",
    city: "ראש העין",
    neighborhood: "פסגות אפק",
    streetHint: "אליעזר",
    priceIls: 5400,
    rooms: 3,
    sizeSqm: 84,
    floor: 5,
    totalFloors: 9,
    image: UNSPLASH("photo-1600566752355-35792bedcfea"),
    features: ["elevator", "mamad", "parking"],
    publishedDaysAgo: 1,
  },
  {
    n: 23,
    title: "4 חדרים ליד בתי ספר",
    city: "רעננה",
    neighborhood: "לב הפארק",
    streetHint: "אחוזת רעננה",
    priceIls: 7100,
    rooms: 4,
    sizeSqm: 98,
    floor: 2,
    totalFloors: 4,
    image: UNSPLASH("photo-1522708323590-d24dbb6b0267"),
    features: ["parking", "balcony", "pets"],
    publishedDaysAgo: 4,
  },
  {
    n: 24,
    title: "3 חדרים עם נוף לים",
    city: "חיפה",
    neighborhood: "דניה",
    streetHint: "הנשיא",
    priceIls: 4600,
    rooms: 3,
    sizeSqm: 75,
    floor: 7,
    totalFloors: 10,
    image: UNSPLASH("photo-1560448204-e02f11c3d0e2"),
    features: ["elevator", "airConditioning", "balcony"],
    publishedDaysAgo: 3,
  },
];

function seedToListing(seed: DemoSeed): RentalListing {
  const id = `${DEMO_PREFIX}${seed.n}`;
  const gallery = [seed.image];
  return {
    id,
    title: seed.title,
    city: seed.city,
    neighborhood: seed.neighborhood,
    streetHint: seed.streetHint,
    streetLine: seed.streetHint,
    propertyTypeId: "apartment",
    propertyTypeLabel: "דירה",
    priceIls: seed.priceIls,
    rooms: seed.rooms,
    sizeSqm: seed.sizeSqm,
    floor: seed.floor,
    totalFloors: seed.totalFloors,
    entryDate: isoDaysFromNow(14),
    imageUrl: seed.image,
    gallery,
    features: seed.features,
    description: "מודעת הדגמה להצגה — לובי, ללא תיווך.",
    status: "active",
    publishedAt: isoDaysAgo(seed.publishedDaysAgo),
    expiresAt: isoDaysFromNow(26),
    publisher: DEMO_PUBLISHER,
  };
}

const HOME_FEED_DEMO_LISTINGS: RentalListing[] = DEMO_SEEDS.map(seedToListing);

export function isHomeFeedDemoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LOBBY_HOME_DEMO_FEED === "true";
}

export function isHomeFeedDemoListingId(listingId: string): boolean {
  return listingId.startsWith(DEMO_PREFIX);
}

export function getHomeFeedDemoListings(): RentalListing[] {
  return HOME_FEED_DEMO_LISTINGS;
}

export function getHomeFeedDemoListingById(listingId: string): RentalListing | null {
  if (!isHomeFeedDemoListingId(listingId)) {
    return null;
  }
  return HOME_FEED_DEMO_LISTINGS.find((l) => l.id === listingId) ?? null;
}

/** ממלא את הפיד לדמו — מודעות אמיתיות קודם, אחר כך דמו (בלי לדרוס באנרים). */
export function mergeFeedWithHomeDemoListings(
  remote: RentalListing[],
  filters: FeedSearchFilters = EMPTY_FEED_SEARCH_FILTERS,
  sortId: FeedSortId = DEFAULT_FEED_SORT_ID,
): RentalListing[] {
  if (!isHomeFeedDemoEnabled()) {
    return sortFeedListings(applyFeedSearchFilters(remote, filters), sortId);
  }
  const seen = new Set(remote.map((l) => l.id));
  let extra = HOME_FEED_DEMO_LISTINGS.filter((d) => !seen.has(d.id));
  extra = applyFeedSearchFilters(extra, filters);
  const merged = applyFeedSearchFilters([...remote, ...extra], filters).slice(0, 48);
  return sortFeedListings(merged, sortId);
}

export const HOME_FEED_DEMO_INITIAL_VISIBLE = 24;
export const HOME_FEED_DEMO_LOAD_STEP = 12;
