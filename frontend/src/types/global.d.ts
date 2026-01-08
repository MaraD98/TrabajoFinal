declare global {
  interface Window {
    google: typeof google;
  }
  const google: typeof import("google.maps");
}

export {};
