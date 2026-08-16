import {
  Soup, Sandwich, Pizza, CupSoda, Coffee, GlassWater, Salad, IceCreamCone,
  CakeSlice, Drumstick, Fish, Egg, Popcorn, UtensilsCrossed, Beef, Hamburger,
  Croissant, Cookie, Milk, Wine, Beer, Donut, Candy,
} from 'lucide-react';

/**
 * Local keyword -> icon mapping for the Dine-In display.
 *
 * Purely presentational and derived from data the order already carries
 * (item name, plus a category field when the API happens to send one).
 * No request, field, or backend change is required for this to work.
 *
 * Order matters: the first match wins, so more specific dishes are listed
 * before the broader bowl/meat fallbacks.
 */
const ICON_RULES = [
  // Drinks
  [/\b(coke|cola|pepsi|sprite|fanta|soda|thum(s|ps|bs)?\s*up|limca|mirinda|maaza|frooti|cold\s*drink|soft\s*drink|drink|juice|shake|lassi|smoothie|mojito)\b/, CupSoda],
  [/\b(coffee|tea|chai|latte|cappuccino|espresso|mocha|americano)\b/, Coffee],
  [/\b(water|mineral)\b/, GlassWater],
  [/\b(beer|lager|cider)\b/, Beer],
  [/\b(wine|sangria)\b/, Wine],
  [/\b(milk|badam)\b/, Milk],

  // Mains by form
  [/\b(pizza)\b/, Pizza],
  [/\b(burger)\b/, Hamburger],
  [/\b(sandwich|sandwhich|toastie|toast|wrap|roll|frankie|shawarma|kathi)\b/, Sandwich],
  [/\b(momo|dumpling|dimsum|dim\s*sum|bao|wonton|gyoza)\b/, Soup],
  [/\b(soup|shorba|broth)\b/, Soup],
  [/\b(noodle|chowmein|chow\s*mein|pasta|spaghetti|macaroni|penne|ramen|hakka)\b/, Soup],
  [/\b(salad|sprout|coleslaw)\b/, Salad],
  [/\b(rice|biryani|biriyani|pulao|pilaf)\b/, Soup],

  // Proteins
  [/\b(chicken|keema|qeema|mutton|lamb|kebab|kabab|tikka|tandoori|seekh|drumstick|wings)\b/, Drumstick],
  [/\b(beef|steak|bacon)\b/, Beef],
  [/\b(fish|prawn|shrimp|seafood|crab)\b/, Fish],
  [/\b(egg|omelette|omelet|bhurji)\b/, Egg],

  // Sides and sweets
  [/\b(fries|chips|nachos|popcorn|wedges|snack)\b/, Popcorn],
  [/\b(ice\s*cream|icecream|kulfi|gelato|sundae)\b/, IceCreamCone],
  [/\b(cake|pastry|brownie|muffin|cupcake|tart)\b/, CakeSlice],
  [/\b(cookie|biscuit)\b/, Cookie],
  [/\b(donut|doughnut)\b/, Donut],
  [/\b(sweet|dessert|halwa|gulab|jamun|rasgulla|candy|chocolate)\b/, Candy],
  [/\b(bread|bun|pav|naan|roti|paratha|kulcha|croissant|garlic\s*bread)\b/, Croissant],
];

export const DEFAULT_ITEM_ICON = UtensilsCrossed;

/**
 * Pick a lightweight outline icon for an order item.
 * Falls back to a generic plate/cutlery icon when nothing matches.
 */
export function getItemIcon(item) {
  if (!item) return DEFAULT_ITEM_ICON;

  const haystack = [
    item.name,
    item.category,
    item.category_name,
    item.categoryName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!haystack) return DEFAULT_ITEM_ICON;

  for (const [pattern, Icon] of ICON_RULES) {
    if (pattern.test(haystack)) return Icon;
  }

  return DEFAULT_ITEM_ICON;
}
