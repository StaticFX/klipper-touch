import { fetch } from "@tauri-apps/plugin-http";
import { getVersion } from "@tauri-apps/api/app";

const REPO = "StaticFX/klipper-touch";
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

export const REPO_URL = `https://github.com/${REPO}`;

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const currentVersion = await getVersion();

  try {
    const resp = await fetch(API_URL, {
      method: "GET",
      headers: { Accept: "application/vnd.github.v3+json" },
    });

    if (!resp.ok) {
      return { currentVersion, latestVersion: null, updateAvailable: false, releaseUrl: null };
    }

    const data = await resp.json() as { tag_name: string; html_url: string };
    const latestTag = data.tag_name.replace(/^v/, "");
    const updateAvailable = compareVersions(latestTag, currentVersion) > 0;

    return {
      currentVersion,
      latestVersion: latestTag,
      updateAvailable,
      releaseUrl: data.html_url,
    };
  } catch {
    return { currentVersion, latestVersion: null, updateAvailable: false, releaseUrl: null };
  }
}

/** Returns >0 if a > b, 0 if equal, <0 if a < b */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}
