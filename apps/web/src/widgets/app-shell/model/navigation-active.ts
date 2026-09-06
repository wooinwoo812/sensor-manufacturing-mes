/** Detail routes keep their owning menu active; path prefixes require a segment boundary. */
export function isNavigationActive(pathname: string, destination: string) {
  return (
    pathname === destination ||
    pathname.startsWith(destination + "/") ||
    (destination === "/execution/queue" &&
      pathname.startsWith("/execution/lots/"))
  );
}
