import p1 from "@/assets/property-1.jpg";
import p2 from "@/assets/property-2.jpg";
import p3 from "@/assets/property-3.jpg";
import p4 from "@/assets/property-4.jpg";
import p5 from "@/assets/property-5.jpg";
import p6 from "@/assets/property-6.jpg";

export type Property = {
  id: string;
  title: string;
  city: string;
  neighborhood: string;
  price: number;
  rooms: number;
  size: number;
  floor: string;
  type: "דירה" | "בית פרטי" | "פנטהאוז" | "סטודיו";
  tags: string[];
  image: string;
  gallery: string[];
  seller: { name: string; rating: number; since: string };
  description: string;
};

export const properties: Property[] = [
  {
    id: "1",
    title: "דירת 4 חדרים מוארת עם נוף פתוח",
    city: "תל אביב",
    neighborhood: "הצפון הישן",
    price: 4250000,
    rooms: 4,
    size: 102,
    floor: "3 מתוך 6",
    type: "דירה",
    tags: ["מעלית", "חניה", "ממ\"ד", "מרפסת"],
    image: p1,
    gallery: [p1, p4, p3, p5],
    seller: { name: "נועה לוי", rating: 4.9, since: "2022" },
    description: "דירה מדהימה במיקום מרכזי, עם תאורה טבעית לכל אורך היום, מטבח משודרג ומרפסת שמש פונה לדרום.",
  },
  {
    id: "2",
    title: "בית פרטי עם גינה גדולה",
    city: "הרצליה",
    neighborhood: "הרצליה פיתוח",
    price: 8900000,
    rooms: 6,
    size: 240,
    floor: "—",
    type: "בית פרטי",
    tags: ["גינה", "בריכה", "חניה כפולה", "ממ\"ד"],
    image: p2,
    gallery: [p2, p6, p1, p4],
    seller: { name: "אבי כהן", rating: 4.8, since: "2019" },
    description: "בית מרווח ושקט עם גינה מטופחת, מתאים למשפחות הרוצות איכות חיים גבוהה במיקום פסטורלי.",
  },
  {
    id: "3",
    title: "דירת 3 חדרים מעוצבת בקפידה",
    city: "רמת גן",
    neighborhood: "המרכז",
    price: 2780000,
    rooms: 3,
    size: 78,
    floor: "2 מתוך 4",
    type: "דירה",
    tags: ["מעלית", "מזגן", "מחסן"],
    image: p3,
    gallery: [p3, p1, p4],
    seller: { name: "מאי גרין", rating: 5.0, since: "2023" },
    description: "דירה מעוצבת ברמה גבוהה, קרובה לפארקים ולתחבורה ציבורית, במצב מצוין להכנסה מיידית.",
  },
  {
    id: "4",
    title: "פנטהאוז יוקרתי עם נוף עיר",
    city: "תל אביב",
    neighborhood: "פלורנטין",
    price: 6450000,
    rooms: 5,
    size: 145,
    floor: "12 מתוך 12",
    type: "פנטהאוז",
    tags: ["מעלית", "חניה", "מרפסת גג", "ג'קוזי"],
    image: p5,
    gallery: [p5, p1, p4],
    seller: { name: "דניאל אור", rating: 4.7, since: "2021" },
    description: "פנטהאוז ייחודי עם מרפסת גג פנורמית, מטבח שף, מערכת חכמה ופרטיות מוחלטת.",
  },
  {
    id: "5",
    title: "סטודיו מעוצב במיקום מנצח",
    city: "ירושלים",
    neighborhood: "המושבה הגרמנית",
    price: 1690000,
    rooms: 1.5,
    size: 42,
    floor: "1 מתוך 3",
    type: "סטודיו",
    tags: ["מזגן", "מרוהט"],
    image: p4,
    gallery: [p4, p3, p1],
    seller: { name: "תמר רז", rating: 4.6, since: "2024" },
    description: "סטודיו אינטימי בלב המושבה הגרמנית, מתאים לסטודנטים או להשקעה לטווח קצר.",
  },
  {
    id: "6",
    title: "בית קוטג' למשפחה במיקום שקט",
    city: "רעננה",
    neighborhood: "השכונה הירוקה",
    price: 5320000,
    rooms: 5,
    size: 180,
    floor: "—",
    type: "בית פרטי",
    tags: ["גינה", "חניה", "ממ\"ד", "סולארי"],
    image: p6,
    gallery: [p6, p2, p1],
    seller: { name: "יואב שמש", rating: 4.9, since: "2020" },
    description: "קוטג' מרווח ברחוב שקט, קרוב לבתי ספר מובילים, פארקים ומרכזי קניות.",
  },
];

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);