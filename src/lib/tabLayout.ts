/** SDK 58 stores visited tabs in visit order; UI order comes from declarations. */
export function tabLayout(
  routeNames: readonly string[],
  liveRoutes: readonly { name: string; key: string }[],
  focusedKey: string | undefined,
) {
  const routes = routeNames.map(name => liveRoutes.find(route => route.name === name) ?? { name, key: name })
  const focusedName = liveRoutes.find(route => route.key === focusedKey)?.name
  return { routes, index: Math.max(0, routes.findIndex(route => route.name === focusedName)) }
}
