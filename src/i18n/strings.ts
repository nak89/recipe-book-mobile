/**
 * Every user-facing string in the app, in both languages.
 *
 * ## The compile-time guarantee
 *
 * `en` is the source of truth for the key set. `Strings` is derived from it, and
 * `km` is annotated with `Strings` — so a key added to `en` and forgotten in `km`
 * is a **build failure**, not a blank label discovered by a user.
 *
 * This is deliberately the same mechanism `theme/palettes.ts` uses to keep the
 * light and dark palettes in step. Same reasoning, same guarantee; don't invent a
 * second pattern for it.
 *
 * ## What does *not* belong here
 *
 * - Recipe content of any kind. The toggle translates chrome and never content.
 * - `(auth)/intro.tsx`'s copy — that screen stays English permanently, because its
 *   editorial serif has no Khmer glyphs and its italic emphasis has no Khmer
 *   equivalent.
 * - `__DEV__`-only strings, such as the profile screen's "Start fresh" button. They
 *   are stripped from release builds, so translating them is pure cost.
 *
 * ## Interpolation
 *
 * Almost none, on purpose. Where a value only ever sits at the *start* or *end*
 * of a phrase in both languages, the call site wraps `t()` in a template literal
 * and no machinery is needed. A general interpolation system for a handful of
 * strings would be more moving parts than the problem.
 *
 * The exception is `{n}`, substituted with a plain `.replace()` at the call site,
 * used only by the `taste.*` count strings — there the number sits *inside* the
 * phrase and English and Khmer don't put it in the same place. If you find
 * yourself adding a third placeholder convention, that's the point to reconsider
 * a library rather than to invent one more.
 */

export const en = {
  // ---------------------------------------------------------------- common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.done': 'Done',
  'common.close': 'Close',
  'common.dismiss': 'Dismiss',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.retry': 'Try again',
  'common.loading': 'Loading',
  'common.continue': 'Continue',
  'common.skipForNow': 'Skip for now',

  // --------------------------------------------------------------- language
  'language.label': 'Language',
  // Language names are written in their own script by convention, so that
  // someone who cannot read the current UI language can still find theirs.
  'language.en': 'English',
  'language.km': 'ខ្មែរ',

  // ---------------------------------------------------------------- profile
  'profile.recipes': 'Recipes',
  'profile.favourites': 'Favourites',
  'profile.totalTime': 'Total time',
  'profile.memberSince': 'Member since',
  'profile.darkMode': 'Dark mode',
  'profile.howItWorks': 'How it works',
  'profile.logOut': 'Log out',
  'profile.logOutTitle': 'Log out?',
  'profile.logOutMessage': "You'll need to sign in again to see your recipes.",
  'profile.yourName': 'Your name',
  'profile.editName': 'Edit display name',
  'profile.nameEmpty': 'Name cannot be empty',
  'profile.nameSaveFailed': 'Could not save name',

  // --------------------------------------------------------- ingredient picker
  'picker.title': 'Common ingredients',
  'picker.search': 'Search ingredients',
  // Rendered as: {picker.noMatch} “{query}” — the verb-then-object order holds
  // in both languages, so one key covers it without an interpolation system.
  'picker.noMatch': 'Nothing matches',
  'picker.noMatchBody': 'Close this and type it into the ingredient row instead — anything is allowed.',

  // --------------------------------------------------------------- tool picker
  'toolPicker.title': 'Common tools',
  'toolPicker.search': 'Search tools',
  'toolPicker.noMatch': 'Nothing matches',
  'toolPicker.noMatchBody': 'Close this and type it into the tools field instead — anything is allowed.',

  // --------------------------------------------------------------- unit picker
  'unitPicker.title': 'Unit',
  'unitPicker.search': 'Search units, or type your own',
  // The blank unit, which is a real choice: you don't measure onions in anything.
  'unitPicker.none': 'No unit',

  // ------------------------------------------------------ onboarding: name
  'name.kicker': 'YOUR NAME',
  'name.title': 'What should we call you?',
  'name.subtitle': 'This is the name you’ll see on your account. You can change it later.',
  'name.label': 'Name',
  'name.placeholder': 'Nak',
  'name.saveFailed': 'Could not save your name',

  // --------------------------------------------------- onboarding: welcome
  'welcome.headline': 'Welcome to your\nKroung Psom',
  'welcome.body':
    'Everything you cook, in one place. Take the sixty-second tour and you will know your way around it.',
  'welcome.takeTour': 'Take the tour',
  // Rendered as: {n} {welcome.quickSteps} — the count leads in both languages.
  'welcome.quickSteps': 'quick steps',

  // ----------------------------------------------------- onboarding: taste
  'taste.kicker': 'YOUR TASTE',
  'taste.title': 'What do you like to cook?',
  'taste.subtitle':
    'Pick any that appeal and we’ll put a few recipes in your book to start with. Everything is yours to edit or delete.',
  // `{n}` is substituted at the call site. This is the only placeholder in the
  // file, and it earns its place: the number sits *inside* the phrase and the two
  // languages don't agree on where. Khmer has no grammatical plural, so its two
  // forms below are identical — the branch only ever does work in English.
  'taste.addOne': 'Add {n} recipe',
  'taste.addMany': 'Add {n} recipes',
  'taste.recipeCount': '{n} recipes',
  'taste.importFailed': 'Could not add those recipes',

  // ------------------------------------------------------------------ auth
  'auth.login.heading': 'Welcome back',
  'auth.login.subheading': 'Sign in to get cooking.',
  'auth.login.submit': 'Log in',
  'auth.login.footer': 'Need an account?',
  'auth.signup.heading': 'Create your recipe book',
  'auth.signup.subheading': 'Save what you cook, all in one place.',
  'auth.signup.submit': 'Sign up',
  'auth.signup.footer': 'Already have an account?',
  'auth.email': 'Email',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.password': 'Password',
  'auth.passwordPlaceholder': 'Enter your password',
  'auth.missingFields': 'Enter your email and password',
  'auth.showPassword': 'Show',
  'auth.hidePassword': 'Hide',
  /** Rendered beside the strength meter — the one rule the form enforces. */
  'auth.passwordHint': '8+ characters',

  // ---------------------------------------------------------------- errors
  // Everything unrecognised lands on `error.generic` rather than leaking the
  // server's English — see `i18n/errors.ts`.
  'error.generic': 'Something went wrong',
  'error.network': 'Could not reach the server. Check your connection.',
  'error.tooManyRequests': 'Too many attempts. Wait a moment and try again.',
  'error.auth.invalidCredentials': 'That email and password don’t match.',
  'error.auth.emailTaken': 'An account with that email already exists.',
  'error.auth.passwordTooShort': 'Your password is too short.',
  'error.auth.invalidEmail': 'That doesn’t look like an email address.',
  'error.auth.emailNotConfirmed': 'Confirm your email address first.',
  'error.api.invalid': 'Something in this recipe isn’t valid.',
  'error.api.sessionExpired': 'Your session has expired. Sign in again.',
  'error.api.forbidden': 'That isn’t yours to change.',
  'error.api.notFound': 'That recipe no longer exists.',
  'error.api.titleTaken': 'You already have a recipe with this title.',
  'error.api.tooLarge': 'This recipe is too big. Shorten it and try again.',
  'error.api.server': 'The server had a problem. Try again shortly.',

  // --------------------------------------------- stored enums (labels only)
  // The values stay English in the database — see i18n/labels.ts.
  'filter.all': 'All',
  'mealtime.breakfast': 'Breakfast',
  'mealtime.lunch': 'Lunch',
  'mealtime.dinner': 'Dinner',
  'mealtime.snack': 'Snack',
  'difficulty.beginner': 'Beginner',
  'difficulty.intermediate': 'Intermediate',
  'difficulty.advanced': 'Advanced',

  // ------------------------------------------------------------- dashboard
  // Rendered as: {dashboard.hello} {name} 👋 — the greeting leads in both.
  'dashboard.hello': 'Hi',
  'dashboard.prompt': 'What do you want to cook today?',
  'dashboard.shuffle': 'Surprise me with a random recipe',
  'dashboard.search': 'Search recipe for cooking',
  'dashboard.favourites': 'Favourites',
  'dashboard.results': 'Results',
  'dashboard.allRecipes': 'All Recipes',
  'dashboard.everythingElse': 'Everything else',
  'dashboard.favouritesOnly': 'Favourites only',
  'dashboard.emptyTitle': 'No recipes yet',
  'dashboard.emptyBody': 'Tap the + button below to add your first one.',
  'dashboard.noMatchTitle': 'Nothing matches',
  'dashboard.noMatchBody': 'Try a different search or filter.',
  'dashboard.deleteTitle': 'Delete this recipe?',
  'dashboard.deleteMessage': 'This cannot be undone.',

  // ---------------------------------------------------------- recipe detail
  'detail.notFound': 'Recipe not found',
  'detail.back': 'Go back',
  'detail.tools': 'Tools',
  'detail.nutrition': 'Nutrition',
  'detail.perServing': 'Per serving',
  'detail.ingredients': 'Ingredients',
  'detail.steps': 'Steps',
  'detail.calories': 'Calories',
  'detail.protein': 'Protein',
  'detail.carbs': 'Carbs',
  'detail.fat': 'Fat',
  'detail.editRecipe': 'Edit recipe',
  'detail.deleteRecipe': 'Delete recipe',
  // Rendered as: {n} {detail.minutes} — the number leads in both languages.
  'detail.minutes': 'min',
  'detail.servings': 'servings',
  'detail.addFavourite': 'Add to favourites',
  'detail.removeFavourite': 'Remove from favourites',

  // ------------------------------------------------------ navigation chrome
  // Titles owned by the Stack in `(app)/_layout.tsx`, not by the screens. Also
  // `headerBackTitle`, which iOS otherwise fills from the previous screen's
  // title — and the detail screen has none, so it has to be stated.
  'nav.newRecipe': 'New Recipe',
  'nav.editRecipe': 'Edit Recipe',
  'nav.recipe': 'Recipe',
  'nav.profile': 'Profile',
  // Deliberately generic. Profile is pushed from all three tabs, so a back
  // button naming one of them would be wrong two thirds of the time.
  'nav.back': 'Back',

  // ---------------------------------------------------------- meal planner
  // The day strip's labels. Three letters in English because seven of them
  // share a row 402pt wide; Khmer uses its own single-syllable day names, which
  // are naturally short, so neither needs truncating.
  'day.mon': 'Mon',
  'day.tue': 'Tue',
  'day.wed': 'Wed',
  'day.thu': 'Thu',
  'day.fri': 'Fri',
  'day.sat': 'Sat',
  'day.sun': 'Sun',
  // Month names, for the same reason the day names are here: the mastheads and
  // the week label used `toLocaleDateString`, which follows the **device**
  // locale rather than the toggle — so a Khmer UI printed `AUGUST ១៥`, a Khmer
  // numeral against an English month, on one line. Forcing `km-KH` instead was
  // the other option and is not safe: Hermes ships a reduced ICU, so it can
  // silently fall back to English, which is the same bug with a longer fuse.
  // Uppercased at the call site, which is a no-op on Khmer.
  'month.1': 'January',
  'month.2': 'February',
  'month.3': 'March',
  'month.4': 'April',
  'month.5': 'May',
  'month.6': 'June',
  'month.7': 'July',
  'month.8': 'August',
  'month.9': 'September',
  'month.10': 'October',
  'month.11': 'November',
  'month.12': 'December',
  'planner.title': 'Meal planner',
  // Two placeholders, which is one more than anything else here needs. The
  // total isn't hardcoded because it's `days × mealtimes` — adding a mealtime
  // would otherwise leave this string quietly lying about the denominator.
  'planner.thisWeek': 'This week',
  'planner.previousWeek': 'Previous week',
  'planner.nextWeek': 'Next week',
  'planner.today': 'Today',
  // Interpolated with the *translated* mealtime label, never the stored value.
  'planner.addSlot': 'Add {meal}',
  'planner.change': 'Change recipe',
  'planner.clear': 'Clear this slot',
  'planner.pickTitle': 'Plan {meal}',
  'planner.pickSearch': 'Search your recipes',
  'planner.emptyTitle': 'Nothing planned yet',
  'planner.emptyBody': 'Tap a slot to choose something to cook.',
  'planner.noRecipesTitle': 'No recipes to plan',
  'planner.noRecipesBody': 'Add a recipe first, then come back to plan your week.',

  // -------------------------------------------------------------- tutorial
  'tutorial.startCooking': 'Start cooking',

  // ------------------------------------------------------- shared controls
  'select.placeholder': 'Select',
  'select.search': 'Search',
  'select.none': 'None',
  'select.orTypeYourOwn': 'or type your own',
  // Both rendered as: {key} “{typed text}” — same one-key-plus-template trick
  // as `picker.noMatch`, and the same reason it works in both languages.
  'select.use': 'Use',
  'select.noMatch': 'Nothing matches',
  'search.placeholder': 'Search recipes',
  'search.clear': 'Clear search',
  'tabs.recipes': 'Recipes',
  // Dock-only (`TabBar.tsx` is the sole consumer), and the dock is four equal
  // columns: Explore / Recipes / Grocery are all seven characters and 'Meal
  // planner' was twelve, so it truncated to "MEAL PLA…" at 375pt and below —
  // uppercased and tracked at .18em it needs ~89pt in a ~78pt column. The
  // screen itself still calls the destination "The Week".
  'tabs.planner': 'Planner',
  'tabs.addRecipe': 'Add recipe',
  'tabs.grocery': 'Grocery',
  'tabs.addIngredient': 'Add an ingredient',

  // ── Grocery ───────────────────────────────────────────────────────────────
  'grocery.title': 'Grocery',
  'grocery.stillToBuy': '{n} still to buy',
  'grocery.scopeWeek': 'This week',
  'grocery.scopeDay': 'Today',
  'grocery.scopeMissing': 'Missing only',
  'grocery.addedByYou': 'Added by you',
  /**
   * The section every ticked row sinks into, at the foot of the list.
   *
   * Its own key rather than `market.gathered`, which is the tail of a
   * sentence (`12 / 18 gathered`) and reads as a fragment on a header rule.
   */
  'grocery.gathered': 'Gathered',
  'grocery.aisleProduce': 'Produce',
  'grocery.aisleProtein': 'Protein',
  'grocery.aislePantry': 'Pantry',
  'grocery.aisleOther': 'Other',
  'grocery.composerName': 'Ingredient',
  'grocery.composerAmount': 'Amount',
  'grocery.composerUnit': 'Unit',
  'grocery.composerAdd': 'Add',
  'grocery.composerClose': 'Close',
  'grocery.emptyTitle': 'Nothing to buy yet',
  'grocery.emptyBody': 'Plan a meal for this week and its ingredients land here.',
  'grocery.emptyMissingTitle': 'Everything gathered',
  // Deliberately not "this week's list": the same message stands when the list
  // is narrowed to one dish, and naming the week there would be a small lie.
  'grocery.emptyMissingBody': 'Nothing left to gather.',
  // Narrowed to a day with nothing planned on it. Distinct from the week being
  // empty: the list has things in it, they just aren't for this day.
  'grocery.emptyDayTitle': 'Nothing planned for this day',
  'grocery.emptyDayBody': 'Switch to This week to see the rest of the list.',
  // ── The dish filter ──
  'grocery.allDishes': 'All dishes',
  'grocery.filterByDish': 'Filter by dish',
  /** The overflow badge — how many chips are still off the right of the row. */
  'grocery.moreDishes': '{n} more dishes',
  'grocery.emptyDishTitle': 'Nothing here for this dish',
  'grocery.emptyDishBody': 'Switch to All dishes to see the rest of the list.',
  'grocery.less': 'Less {name}',
  'grocery.more': 'More {name}',
  'grocery.resetAmount': 'Back to the planned amount',
  'grocery.remove': 'Remove {name}',

  // ------------------------------------------------ operations that can fail
  'error.loadRecipes': 'Failed to load recipes',
  'error.refreshRecipes': 'Failed to refresh recipes',
  'error.loadRecipe': 'Failed to load recipe',
  'error.deleteRecipe': 'Failed to delete recipe',
  'error.favourite': 'Could not update favourite',
  'error.savePlan': 'Could not save that meal',
  'error.clearPlan': 'Could not clear that slot',
  'error.saveGrocery': 'Could not update that item',
  'error.clearGrocery': 'Could not remove that item',

  // ----------------------------------------------------------- recipe form
  // The form's submit button. Passed in as a *key* by each route, so the two
  // labels can't drift from the two ways of arriving at the form.
  'form.addRecipe': 'Add recipe',
  'form.saveChanges': 'Save changes',
  'form.step.basics': 'Basics',
  'form.step.ingredients': 'Ingredients',
  'form.step.steps': 'Steps',
  'form.step.nutrition': 'Nutrition',
  'form.photoPermission': 'Allow photo library access to add a photo.',
  'form.photoFailed': 'That photo could not be uploaded.',
  'form.saveFailed': 'Could not save this recipe. Please try again.',
  'form.changePhoto': 'Change photo',
  'form.addPhoto': 'Add a photo',
  'form.change': 'Change',
  'form.title': 'Title',
  'form.titlePlaceholder': 'e.g. Spaghetti Carbonara',
  'form.description': 'Description',
  'form.descriptionPlaceholder': 'e.g. Classic Italian pasta with egg and pancetta',
  'form.mealtime': 'Mealtime',
  'form.difficulty': 'Difficulty',
  'form.totalMinutes': 'Total minutes',
  'form.totalMinutesPlaceholder': 'e.g. 30',
  'form.servings': 'Servings',
  'form.servingsPlaceholder': 'e.g. 4',
  'form.cuisine': 'Cuisine',
  'form.cuisinePlaceholder': 'Select a cuisine',
  'form.cuisineSearch': 'Search cuisines',
  'form.tools': 'Tools',
  'form.toolsPlaceholder': 'e.g. large pot, frying pan',
  'form.toolsHint': 'Separate with commas',
  'form.pickTools': 'Pick from common tools',
  'form.pickToolsHint': 'Frying pan, blender, baking tray…',
  'form.ingredientsHeading': 'What goes in?',
  'form.pickCommon': 'Pick from common ingredients',
  'form.pickCommonHint': 'Garlic, soy sauce, rice…',
  'form.added': 'Added',
  'form.ingredientPlaceholder': 'Ingredient',
  'form.unitPlaceholder': 'unit',
  'form.addYourOwn': 'Add your own',
  'form.noIngredients': 'No ingredients yet — pick some above, or add your own below.',
  'form.stepsHeading': 'How is it made?',
  'form.stepPlaceholder': 'e.g. Boil the pasta until al dente',
  'form.removeStep': 'Remove step',
  'form.removeIngredient': 'Remove ingredient',
  'form.reorder': 'Drag to reorder',
  'form.addStep': 'Add step',
  'form.noSteps': 'No steps yet — add the first one below.',
  // The timer chip on a method step. SCREENS.md § 17 draws it as a dashed
  // `⏱ ADD TIMER` when unset and a filled tamarind `⏱ 10:00` when set, and
  // names this screen as where cook mode's timers come from.
  'form.addTimer': 'ADD TIMER',
  'form.stepTimer': 'Step timer',
  'form.stepTimerHint': 'Cook mode counts this down for you while you cook.',
  'form.noTimer': 'No timer',
  'form.hoursShort': 'h',
  'form.minutesShort': 'min',
  'form.secondsShort': 's',
  // The heading carries "per serving" on its own: there is no line under it
  // any more, and the four columns are bare floats that can't say which
  // convention they were typed in. The Khmer below has to do the same work —
  // its old wording only said "nutrition information".
  'form.nutritionHeading': 'What’s in a serving?',
  'form.calories': 'Calories',
  'form.protein': 'Protein',
  'form.carbs': 'Carbs',
  'form.fat': 'Fat',

  // ------------------------------------------------------------ validation
  // `{n}` / `{field}` are substituted by recipeValidation.ts. A red outline is
  // the message for anything ordinary — these only cover what an outline can't
  // say, which is why there are far fewer of them than there are rules.
  'validation.tooBig': 'This recipe is {n}KB — the limit is {max}KB. Shorten the description or remove some steps.',
  'validation.wholeNumber': '{field} must be a whole number.',
  'validation.mustBeNumber': '{field} must be a number.',
  'validation.amountsNumbers': 'Amounts must be numbers.',
  'validation.titleTooLong': 'Title is too long ({n} characters max).',
  'validation.descriptionWords': 'Description is too long ({n} words max).',
  'validation.descriptionChars': 'Description is too long ({n} characters max).',
  'validation.tooManyTools': 'Too many tools ({n} max).',
  'validation.toolTooLong': 'Separate tools with commas — one of them is too long.',
  'validation.tooManyIngredients': 'Too many ingredients ({n} max).',
  'validation.tooManySteps': 'Too many steps ({n} max).',
  'validation.stepTooLong': 'A step can’t be longer than {n} characters.',
  'validation.fillHighlighted': 'Fill in the highlighted fields.',
  'validation.checkHighlighted': 'Check the highlighted fields.',

  // ================================================================ Chronicle
  // Copy for the reworked screens. SCREENS.md marks its UI copy **final in both
  // languages** — where it gives a Khmer string, the value below is that string
  // verbatim, and it must not be "improved".
  //
  // ⚠ Where it gives only English, the Khmer below is written here and is
  // **owed a native reader**. Those keys are listed in `KHMER_NEEDS_REVIEW` in
  // `tests/strings.test.ts` so the debt is enumerated in one place rather than
  // spread through comments.

  // ------------------------------------------------------ masthead & wordmark
  'brand.wordmark': 'Hearth',

  // ------------------------------------------------------------ recipes index
  'index.todaysDish': 'TODAY’S DISH',
  'index.index': 'INDEX',
  'index.addRecipe': 'ADD A NEW RECIPE',
  'index.planADish': 'PLAN A DISH',
  /** The empty "today" slot, which is a plan for today rather than a pick. */
  'index.nothingToday': 'Nothing planned for today.',
  'index.languageToggle': 'Language',

  // ----------------------------------------------------------- recipe detail
  'detail.startCooking': 'START COOKING',
  // ---------------------------------------------------------------- cook mode
  /** Rendered as: {title} · {cook.cooking} — `FISH AMOK · COOKING`. */
  'cook.cooking': 'COOKING',
  'cook.exit': 'Stop cooking',
  'cook.start': 'START',
  'cook.pause': 'PAUSE',
  'cook.resume': 'RESUME',
  'cook.reset': 'Reset the timer',
  /** Rendered as: {n} {cook.ofSteps} {total} — `2 of 5`. */
  'cook.ofSteps': 'of',
  'cook.previous': 'Previous step',
  'cook.next': 'Next step',
  'cook.done': 'DONE',
  'cook.finishedTitle': 'That’s the last step.',
  'cook.finishedBody': 'Leave it to rest a minute before you serve it.',
  'cook.noSteps': 'This recipe has no method written down yet.',
  'detail.edit': 'EDIT',
  'detail.save': 'SAVE',
  'detail.saved': 'SAVED',
  'detail.ingredientsHeader': 'INGREDIENTS',
  'detail.methodHeader': 'METHOD',
  'detail.toolsPrefix': 'TOOLS',
  /** Rendered as: ×{n} — the servings the quantities are written for. */
  'detail.servingsMultiplier': 'Quantities are for {n} servings',

  // --------------------------------------------------------------- the week
  'week.masthead': 'The Week',
  // `week.sendToMarket`, the two `…dishesPlanned` counters and `week.nothingYet`
  // are gone with the footer button, the day summary and the empty-day block
  // they belonged to — the market list is derived from the plan, and an empty
  // day now draws its four ruled sections like any other.
  'week.emptyTitle': 'Nothing planned this week.',
  'week.emptyBody': 'Put a dish on a day and its ingredients land on the market list.',
  /** Rendered as: {week.planDay} {weekday} — `PLAN WEDNESDAY`. */
  'week.planDay': 'PLAN',

  // ------------------------------------------------------------- the market
  'market.masthead': 'Market',
  'market.share': 'Share the list',
  /** Rendered as: {gathered} / {total} — `12 of 18 gathered`. */
  'market.gathered': 'gathered',
  'market.emptyTitle': 'The list is clear.',
  'market.emptyBody': 'Plan a few dishes and everything they need gathers here on its own.',
  'market.goToWeek': 'GO TO THE WEEK',
  'market.addByHand': 'add an item by hand',

  // ---------------------------------------------------------------- settings
  'settings.masthead': 'Settings',
  'settings.language': 'LANGUAGE',
  'settings.kitchen': 'KITCHEN',
  'settings.about': 'ABOUT',
  /** Rendered as: {n} {settings.recipeCount} — mono, beside the email. */
  'settings.recipeCount': 'RECIPES',

  // ----------------------------------------------------------- empty states
  'empty.recipesTitle': 'No recipes yet.',
  'empty.recipesBody':
    'The first one is usually the dish you could already cook with your eyes shut.',
  'empty.recipesPrimary': 'WRITE THE FIRST ONE',
  'empty.recipesAlt': 'begin with eight classics',
  'empty.noMatchTitle': 'Nothing under that name yet.',
  'empty.noMatchBody': 'Not in your book, and not in the shared collections.',
  'empty.writeItYourself': 'WRITE IT YOURSELF',

  // ---------------------------------------------- onboarding: what it does
  // The language picker that precedes this screen is **not** here: it is the
  // one screen in the product that shows both scripts at once, so its copy is
  // hardcoded bilingual in `(auth)/language.tsx` rather than translated. See
  // that file.
  'about.title': 'Three things it does',
  'about.skip': 'SKIP',
  'about.carryOn': 'CARRY ON',
  'about.oneTitle': 'Keeps the recipes',
  'about.oneBody':
    'Write them down once, in either language, and they stay in your own book.',
  'about.twoTitle': 'Plans the week',
  'about.twoBody': 'Put dishes on days, and the market list writes itself.',
  'about.threeTitle': 'Cooks with you',
  'about.threeBody': 'One big step at a time, with the timers already set.',

  // --------------------------------------------------- onboarding: first recipe
  'first.title': 'Start your book',
  'first.subtitle': 'Your book opens empty. Fill the first page however you like.',
  'first.writeTitle': 'Write one from memory',
  'first.writeBody': 'The way your mother makes it',
  'first.classicsTitle': 'Begin with eight classics',
  'first.classicsBody': 'Amok, lok lak, samlor korko…',
  'first.name': 'YOUR NAME',

  // -------------------------------------------------------------------- explore
  'tabs.explore': 'Explore',
  'explore.title': 'Explore',
  'explore.searchPlaceholder': 'Search dishes, ingredients, people',
  'explore.bySubject': 'BY SUBJECT',
  'explore.subjectAll': 'All',
  // ⚠ SCREENS.md §11 titles this band `AT THE MARKET NOW` with a month label,
  // over two tiles captioned like "TAMARIND · 45′". The caption is derivable —
  // a recipe's headline ingredient and its time are both real — but the heading
  // claims seasonality, and nothing in this product knows what is in a Cambodian
  // market in August. Rather than hand-author a produce calendar (the same
  // "inventing product rather than transcribing a design" that kept Explore
  // unbuilt for so long), the band keeps its shape, its month label and its
  // captions, and says only what it can stand behind. One string to change back
  // if a seasonality source ever arrives.
  'explore.twoToTry': 'TWO TO TRY',
  'explore.collections': 'COLLECTIONS',
  'explore.collectionKroeung': 'Begins with kroeung',
  'explore.collectionQuick': 'Done inside an hour',
  'explore.noResultsTitle': 'Nothing under that name yet.',
  'explore.noResultsBody': 'Not in your book, and not in the shared collections.',
  'explore.writeYourself': 'WRITE IT YOURSELF',
  'explore.didYouMean': 'DID YOU MEAN',
  'explore.inYourBook': 'IN YOUR BOOK',
  'explore.copyToBook': 'COPY TO MY BOOK',
  'explore.copying': 'COPYING…',
  'explore.copied': 'Copied to your book.',
  'explore.openCopy': 'Open it',
  'explore.byChefNak': 'Chef Nak',
  'explore.sourceLine': 'Transcribed from chefnak.com',
  'explore.method': 'METHOD',
  'explore.chefsNote': 'CHEF’S NOTE',
  'explore.offlineTitle': 'NO CONNECTION',
  'explore.offlineBody': 'Shared recipes need a signal.',
  // ⚠ § 195 writes this "all 24 recipes are on this phone" — but Explore never
  // loads the user's own recipes, and the one request that would count them is
  // the request that just failed. Rather than show a number the screen cannot
  // know, the claim is narrowed to the part that is true offline. Restore the
  // count only if something starts caching the book locally.
  'explore.offlineSub': 'Your own book still works. It’s on this phone.',
  'explore.openMyBook': 'OPEN MY BOOK',
  'explore.tryAgain': 'try again',
  // `explore.recipeCount` and `explore.savedCount` are gone with the masthead's
  // metadata line — the only place either was rendered.
  // The four BY SUBJECT chips. Keyed by the stored English value, exactly as
  // `Mealtime` and `Difficulty` are — a chip reading "ស៊ុប" still filters on
  // 'Soups', and adding a subject is a compile error in `labels.ts`.
  'subject.soups': 'Soups',
  'subject.grilled': 'Grilled',
  'subject.sweets': 'Sweets',
  'subject.festival': 'Festival',
} as const

/**
 * The key set, derived from English. Using this as `t`'s parameter type means a
 * mistyped key won't compile.
 */
export type StringKey = keyof typeof en

/** Every dictionary must cover exactly the English key set. */
export type Strings = Record<StringKey, string>

export const km: Strings = {
  // ---------------------------------------------------------------- common
  'common.save': 'រក្សាទុក',
  'common.cancel': 'បោះបង់',
  'common.delete': 'លុប',
  'common.edit': 'កែសម្រួល',
  'common.done': 'រួចរាល់',
  'common.close': 'បិទ',
  'common.dismiss': 'បិទ',
  'common.next': 'បន្ទាប់',
  'common.back': 'ត្រឡប់',
  'common.retry': 'ព្យាយាមម្តងទៀត',
  'common.loading': 'កំពុងផ្ទុក',
  'common.continue': 'បន្ត',
  'common.skipForNow': 'រំលងសិន',

  // --------------------------------------------------------------- language
  'language.label': 'ភាសា',
  'language.en': 'English',
  'language.km': 'ខ្មែរ',

  // ---------------------------------------------------------------- profile
  'profile.recipes': 'រូបមន្ត',
  'profile.favourites': 'សំណព្វ',
  'profile.totalTime': 'រយៈពេលសរុប',
  'profile.memberSince': 'ជាសមាជិកតាំងពី',
  'profile.darkMode': 'ងងឹត',
  'profile.howItWorks': 'របៀបប្រើប្រាស់',
  'profile.logOut': 'ចាកចេញ',
  'profile.logOutTitle': 'ចាកចេញមែនទេ?',
  'profile.logOutMessage': 'អ្នកត្រូវចូលគណនីម្តងទៀត',
  'profile.yourName': 'ឈ្មោះ',
  'profile.editName': 'កែឈ្មោះ',
  'profile.nameEmpty': 'ជួយបំពេញឈ្មោះ',
  'profile.nameSaveFailed': 'មិនអាចរក្សាទុកឈ្មោះបានទេ',

  // --------------------------------------------------------- ingredient picker
  'picker.title': 'គ្រឿងផ្សំទូទៅ',
  'picker.search': 'ស្វែងរកគ្រឿងផ្សំ',
  'picker.noMatch': 'រកមិនឃើញ',
  'picker.noMatchBody': 'បិទផ្ទាំងនេះ ហើយវាយបញ្ចូលដោយផ្ទាល់ក្នុងជួរគ្រឿងផ្សំ — អ្វីក៏បានដែរ។',

  // --------------------------------------------------------------- tool picker
  'toolPicker.title': 'ឧបករណ៍ទូទៅ',
  'toolPicker.search': 'ស្វែងរកឧបករណ៍',
  'toolPicker.noMatch': 'រកមិនឃើញ',
  'toolPicker.noMatchBody': 'បិទផ្ទាំងនេះ ហើយវាយបញ្ចូលដោយផ្ទាល់ក្នុងប្រអប់ឧបករណ៍ — អ្វីក៏បានដែរ។',

  // --------------------------------------------------------------- unit picker
  'unitPicker.title': 'ឯកតា',
  'unitPicker.search': 'ស្វែងរកឯកតា ឬវាយបញ្ចូលដោយខ្លួនឯង',
  'unitPicker.none': 'គ្មានឯកតា',

  // ------------------------------------------------------ onboarding: name
  'name.kicker': 'ឈ្មោះ',
  'name.title': 'តើយើងគួរហៅអ្នកថាម៉េច?',
  'name.subtitle': 'នេះជាឈ្មោះដែលអ្នកនឹងឃើញនៅលើគណនីរបស់អ្នក។ អ្នកអាចប្តូរវាពេលក្រោយបាន។',
  'name.label': 'ឈ្មោះ',
  'name.placeholder': 'សុខា',
  'name.saveFailed': 'មិនអាចរក្សាទុកឈ្មោះរបស់អ្នកបានទេ',

  // --------------------------------------------------- onboarding: welcome
  'welcome.headline': 'សូមស្វាគមន៍មកកាន់\nគ្រឿងផ្សំ',
  'welcome.body':
    'អ្វីគ្រប់យ៉ាងដែលអ្នកចម្អិន នៅកន្លែងតែមួយ។ ចំណាយពេលមួយនាទីមើលការណែនាំ នោះអ្នកនឹងស្គាល់វាទាំងស្រុង។',
  'welcome.takeTour': 'មើលការណែនាំ',
  'welcome.quickSteps': 'ជំហានខ្លីៗ',

  // ----------------------------------------------------- onboarding: taste
  'taste.kicker': 'រសជាតិរបស់អ្នក',

  'taste.title': 'តើអ្នកចូលចិត្តចម្អិនអ្វី?',
  'taste.subtitle':
    'ជ្រើសរើសអ្វីដែលអ្នកចូលចិត្ត នោះយើងនឹងដាក់រូបមន្តមួយចំនួនក្នុងសៀវភៅរបស់អ្នកជាដំបូង។ អ្នកអាចកែ ឬលុបវាទាំងអស់បាន។',
  // Identical by design: Khmer marks no singular/plural distinction.
  'taste.addOne': 'បញ្ចូលរូបមន្ត {n}',
  'taste.addMany': 'បញ្ចូលរូបមន្ត {n}',
  'taste.recipeCount': 'រូបមន្ត {n}',
  'taste.importFailed': 'មិនអាចបញ្ចូលរូបមន្តទាំងនោះបានទេ',

  // ------------------------------------------------------------------ auth
  'auth.login.heading': 'សូមស្វាគមន៍ត្រឡប់មកវិញ',
  'auth.login.subheading': 'ចូលគណនី ដើម្បីចាប់ផ្តើមចម្អិន។',
  'auth.login.submit': 'ចូលគណនី',
  'auth.login.footer': 'មិនទាន់មានគណនី?',
  'auth.signup.heading': 'បង្កើតសៀវភៅរូបមន្តរបស់អ្នក',
  'auth.signup.subheading': 'រក្សាទុកអ្វីដែលអ្នកចម្អិន នៅកន្លែងតែមួយ។',
  'auth.signup.submit': 'ចុះឈ្មោះ',
  'auth.signup.footer': 'មានគណនីរួចហើយ?',
  'auth.email': 'អ៊ីមែល',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.password': 'ពាក្យសម្ងាត់',
  'auth.passwordPlaceholder': 'បញ្ចូលពាក្យសម្ងាត់របស់អ្នក',
  'auth.missingFields': 'សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់',
  'auth.showPassword': 'បង្ហាញ',
  'auth.hidePassword': 'លាក់',
  'auth.passwordHint': 'យ៉ាងតិច ៨ តួ', // ⚠

  // ---------------------------------------------------------------- errors
  'error.generic': 'មានបញ្ហាកើតឡើង',
  'error.network': 'មិនអាចភ្ជាប់ទៅម៉ាស៊ីនមេបានទេ។ សូមពិនិត្យការតភ្ជាប់របស់អ្នក។',
  'error.tooManyRequests': 'ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំបន្តិច ហើយព្យាយាមម្តងទៀត។',
  'error.auth.invalidCredentials': 'អ៊ីមែល និងពាក្យសម្ងាត់មិនត្រូវគ្នាទេ។',
  'error.auth.emailTaken': 'មានគណនីប្រើអ៊ីមែលនេះរួចហើយ។',
  'error.auth.passwordTooShort': 'ពាក្យសម្ងាត់របស់អ្នកខ្លីពេក។',
  'error.auth.invalidEmail': 'នេះមិនមែនជាអាសយដ្ឋានអ៊ីមែលទេ។',
  'error.auth.emailNotConfirmed': 'សូមបញ្ជាក់អាសយដ្ឋានអ៊ីមែលរបស់អ្នកជាមុនសិន។',
  'error.api.invalid': 'មានអ្វីមួយក្នុងរូបមន្តនេះមិនត្រឹមត្រូវ។',
  'error.api.sessionExpired': 'វគ្គរបស់អ្នកបានផុតកំណត់។ សូមចូលគណនីម្តងទៀត។',
  'error.api.forbidden': 'នេះមិនមែនជារបស់អ្នកដើម្បីកែទេ។',
  'error.api.notFound': 'រូបមន្តនេះលែងមានទៀតហើយ។',
  'error.api.titleTaken': 'អ្នកមានរូបមន្តដែលមានចំណងជើងនេះរួចហើយ។',
  'error.api.tooLarge': 'រូបមន្តនេះធំពេក។ សូមកាត់បន្ថយ ហើយព្យាយាមម្តងទៀត។',
  'error.api.server': 'ម៉ាស៊ីនមេមានបញ្ហា។ សូមព្យាយាមម្តងទៀតក្នុងពេលឆាប់ៗ។',

  // --------------------------------------------- stored enums (labels only)
  'filter.all': 'ទាំងអស់',
  'mealtime.breakfast': 'អាហារពេលព្រឹក',
  'mealtime.lunch': 'អាហារពេលថ្ងៃ',
  'mealtime.dinner': 'អាហារពេលល្ងាច',
  'mealtime.snack': 'អាហារសម្រន់',
  'difficulty.beginner': 'ងាយស្រួល',
  'difficulty.intermediate': 'មធ្យម',
  'difficulty.advanced': 'ពិបាក',

  // ------------------------------------------------------------- dashboard
  'dashboard.hello': 'សួស្តី',
  'dashboard.prompt': 'តើថ្ងៃនេះអ្នកចង់ចម្អិនអ្វី?',
  'dashboard.shuffle': 'ជ្រើសរើសរូបមន្តដោយចៃដន្យ',
  'dashboard.search': 'ស្វែងរករូបមន្តដើម្បីចម្អិន',
  'dashboard.favourites': 'សំណព្វ',
  'dashboard.results': 'លទ្ធផល',
  'dashboard.allRecipes': 'រូបមន្តទាំងអស់',
  'dashboard.everythingElse': 'អ្វីៗផ្សេងទៀត',
  'dashboard.favouritesOnly': 'តែសំណព្វ',
  'dashboard.emptyTitle': 'មិនទាន់មានរូបមន្តទេ',
  'dashboard.emptyBody': 'ចុចប៊ូតុង + ខាងក្រោម ដើម្បីបញ្ចូលរូបមន្តដំបូងរបស់អ្នក។',
  'dashboard.noMatchTitle': 'រកមិនឃើញ',
  'dashboard.noMatchBody': 'សូមព្យាយាមស្វែងរក ឬត្រងបែបផ្សេង។',
  'dashboard.deleteTitle': 'លុបរូបមន្តនេះមែនទេ?',
  'dashboard.deleteMessage': 'សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។',

  // ---------------------------------------------------------- recipe detail
  'detail.notFound': 'រកមិនឃើញរូបមន្តទេ',
  'detail.back': 'ត្រឡប់ក្រោយ',
  'detail.tools': 'ឧបករណ៍',
  'detail.nutrition': 'សារធាតុចិញ្ចឹម',
  'detail.perServing': 'ក្នុងមួយចាន',
  'detail.ingredients': 'គ្រឿងផ្សំ',
  'detail.steps': 'ជំហាន',
  'detail.calories': 'កាឡូរី',
  'detail.protein': 'ប្រូតេអ៊ីន',
  'detail.carbs': 'កាបូអ៊ីដ្រាត',
  'detail.fat': 'ខ្លាញ់',
  'detail.editRecipe': 'កែរូបមន្ត',
  'detail.deleteRecipe': 'លុបរូបមន្ត',
  'detail.minutes': 'នាទី',
  'detail.servings': 'ចាន',
  'detail.addFavourite': 'បញ្ចូលទៅសំណព្វ',
  'detail.removeFavourite': 'ដកចេញពីសំណព្វ',

  // ------------------------------------------------------ navigation chrome
  'nav.newRecipe': 'រូបមន្តថ្មី',
  'nav.editRecipe': 'កែរូបមន្ត',
  'nav.recipe': 'រូបមន្ត',
  'nav.profile': 'គណនី',
  'nav.back': 'ថយក្រោយ',

  // ---------------------------------------------------------- meal planner
  // The Khmer day names, in their conventional short form (ថ្ងៃ, "day", is
  // dropped — it is understood in a strip of seven and would triple the width).
  'day.mon': 'ច័ន្ទ',
  'day.tue': 'អង្គារ',
  'day.wed': 'ពុធ',
  'day.thu': 'ព្រហ',
  'day.fri': 'សុក្រ',
  'day.sat': 'សៅរ៍',
  'day.sun': 'អាទិត្យ',
  // The Khmer solar months — what a Cambodian calendar prints, and what the
  // mockup's masthead shows (`ថ្ងៃអង្គារ · ១២ សីហា`). Not the traditional lunar
  // month names, which do not line up with a Gregorian date.
  'month.1': 'មករា',
  'month.2': 'កុម្ភៈ',
  'month.3': 'មីនា',
  'month.4': 'មេសា',
  'month.5': 'ឧសភា',
  'month.6': 'មិថុនា',
  'month.7': 'កក្កដា',
  'month.8': 'សីហា',
  'month.9': 'កញ្ញា',
  'month.10': 'តុលា',
  'month.11': 'វិច្ឆិកា',
  'month.12': 'ធ្នូ',
  'planner.title': 'កម្មវិធីគ្រោងអាហារ',
  'planner.thisWeek': 'សប្តាហ៍នេះ',
  'planner.previousWeek': 'សប្តាហ៍មុន',
  'planner.nextWeek': 'សប្តាហ៍ក្រោយ',
  'planner.today': 'ថ្ងៃនេះ',
  'planner.addSlot': 'បញ្ចូល{meal}',
  'planner.change': 'ប្តូររូបមន្ត',
  'planner.clear': 'សម្អាតប្រអប់នេះ',
  'planner.pickTitle': 'គ្រោង{meal}',
  'planner.pickSearch': 'ស្វែងរករូបមន្តរបស់អ្នក',
  'planner.emptyTitle': 'មិនទាន់មានការគ្រោងទេ',
  'planner.emptyBody': 'ចុចប្រអប់ណាមួយដើម្បីជ្រើសរើសម្ហូបចម្អិន។',
  'planner.noRecipesTitle': 'គ្មានរូបមន្តសម្រាប់គ្រោង',
  'planner.noRecipesBody': 'បញ្ចូលរូបមន្តជាមុនសិន រួចត្រឡប់មកគ្រោងសប្តាហ៍របស់អ្នក។',

  // -------------------------------------------------------------- tutorial
  'tutorial.startCooking': 'ចាប់ផ្តើមចម្អិន',

  // ------------------------------------------------------- shared controls
  'select.placeholder': 'ជ្រើសរើស',
  'select.search': 'ស្វែងរក',
  'select.none': 'គ្មាន',
  'select.orTypeYourOwn': 'ឬវាយបញ្ចូលដោយខ្លួនឯង',
  'select.use': 'ប្រើ',
  'select.noMatch': 'រកមិនឃើញ',
  'search.placeholder': 'ស្វែងរករូបមន្ត',
  'search.clear': 'សម្អាតការស្វែងរក',
  'tabs.recipes': 'រូបមន្ត',
  'tabs.planner': 'គ្រោងអាហារ',
  'tabs.addRecipe': 'បញ្ចូលរូបមន្ត',
  'tabs.grocery': 'ទំនិញ',
  'tabs.addIngredient': 'បន្ថែមគ្រឿងផ្សំ',

  // ── Grocery ───────────────────────────────────────────────────────────────
  'grocery.title': 'ទំនិញ',
  'grocery.stillToBuy': 'នៅសល់ {n} ត្រូវទិញ',
  'grocery.scopeWeek': 'សប្តាហ៍នេះ',
  'grocery.scopeDay': 'ថ្ងៃនេះ',
  'grocery.scopeMissing': 'តែអ្វីដែលខ្វះ',
  'grocery.addedByYou': 'អ្នកបានបន្ថែម',
  'grocery.gathered': 'ប្រមូលបានហើយ',
  'grocery.aisleProduce': 'បន្លែ និងផ្លែឈើ',
  'grocery.aisleProtein': 'សាច់ និងទឹកដោះ',
  'grocery.aislePantry': 'គ្រឿងទេស និងស្បៀង',
  'grocery.aisleOther': 'ផ្សេងៗ',
  'grocery.composerName': 'គ្រឿងផ្សំ',
  'grocery.composerAmount': 'បរិមាណ',
  'grocery.composerUnit': 'ឯកតា',
  'grocery.composerAdd': 'បន្ថែម',
  'grocery.composerClose': 'បិទ',
  'grocery.emptyTitle': 'មិនទាន់មានអ្វីត្រូវទិញ',
  'grocery.emptyBody': 'គ្រោងអាហារសម្រាប់សប្តាហ៍នេះ រួចគ្រឿងផ្សំនឹងមកទីនេះ។',
  'grocery.emptyMissingTitle': 'បានយកគ្រប់ហើយ',
  'grocery.emptyMissingBody': 'គ្មានអ្វីនៅសល់ត្រូវប្រមូលទេ។',
  'grocery.emptyDayTitle': 'គ្មានគម្រោងសម្រាប់ថ្ងៃនេះ',
  'grocery.emptyDayBody': 'ប្តូរទៅ សប្តាហ៍នេះ ដើម្បីមើលបញ្ជីទាំងមូល។',
  'grocery.allDishes': 'មុខម្ហូបទាំងអស់',
  'grocery.filterByDish': 'ត្រងតាមមុខម្ហូប',
  'grocery.moreDishes': 'នៅមាន {n} មុខទៀត',
  'grocery.emptyDishTitle': 'គ្មានអ្វីសម្រាប់មុខម្ហូបនេះទេ',
  'grocery.emptyDishBody': 'ប្តូរទៅ មុខម្ហូបទាំងអស់ ដើម្បីមើលបញ្ជីទាំងមូល។',
  'grocery.less': 'បន្ថយ {name}',
  'grocery.more': 'បន្ថែម {name}',
  'grocery.resetAmount': 'ត្រឡប់ទៅបរិមាណដែលបានគ្រោង',
  'grocery.remove': 'ដក {name}',

  // ------------------------------------------------ operations that can fail
  'error.loadRecipes': 'មិនអាចទាញយករូបមន្តបានទេ',
  'error.refreshRecipes': 'មិនអាចបញ្ចូលរូបមន្តថ្មីបានទេ',
  'error.loadRecipe': 'មិនអាចទាញយករូបមន្តបានទេ',
  'error.deleteRecipe': 'មិនអាចលុបរូបមន្តបានទេ',
  'error.favourite': 'មិនអាចធ្វើបច្ចុប្បន្នភាពសំណព្វបានទេ',
  'error.savePlan': 'មិនអាចរក្សាទុកអាហារនោះបានទេ',
  'error.clearPlan': 'មិនអាចសម្អាតប្រអប់នោះបានទេ',
  'error.saveGrocery': 'មិនអាចធ្វើបច្ចុប្បន្នភាពរបស់នោះបានទេ',
  'error.clearGrocery': 'មិនអាចដករបស់នោះបានទេ',

  // ----------------------------------------------------------- recipe form
  'form.addRecipe': 'បញ្ចូលរូបមន្ត',
  'form.saveChanges': 'រក្សាទុកការកែប្រែ',
  'form.step.basics': 'ព័ត៌មានទូទៅ',
  'form.step.ingredients': 'គ្រឿងផ្សំ',
  'form.step.steps': 'ជំហាន',
  'form.step.nutrition': 'សារធាតុចិញ្ចឹម',
  'form.photoPermission': 'សូមអនុញ្ញាតឱ្យចូលប្រើវិចិត្រសាល ដើម្បីបញ្ចូលរូបភាព។',
  'form.photoFailed': 'មិនអាចផ្ទុករូបភាពនេះឡើងបានទេ។',
  'form.saveFailed': 'មិនអាចរក្សាទុករូបមន្តនេះបានទេ។ សូមព្យាយាមម្តងទៀត។',
  'form.changePhoto': 'ប្តូររូបភាព',
  'form.addPhoto': 'បញ្ចូលរូបភាព',
  'form.change': 'ប្តូរ',
  'form.title': 'ចំណងជើង',
  'form.titlePlaceholder': 'ឧ. សម្លម្ជូរគ្រឿង',
  'form.description': 'ការពិពណ៌នា',
  'form.descriptionPlaceholder': 'ឧ. សម្លម្ជូរបែបប្រពៃណី ជាមួយត្រី និងបន្លែ',
  'form.mealtime': 'ពេលវេលាអាហារ',
  'form.difficulty': 'កម្រិតលំបាក',
  'form.totalMinutes': 'រយៈពេលសរុប (នាទី)',
  'form.totalMinutesPlaceholder': 'ឧ. ៣០',
  'form.servings': 'ចំនួនចាន',
  'form.servingsPlaceholder': 'ឧ. ៤',
  'form.cuisine': 'ប្រភេទម្ហូប',
  'form.cuisinePlaceholder': 'ជ្រើសរើសប្រភេទម្ហូប',
  'form.cuisineSearch': 'ស្វែងរកប្រភេទម្ហូប',
  'form.tools': 'ឧបករណ៍',
  'form.toolsPlaceholder': 'ឧ. ឆ្នាំងធំ, ខ្ទះ',
  'form.toolsHint': 'បំបែកដោយសញ្ញាក្បៀស',
  'form.pickTools': 'ជ្រើសរើសពីឧបករណ៍ទូទៅ',
  'form.pickToolsHint': 'ខ្ទះ, ម៉ាស៊ីនកិន, ថាសដុតនំ…',
  'form.ingredientsHeading': 'គ្រឿងផ្សំ',
  'form.pickCommon': 'ជ្រើសរើសពីគ្រឿងផ្សំទូទៅ',
  'form.pickCommonHint': 'ខ្ទឹមស, ទឹកត្រី, អង្ករ…',
  'form.added': 'បានបញ្ចូល',
  'form.ingredientPlaceholder': 'គ្រឿងផ្សំ',
  'form.unitPlaceholder': 'ឯកតា',
  'form.addYourOwn': 'បញ្ចូលដោយខ្លួនឯង',
  'form.noIngredients': 'មិនទាន់មានគ្រឿងផ្សំទេ — ជ្រើសរើសខាងលើ ឬបញ្ចូលដោយខ្លួនឯងខាងក្រោម',
  'form.stepsHeading': 'វិធីចំអិន',
  'form.stepPlaceholder': 'ឧ. ដាំទឹកឱ្យពុះ រួចដាក់មីចូល',
  'form.removeStep': 'លុបជំហាន',
  'form.removeIngredient': 'លុបគ្រឿងផ្សំ',
  'form.reorder': 'អូសដើម្បីរៀបលំដាប់',
  'form.addStep': 'បន្ថែមជំហាន',
  'form.noSteps': 'មិនទាន់មានជំហានទេ — បន្ថែមជំហានដំបូងខាងក្រោម។',
  'form.addTimer': 'កំណត់ម៉ោង', // ⚠
  'form.stepTimer': 'ម៉ោងកំណត់ជំហាន', // ⚠
  'form.stepTimerHint': 'ពេលចម្អិន កម្មវិធីនឹងរាប់ថយក្រោយឲ្យអ្នក។', // ⚠
  'form.noTimer': 'គ្មានម៉ោងកំណត់', // ⚠
  // Unit abbreviations in the timer list. Khmer writes these as words rather
  // than as Latin symbols — unlike `g`/`ml`, which stay Latin because they are
  // symbols (see `data/units.km.ts`); these are counts of time, not measures.
  'form.hoursShort': 'ម៉ោង', // ⚠
  'form.minutesShort': 'នាទី', // ⚠
  'form.secondsShort': 'វិនាទី', // ⚠
  'form.nutritionHeading': 'សារធាតុចិញ្ចឹមក្នុងមួយចាន',
  'form.calories': 'កាឡូរី',
  'form.protein': 'ប្រូតេអ៊ីន',
  'form.carbs': 'កាបូអ៊ីដ្រាត',
  'form.fat': 'ខ្លាញ់',

  // ------------------------------------------------------------ validation
  'validation.tooBig': 'រូបមន្តនេះមាន {n}KB — កំណត់ត្រឹម {max}KB។ សូមកាត់បន្ថយការពិពណ៌នា ឬលុបជំហានខ្លះ។',
  'validation.wholeNumber': '{field} ត្រូវជាចំនួនគត់។',
  'validation.mustBeNumber': '{field} ត្រូវដាក់ជាលេខ។',
  'validation.amountsNumbers': 'បរិមាណត្រូវដាក់ជាលេខ។',
  // ⚠ These four dropped their `{n}` in translation, so the Khmer message said
  // "too long" and never said *how* long — the number the English carries is
  // the only actionable part of the sentence. The `(អតិបរមា {n})` suffix is
  // lifted verbatim from the three strings below it rather than newly written,
  // so no Khmer copy is being invented here.
  //
  // What is still owed to a Khmer reader: the English distinguishes a *word*
  // limit from a *character* limit, and `descriptionWords`/`descriptionChars`
  // remain word-for-word identical in Khmer. Both now carry their number, which
  // tells them apart in practice (1,000 vs 8,000), but that is a workaround for
  // missing copy, not the copy.
  'validation.titleTooLong': 'ចំណងជើងវែងពេក (អតិបរមា {n})។',
  'validation.descriptionWords': 'ការពិពណ៌នាវែងពេក (អតិបរមា {n})។',
  'validation.descriptionChars': 'ការពិពណ៌នាវែងពេក (អតិបរមា {n})។',
  'validation.tooManyTools': 'ឧបករណ៍ច្រើនពេក (អតិបរមា {n})។',
  'validation.toolTooLong': 'បំបែកឧបករណ៍ដោយសញ្ញាក្បៀស — មានមួយវែងពេក។',
  'validation.tooManyIngredients': 'គ្រឿងផ្សំច្រើនពេក (អតិបរមា {n})។',
  'validation.tooManySteps': 'ជំហានច្រើនពេក (អតិបរមា {n})។',
  'validation.stepTooLong': 'ជំហានអក្សរច្រើនពេក (អតិបរមា {n})។',
  'validation.fillHighlighted': 'សូមបំពេញប្រអប់ដែលខ្វះ',
  'validation.checkHighlighted': 'សូមពិនិត្យប្រអប់ដែលខ្វះ',

  // ================================================================ Chronicle
  // ✓ = the Khmer is SCREENS.md's own, verbatim and final.
  // ⚠ = written here because the handoff gave English only. Owed a reader; the
  //     full list is `KHMER_NEEDS_REVIEW` in `tests/strings.test.ts`.

  'brand.wordmark': 'ចង្ក្រាន', // ✓

  'index.todaysDish': 'ម្ហូបថ្ងៃនេះ', // ✓
  'index.index': 'បញ្ជី', // ✓
  'index.addRecipe': 'បញ្ចូលរូបមន្តថ្មី', // ✓
  'index.planADish': 'បន្ថែមម្ហូប', // ✓
  'index.nothingToday': 'មិនទាន់មានម្ហូបសម្រាប់ថ្ងៃនេះទេ។', // ⚠
  'index.languageToggle': 'ភាសា', // ✓ (matches settings.language)

  'detail.startCooking': 'ចាប់ផ្ដើមចម្អិន', // ✓
  // ---------------------------------------------------------------- cook mode
  'cook.cooking': 'កំពុងចម្អិន', // ✓ (SCREENS.md § 8)
  'cook.exit': 'ឈប់ចម្អិន', // ⚠
  'cook.start': 'ចាប់ផ្ដើម', // ✓ (SCREENS.md § 8)
  'cook.pause': 'ផ្អាក', // ✓ (SCREENS.md § 8)
  'cook.resume': 'បន្ត', // ⚠
  'cook.reset': 'កំណត់ម៉ោងឡើងវិញ', // ⚠
  'cook.ofSteps': 'ក្នុងចំណោម', // ⚠
  'cook.previous': 'ជំហានមុន', // ⚠
  'cook.next': 'ជំហានបន្ទាប់', // ⚠
  'cook.done': 'រួចរាល់', // ⚠
  'cook.finishedTitle': 'នេះជាជំហានចុងក្រោយ។', // ⚠
  'cook.finishedBody': 'ទុកឲ្យត្រជាក់បន្តិចមុននឹងរៀបចំបម្រើ។', // ⚠
  'cook.noSteps': 'រូបមន្តនេះមិនទាន់មានវិធីចំអិនទេ។', // ⚠
  'detail.edit': 'កែសម្រួល', // ✓
  'detail.save': 'រក្សាទុក', // ✓
  'detail.saved': 'បានរក្សាទុក', // ⚠
  'detail.ingredientsHeader': 'គ្រឿងផ្សំ', // ✓
  'detail.methodHeader': 'របៀបធ្វើ', // ✓
  'detail.toolsPrefix': 'ឧបករណ៍', // ⚠
  'detail.servingsMultiplier': 'បរិមាណសម្រាប់ {n} ចំណែក', // ⚠

  'week.masthead': 'សប្ដាហ៍', // ✓
  'week.emptyTitle': 'មិនទាន់មានផែនការសម្រាប់សប្ដាហ៍នេះទេ។', // ⚠
  'week.emptyBody': 'ដាក់ម្ហូបលើថ្ងៃណាមួយ នោះគ្រឿងផ្សំនឹងចូលទៅបញ្ជីទីផ្សារដោយស្វ័យប្រវត្តិ។', // ⚠
  'week.planDay': 'រៀបផែនការ', // ✓ (from `រៀបផែនការសប្ដាហ៍`)

  'market.masthead': 'ទីផ្សារ', // ✓
  'market.share': 'ចែករំលែកបញ្ជី', // ⚠
  'market.gathered': 'ប្រមូលបាន', // ✓
  'market.emptyTitle': 'បញ្ជីទទេ។', // ✓
  'market.emptyBody': 'រៀបផែនការម្ហូបខ្លះ នោះអ្វីៗដែលត្រូវការនឹងចូលមកទីនេះដោយខ្លួនឯង។', // ⚠
  'market.goToWeek': 'ទៅកាន់សប្ដាហ៍', // ⚠
  'market.addByHand': 'បញ្ចូលដោយខ្លួនឯង', // ✓ (from the authoring screens)

  'settings.masthead': 'ការកំណត់', // ✓
  'settings.language': 'ភាសា', // ✓
  'settings.kitchen': 'ផ្ទះបាយ', // ✓
  'settings.about': 'អំពី', // ⚠
  'settings.recipeCount': 'រូបមន្ត', // ⚠

  'empty.recipesTitle': 'មិនទាន់មានរូបមន្តទេ។', // ✓
  'empty.recipesBody': 'រូបមន្តដំបូងច្រើនតែជាម្ហូបដែលអ្នកចេះធ្វើរួចស្រេច។', // ⚠
  'empty.recipesPrimary': 'សរសេររូបមន្តដំបូង', // ⚠
  'empty.recipesAlt': 'ចាប់ផ្ដើមដោយម្ហូបប្រពៃណី ៨', // ✓
  'empty.noMatchTitle': 'មិនទាន់មានឈ្មោះនេះទេ។', // ✓
  'empty.noMatchBody': 'គ្មានក្នុងសៀវភៅរបស់អ្នក ហើយក៏គ្មានក្នុងបណ្ដុំរួមដែរ។', // ⚠
  'empty.writeItYourself': 'សរសេរដោយខ្លួនឯង', // ✓

  'about.title': 'ចង្ក្រានធ្វើអ្វីខ្លះ', // ✓
  'about.skip': 'រំលង', // ✓
  'about.carryOn': 'បន្ត', // ✓
  'about.oneTitle': 'រក្សារូបមន្តទុក', // ✓
  'about.oneBody': 'សរសេរតែម្ដង ជាភាសាណាក៏បាន ហើយវានៅក្នុងសៀវភៅផ្ទាល់ខ្លួនរបស់អ្នក។', // ⚠
  'about.twoTitle': 'រៀបផែនការសប្ដាហ៍', // ✓
  'about.twoBody': 'ដាក់ម្ហូបលើថ្ងៃនីមួយៗ រួចបញ្ជីទីផ្សារនឹងសរសេរខ្លួនឯង។', // ⚠
  'about.threeTitle': 'ចម្អិនជាមួយអ្នក', // ✓
  'about.threeBody': 'មួយជំហានធំម្ដងៗ ព្រមទាំងម៉ោងកំណត់ដែលមានស្រាប់។', // ⚠

  'first.title': 'ចាប់ផ្ដើមសៀវភៅ', // ✓
  'first.subtitle': 'សៀវភៅរបស់អ្នកបើកឡើងទទេ។ បំពេញទំព័រដំបូងតាមចិត្តអ្នក។', // ⚠
  'first.writeTitle': 'សរសេរតាមការចងចាំ', // ✓
  'first.writeBody': 'តាមរបៀបដែលម្ដាយអ្នកធ្វើ', // ⚠
  'first.classicsTitle': 'ចាប់ផ្ដើមដោយម្ហូបប្រពៃណី ៨', // ✓
  'first.classicsBody': 'អាម៉ុក ឡុកឡាក់ សម្លកកូរ…', // ⚠
  'first.name': 'ឈ្មោះរបស់អ្នក', // ✓ (from the retired name step)

  'tabs.explore': 'រុករក', // ✓
  'explore.title': 'រុករក', // ✓
  'explore.searchPlaceholder': 'ស្វែងរកម្ហូប គ្រឿងផ្សំ អ្នកចម្អិន', // ✓
  'explore.bySubject': 'តាមប្រភេទ', // ✓
  'explore.subjectAll': 'ទាំងអស់', // ✓
  'explore.twoToTry': 'ពីរមុខគួរសាកល្បង', // ⚠
  'explore.collections': 'ចង្កោមម្ហូប', // ✓
  'explore.collectionKroeung': 'ចាប់ផ្ដើមដោយគ្រឿង', // ⚠
  'explore.collectionQuick': 'រួចរាល់ក្នុងមួយម៉ោង', // ⚠
  'explore.noResultsTitle': 'មិនទាន់មានឈ្មោះនេះទេ។', // ✓
  'explore.noResultsBody': 'គ្មានក្នុងសៀវភៅរបស់អ្នក ហើយក៏គ្មានក្នុងចង្កោមរួមដែរ។', // ⚠
  'explore.writeYourself': 'សរសេរដោយខ្លួនឯង', // ✓
  'explore.didYouMean': 'ប្រហែលជា', // ✓
  'explore.inYourBook': 'មានក្នុងសៀវភៅ', // ⚠
  'explore.copyToBook': 'ចម្លងទៅសៀវភៅខ្ញុំ', // ⚠
  'explore.copying': 'កំពុងចម្លង…', // ⚠
  'explore.copied': 'បានចម្លងទៅសៀវភៅរបស់អ្នក។', // ⚠
  'explore.openCopy': 'បើកមើល', // ⚠
  'explore.byChefNak': 'ចេហ្វ ណាក់', // ⚠
  'explore.sourceLine': 'ចម្លងពី chefnak.com', // ⚠
  'explore.method': 'វិធីធ្វើ', // ⚠
  'explore.chefsNote': 'កំណត់សម្គាល់របស់ចុងភៅ', // ⚠
  'explore.offlineTitle': 'គ្មានអ៊ីនធឺណិត', // ✓
  'explore.offlineBody': 'រូបមន្តរួមត្រូវការសញ្ញាអ៊ីនធឺណិត។', // ⚠
  'explore.offlineSub': 'សៀវភៅរបស់អ្នកនៅតែដំណើរការ។ វានៅក្នុងទូរស័ព្ទនេះ។', // ⚠
  'explore.openMyBook': 'បើកសៀវភៅខ្ញុំ', // ⚠
  'explore.tryAgain': 'ព្យាយាមម្ដងទៀត', // ⚠
  'subject.soups': 'ស៊ុប', // ⚠
  'subject.grilled': 'អាំង', // ⚠
  'subject.sweets': 'បង្អែម', // ⚠
  'subject.festival': 'ពិធីបុណ្យ', // ⚠
}
