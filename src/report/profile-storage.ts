import {
  defaultProfileState,
  mergeCompanyProfile,
  validateLogo,
  type ProfileLogo,
  type ProfileState,
} from './company-profile.ts';

export const PROFILE_STORAGE_KEY = 'msl.company-profile.v1';
export interface ProfileValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface LogoStorage {
  get(revision: string): Promise<ProfileLogo | undefined>;
  put(revision: string, logo: ProfileLogo): Promise<void>;
}
interface Revision {
  profile: ProfileState['profile'];
  logoRevision: string | null;
}
interface Envelope {
  version: 1;
  current: Revision;
  previous: Revision | null;
}
export class IndexedDbLogoStorage implements LogoStorage {
  private database: Promise<IDBDatabase> | null = null;
  private open(): Promise<IDBDatabase> {
    return (this.database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('msl-company-profile', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('logos');
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Logolageret er låst af en anden fane.'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.database = null;
        };
        resolve(db);
      };
    }).catch((error: unknown) => {
      this.database = null;
      throw error;
    }));
  }
  async get(revision: string): Promise<ProfileLogo | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('logos', 'readonly');
      const request = tx.objectStore('logos').get(revision);
      tx.oncomplete = () => resolve(request.result as ProfileLogo | undefined);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
  async put(revision: string, logo: ProfileLogo): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('logos', 'readwrite');
      tx.objectStore('logos').put(logo, revision);
      // Vent på transaktionens commit, ikke kun put-requestens success.
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
}
/** Uforanderlige logorevisioner skrives før én atomar localStorage-opdatering.
 * Sidste revision bevares som fallback. En afbrudt gemning kan højst give
 * ubrugte logobytes; den kan aldrig publicere en reference til et uskrevet logo.
 */
export class CompanyProfileStorage {
  consistent = defaultProfileState();
  private revision: Revision | null = null;
  private storedLogo: ProfileLogo | null = null;
  private values: ProfileValueStorage;
  private logos: LogoStorage;
  constructor(values: ProfileValueStorage, logos: LogoStorage) {
    this.values = values;
    this.logos = logos;
  }

  private async readRevision(raw: unknown): Promise<{ state: ProfileState; revision: Revision }> {
    if (!raw || typeof raw !== 'object') throw new Error('Profilrevisionen mangler.');
    const r = raw as Record<string, unknown>;
    if (
      Object.keys(r).some((k) => !['profile', 'logoRevision'].includes(k)) ||
      !(r.logoRevision === null || typeof r.logoRevision === 'string')
    )
      throw new Error('Profilrevisionen er ugyldig.');
    const profile = mergeCompanyProfile(r.profile);
    const logo = r.logoRevision === null ? null : await this.logos.get(r.logoRevision);
    if (logo === undefined) throw new Error('Profilens gemte logo mangler.');
    if (logo) validateLogo(logo);
    return { state: { profile, logo }, revision: { profile, logoRevision: r.logoRevision } };
  }
  async load(): Promise<{ state: ProfileState; error: string | null }> {
    try {
      const json = this.values.getItem(PROFILE_STORAGE_KEY);
      if (json === null) return { state: this.consistent, error: null };
      const envelope = JSON.parse(json) as Envelope;
      if (
        !envelope ||
        envelope.version !== 1 ||
        Object.keys(envelope).some((k) => !['version', 'current', 'previous'].includes(k))
      )
        throw new Error('Lagerformatet er ugyldigt.');
      let loaded,
        error: string | null = null;
      try {
        loaded = await this.readRevision(envelope.current);
      } catch {
        loaded = await this.readRevision(envelope.previous);
        error = 'Den nyeste firmaprofil kunne ikke indlæses. Den sidst konsistente profil bruges.';
      }
      this.consistent = loaded.state;
      this.revision = loaded.revision;
      this.storedLogo = loaded.state.logo;
      return { state: this.consistent, error };
    } catch {
      return {
        state: this.consistent,
        error:
          'Firmaprofil og logo kunne ikke indlæses. Standardprofilen bruges; de gemte data er ikke overskrevet.',
      };
    }
  }
  async save(state: ProfileState): Promise<ProfileState> {
    try {
      const profile = mergeCompanyProfile(state.profile, true);
      let logoRevision: string | null = null;
      if (state.logo) {
        validateLogo(state.logo);
        if (state.logo === this.storedLogo && this.revision?.logoRevision)
          logoRevision = this.revision.logoRevision;
        else {
          logoRevision = crypto.randomUUID();
          await this.logos.put(logoRevision, state.logo);
        }
      }
      const current = { profile, logoRevision };
      const envelope: Envelope = { version: 1, current, previous: this.revision };
      this.values.setItem(PROFILE_STORAGE_KEY, JSON.stringify(envelope));
      this.revision = current;
      this.storedLogo = state.logo;
      this.consistent = { profile, logo: state.logo };
      return this.consistent;
    } catch {
      throw new Error(
        'Firmaprofil og logo kunne ikke gemmes i denne browser. Den sidst konsistente profil bruges.',
      );
    }
  }
}
