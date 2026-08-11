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
  'welcome.headline': 'Welcome to your\nRecipe Book',
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
  'auth.showPassword': 'Show password',
  'auth.hidePassword': 'Hide password',

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
  'planner.title': 'Meal planner',
  // Two placeholders, which is one more than anything else here needs. The
  // total isn't hardcoded because it's `days × mealtimes` — adding a mealtime
  // would otherwise leave this string quietly lying about the denominator.
  'planner.subtitle': '{n} of {total} meals planned this week',
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
  'tabs.planner': 'Meal planner',
  'tabs.addRecipe': 'Add recipe',

  // ------------------------------------------------ operations that can fail
  'error.loadRecipes': 'Failed to load recipes',
  'error.refreshRecipes': 'Failed to refresh recipes',
  'error.loadRecipe': 'Failed to load recipe',
  'error.deleteRecipe': 'Failed to delete recipe',
  'error.favourite': 'Could not update favourite',
  'error.savePlan': 'Could not save that meal',
  'error.clearPlan': 'Could not clear that slot',

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
  'form.required': 'Required',
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
  'form.ingredientPlaceholder': 'Ingredient',
  'form.unitPlaceholder': 'unit',
  'form.addYourOwn': 'Add your own',
  'form.noIngredients': 'No ingredients yet — pick some above, or add your own below.',
  'form.stepsHeading': 'How is it made?',
  'form.stepPlaceholder': 'e.g. Boil the pasta until al dente',
  'form.removeStep': 'Remove step',
  'form.removeIngredient': 'Remove ingredient',
  'form.addStep': 'Add step',
  'form.noSteps': 'No steps yet — add the first one below.',
  'form.nutritionHeading': 'What’s in a serving?',
  'form.nutritionIntro': 'All optional, and all per serving. Leave anything you don’t know blank.',
  'form.calories': 'Calories (kcal)',
  'form.caloriesPlaceholder': 'e.g. 520',
  'form.protein': 'Protein (g)',
  'form.proteinPlaceholder': 'e.g. 31',
  'form.carbs': 'Carbs (g)',
  'form.carbsPlaceholder': 'e.g. 48',
  'form.fat': 'Fat (g)',
  'form.fatPlaceholder': 'e.g. 22',

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
  'welcome.headline': 'សូមស្វាគមន៍មកកាន់\nសៀវភៅរូបមន្តរបស់អ្នក',
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
  'auth.showPassword': 'បង្ហាញពាក្យសម្ងាត់',
  'auth.hidePassword': 'លាក់ពាក្យសម្ងាត់',

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
  'planner.title': 'កម្មវិធីគ្រោងអាហារ',
  'planner.subtitle': 'បានគ្រោង {n} ក្នុងចំណោម {total} អាហារសប្តាហ៍នេះ',
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

  // ------------------------------------------------ operations that can fail
  'error.loadRecipes': 'មិនអាចទាញយករូបមន្តបានទេ',
  'error.refreshRecipes': 'មិនអាចបញ្ចូលរូបមន្តថ្មីបានទេ',
  'error.loadRecipe': 'មិនអាចទាញយករូបមន្តបានទេ',
  'error.deleteRecipe': 'មិនអាចលុបរូបមន្តបានទេ',
  'error.favourite': 'មិនអាចធ្វើបច្ចុប្បន្នភាពសំណព្វបានទេ',
  'error.savePlan': 'មិនអាចរក្សាទុកអាហារនោះបានទេ',
  'error.clearPlan': 'មិនអាចសម្អាតប្រអប់នោះបានទេ',

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
  'form.required': 'ត្រូវការ',
  'form.title': 'ចំណងជើង',
  'form.titlePlaceholder': 'ឧ. សម្លម្ជូរគ្រឿង',
  'form.description': 'ការពិពណ៌នា',
  'form.descriptionPlaceholder': 'ឧ. សម្លម្ជូរបែបប្រពៃណី ជាមួយត្រី និងបន្លែ',
  'form.mealtime': 'ពេលវេលាអាហារ',
  'form.difficulty': 'កម្រិតលំបាក',
  'form.totalMinutes': 'រយៈពេលសរុប (នាទី)',
  'form.totalMinutesPlaceholder': 'ឧ. 30',
  'form.servings': 'ចំនួនចាន',
  'form.servingsPlaceholder': 'ឧ. 4',
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
  'form.ingredientPlaceholder': 'គ្រឿងផ្សំ',
  'form.unitPlaceholder': 'ឯកតា',
  'form.addYourOwn': 'បញ្ចូលដោយខ្លួនឯង',
  'form.noIngredients': 'មិនទាន់មានគ្រឿងផ្សំទេ — ជ្រើសរើសខាងលើ ឬបញ្ចូលដោយខ្លួនឯងខាងក្រោម',
  'form.stepsHeading': 'វិធីចំអិន',
  'form.stepPlaceholder': 'ឧ. ដាំទឹកឱ្យពុះ រួចដាក់មីចូល',
  'form.removeStep': 'លុបជំហាន',
  'form.removeIngredient': 'លុបគ្រឿងផ្សំ',
  'form.addStep': 'បន្ថែមជំហាន',
  'form.noSteps': 'មិនទាន់មានជំហានទេ — បន្ថែមជំហានដំបូងខាងក្រោម។',
  'form.nutritionHeading': 'ព័ត៌មានសារធាតុចិញ្ចឹម',
  'form.nutritionIntro': 'ដាក់ក៏បាន មិនដាក់ក៏បាន',
  'form.calories': 'កាឡូរី (kcal)',
  'form.caloriesPlaceholder': 'ឧ. 520',
  'form.protein': 'ប្រូតេអ៊ីន (g)',
  'form.proteinPlaceholder': 'ឧ. 31',
  'form.carbs': 'កាបូអ៊ីដ្រាត (g)',
  'form.carbsPlaceholder': 'ឧ. 48',
  'form.fat': 'ខ្លាញ់ (g)',
  'form.fatPlaceholder': 'ឧ. 22',

  // ------------------------------------------------------------ validation
  'validation.tooBig': 'រូបមន្តនេះមាន {n}KB — កំណត់ត្រឹម {max}KB។ សូមកាត់បន្ថយការពិពណ៌នា ឬលុបជំហានខ្លះ។',
  'validation.wholeNumber': '{field} ត្រូវជាចំនួនគត់។',
  'validation.mustBeNumber': '{field} ត្រូវដាក់ជាលេខ។',
  'validation.amountsNumbers': 'បរិមាណត្រូវដាក់ជាលេខ។',
  'validation.titleTooLong': 'ចំណងជើងវែងពេក',
  'validation.descriptionWords': 'ការពិពណ៌នាវែងពេក',
  'validation.descriptionChars': 'ការពិពណ៌នាវែងពេក',
  'validation.tooManyTools': 'ឧបករណ៍ច្រើនពេក (អតិបរមា {n})។',
  'validation.toolTooLong': 'បំបែកឧបករណ៍ដោយសញ្ញាក្បៀស — មានមួយវែងពេក។',
  'validation.tooManyIngredients': 'គ្រឿងផ្សំច្រើនពេក (អតិបរមា {n})។',
  'validation.tooManySteps': 'ជំហានច្រើនពេក (អតិបរមា {n})។',
  'validation.stepTooLong': 'ជំហានអក្សរច្រើនពេក',
  'validation.fillHighlighted': 'សូមបំពេញប្រអប់ដែលខ្វះ',
  'validation.checkHighlighted': 'សូមពិនិត្យប្រអប់ដែលខ្វះ',
}
