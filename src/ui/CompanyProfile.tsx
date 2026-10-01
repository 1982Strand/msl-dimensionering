import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { Button } from '../components/ui/button';
import { formatPhone } from '../report/phone-format';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  changeProfileField,
  defaultProfileState,
  exportCompanyProfile,
  importCompanyProfile,
  logoDataUrl,
  MAX_LOGO_BYTES,
  PROFILE_LIMITS,
  profileValue,
  validateLogo,
  employeeErrors,
  type Employee,
  type ProfileLogo,
  type ProfileState,
} from '../report/company-profile';
import { CompanyProfileStorage, IndexedDbLogoStorage } from '../report/profile-storage';
import './CompanyProfile.css';

export function useCompanyProfile() {
  const [state, setState] = useState(defaultProfileState);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reset, setReset] = useState(0);
  const store = useRef<CompanyProfileStorage | null>(null);
  const desired = useRef(state);
  const generation = useRef(0);
  const tail = useRef(Promise.resolve());
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    try {
      const storage = new CompanyProfileStorage(localStorage, new IndexedDbLogoStorage());
      store.current = storage;
      void storage.load().then((loaded) => {
        if (!active) return;
        desired.current = loaded.state;
        setState(loaded.state);
        setError(loaded.error);
        setReady(true);
      });
    } catch {
      setError('Browserens profillager er utilgængeligt. Standardprofilen bruges.');
      setReady(true);
    }
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);
  function update(producer: (previous: ProfileState) => ProfileState, clearDraft = false) {
    const next = producer(desired.current);
    desired.current = next;
    const id = ++generation.current;
    setSaving(true);
    setError(null);
    tail.current = tail.current.then(async () => {
      if (id !== generation.current) return;
      try {
        if (!store.current)
          throw new Error(
            'Browserens profillager er utilgængeligt. Den sidst konsistente profil bruges.',
          );
        const saved = await store.current.save(next);
        if (id !== generation.current || !mounted.current) return;
        desired.current = saved;
        setState(saved);
        setSaving(false);
        if (clearDraft) setReset((n) => n + 1);
      } catch (e) {
        ++generation.current; // Annullér ændringer, der endnu ikke er gemt.
        desired.current = store.current?.consistent ?? defaultProfileState();
        if (!mounted.current) return;
        setState(desired.current);
        setSaving(false);
        setReset((n) => n + 1);
        setError(e instanceof Error ? e.message : 'Firmaprofilen kunne ikke gemmes.');
      }
    });
  }
  return { state, ready, saving, error, reset, update };
}

async function checkImage(logo: ProfileLogo) {
  validateLogo(logo);
  const image = new Image();
  image.src = logoDataUrl(logo);
  try {
    await image.decode();
  } catch {
    throw new Error('Logoet kunne ikke læses som et billede.');
  }
}

export function CompanyProfile({
  controller,
  preview,
  standardLogo,
}: {
  controller: ReturnType<typeof useCompanyProfile>;
  preview: ReactNode;
  standardLogo: () => Promise<ProfileLogo>;
}) {
  const { state, ready, saving, error, reset, update } = controller;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setDrafts({});
    setErrors({});
    setFileError(null);
  }, [reset]);
  const profile = state.profile;
  const logoSource = useMemo(
    () =>
      state.logo
        ? logoDataUrl(state.logo)
        : `${import.meta.env.BASE_URL}report/logo/byggros_logo.jpeg`,
    [state.logo],
  );
  function field(path: string, label: string, options?: [string, string][] | 'textarea') {
    const range = PROFILE_LIMITS[path];
    // Standardværdierne er omregnet nøjagtigt fra Word-skabelonens enheder (fx 42,626… mm);
    // feltet viser højst én decimal, mens profilen bevarer den nøjagtige værdi, til feltet ændres.
    const raw = profileValue(profile, path);
    const shown =
      range && typeof raw === 'number' && !Number.isInteger(raw)
        ? String(Math.round(raw * 10) / 10)
        : String(raw);
    const value = drafts[path] ?? shown;
    const id = 'profile-' + path;
    const change = (text: string) => {
      const parsed = range ? (text.trim() === '' ? NaN : Number(text)) : text;
      const result = changeProfileField(profile, path, parsed);
      setDrafts((prev) => ({ ...prev, [path]: text }));
      setErrors((prev) => ({ ...prev, [path]: result.error ?? '' }));
      if (!result.error)
        update((prev) => ({
          ...prev,
          profile: changeProfileField(prev.profile, path, parsed).profile,
        }));
    };
    const props = {
      id,
      value,
      'aria-invalid': !!errors[path],
      'aria-describedby': errors[path] ? id + '-error' : undefined,
    };
    return (
      <div className="setting-field profile-field" key={path}>
        <label htmlFor={id}>{label}</label>
        {Array.isArray(options) ? (
          <select {...props} onChange={(e) => change(e.target.value)}>
            {options.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        ) : options === 'textarea' ? (
          <Textarea {...props} rows={2} onChange={(e) => change(e.target.value)} />
        ) : (
          <Input
            {...props}
            type={range ? 'number' : 'text'}
            min={range?.[0]}
            max={range?.[1]}
            step="any"
            onChange={(e) => change(e.target.value)}
          />
        )}
        {errors[path] && (
          <p className="profile-field-error" id={id + '-error'}>
            {errors[path]}
          </p>
        )}
      </div>
    );
  }
  function checkbox(path: string, label: string) {
    return (
      <div className="setting-field" key={path}>
        <label className="setting-checkbox profile-checkbox">
          <input
            type="checkbox"
            checked={!!profileValue(profile, path)}
            onChange={(e) => {
              const checked = e.target.checked;
              update((prev) => ({
                ...prev,
                profile: changeProfileField(prev.profile, path, checked).profile,
              }));
            }}
          />
          {label}
        </label>
      </div>
    );
  }
  function card(number: number, title: string, content: ReactNode) {
    return (
      <section className="section-card settings-card" aria-labelledby={'profile-card-' + number}>
        {/* Samme afsnitshoved som rapport- og dimensioneringssiden (data-m9-slot giver stilen). */}
        <div data-m9-slot="profile">
          <div className="bg-trin-hoved">
            <h2 id={'profile-card-' + number}>
              <span className="bg-trin-nr">{number}</span>
              <span className="bg-trin-titel">{title}</span>
            </h2>
          </div>
        </div>
        <div className="profile-card-content">{content}</div>
      </section>
    );
  }
  async function task(work: () => Promise<void>) {
    setFileError(null);
    setBusy(true);
    try {
      await work();
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'Filen kunne ikke læses.');
    } finally {
      setBusy(false);
    }
  }
  const fonts: [string, string][] = [
    ['Carlito', 'Carlito'],
    ['Liberation Sans', 'Liberation Sans'],
  ];
  return (
    <div className="company-profile-grid">
      <div>
        <p className="report-caption">
          Profilen gælder alle rapporter. Gyldige ændringer gemmes automatisk i denne browser.
        </p>
        <p
          role="status"
          data-testid="profile-save-state"
          data-state={!ready ? 'loading' : saving ? 'saving' : error ? 'error' : 'saved'}
        >
          {!ready
            ? 'Indlæser firmaprofil'
            : saving
              ? 'Gemmer firmaprofil'
              : error
                ? 'Firmaprofilen er ikke gemt'
                : 'Firmaprofil gemt i denne browser'}
        </p>
        {(error || fileError) && (
          <Alert variant="destructive">
            <AlertDescription>{error ?? fileError}</AlertDescription>
          </Alert>
        )}
        <fieldset className="report-form" disabled={!ready || busy}>
          {card(
            1,
            'Logo',
            <>
              <img className="profile-logo" alt="Aktuelt firmalogo" src={logoSource} />
              <div className="profile-actions">
                <Button type="button" variant="outline" onClick={() => logoInput.current?.click()}>
                  Vælg logo …
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => update((prev) => ({ ...prev, logo: null }))}
                >
                  Brug standardlogo
                </Button>
              </div>
              <input
                ref={logoInput}
                type="file"
                hidden
                aria-label="Logofil"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file)
                    void task(async () => {
                      if (file.size > MAX_LOGO_BYTES)
                        throw new Error('Logoet må højst fylde 2 MB.');
                      const logo = {
                        mime: file.type as ProfileLogo['mime'],
                        bytes: new Uint8Array(await file.arrayBuffer()),
                      };
                      await checkImage(logo);
                      update((prev) => ({ ...prev, logo }));
                    });
                }}
              />
              <p className="report-caption">PNG, JPEG eller SVG, højst 2 MB.</p>
              {field('logo_bredde_mm', 'Logobredde (mm)')}
              {checkbox('logo_paa_alle_sider', 'Logo på alle sider')}
            </>,
          )}
          {card(
            2,
            'Identitet',
            <>
              {field('slogan', 'Slogan under logoet')}
              {field('sidefod', 'Kontaktlinje i sidefoden', 'textarea')}
              {(['farve', 'sidefod_tekstfarve'] as const).map((path) => (
                <div className="profile-color" key={path}>
                  {field(path, path === 'farve' ? 'Firmafarve' : 'Tekstfarve i sidefod')}
                  <input
                    type="color"
                    aria-label={path === 'farve' ? 'Vælg firmafarve' : 'Vælg tekstfarve i sidefod'}
                    value={profile[path]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDrafts((prev) => ({ ...prev, [path]: value }));
                      setErrors((prev) => ({ ...prev, [path]: '' }));
                      update((prev) => ({
                        ...prev,
                        profile: changeProfileField(prev.profile, path, value).profile,
                      }));
                    }}
                  />
                </div>
              ))}
              {checkbox('overskrifter_i_farve', 'Overskrifter i firmafarve')}
            </>,
          )}
          {card(
            3,
            'Skrift',
            <>
              {field('skrift.broedtekst', 'Brødtekst', fonts)}
              {field('skrift.sidehoved', 'Sidehoved og sidefod', fonts)}
              {field('skrift.stoerrelse_pt', 'Skriftstørrelse, brødtekst (pt)')}
            </>,
          )}
          {card(
            4,
            'Margener',
            <div className="profile-margins">
              {(['top', 'bund', 'venstre', 'hoejre'] as const).map((key, i) =>
                field(
                  'margener_mm.' + key,
                  ['Top (mm)', 'Bund (mm)', 'Venstre (mm)', 'Højre (mm)'][i],
                ),
              )}
            </div>,
          )}
          {card(
            5,
            'Sidetal',
            field('sidetal', 'Sidetal', [
              ['klammer', '[1]'],
              ['side-af', 'Side 1 af 3'],
            ]),
          )}
          {card(
            6,
            'Faste tekster',
            <>
              {field('titel', 'Rapporttitel')}
              {field('by', 'By i underskriften')}
            </>,
          )}
          {card(
            7,
            'Afslutning',
            <>
              <p className="report-caption">
                Alle fem afsnit indgår altid. Teksterne redigeres under Rapport.
              </p>
              {profile.afsluttende_afsnit.map((section, i, all) => (
                <div className="profile-section-row" key={section.noegle}>
                  <div className="setting-field">
                    <label htmlFor={'profile-' + section.noegle}>Overskrift {i + 1}</label>
                    <Input
                      id={'profile-' + section.noegle}
                      value={drafts[section.noegle] ?? section.titel}
                      onChange={(e) => {
                        const title = e.target.value;
                        setDrafts((prev) => ({ ...prev, [section.noegle]: title }));
                        update((prev) => ({
                          ...prev,
                          profile: {
                            ...prev.profile,
                            afsluttende_afsnit: prev.profile.afsluttende_afsnit.map((s) =>
                              s.noegle === section.noegle ? { ...s, titel: title } : s,
                            ),
                          },
                        }));
                      }}
                    />
                  </div>
                  {[-1, 1].map((direction) => (
                    <Button
                      type="button"
                      key={direction}
                      variant="outline"
                      aria-label={`Flyt afsnit ${i + 1} ${direction < 0 ? 'op' : 'ned'}`}
                      disabled={saving || i + direction < 0 || i + direction >= all.length}
                      onClick={() =>
                        update((prev) => {
                          const sections = [...prev.profile.afsluttende_afsnit];
                          [sections[i], sections[i + direction]] = [
                            sections[i + direction],
                            sections[i],
                          ];
                          return {
                            ...prev,
                            profile: { ...prev.profile, afsluttende_afsnit: sections },
                          };
                        })
                      }
                    >
                      {direction < 0 ? '↑' : '↓'}
                    </Button>
                  ))}
                </div>
              ))}
            </>,
          )}
          {card(
            8,
            'Medarbejdere',
            ready && (
              <Employees
                key={reset}
                profile={profile.medarbejdere}
                disabled={busy || saving}
                onChange={(medarbejdere) =>
                  update((prev) => ({ ...prev, profile: { ...prev.profile, medarbejdere } }))
                }
              />
            ),
          )}
          <div className="profile-actions">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                if (
                  window.confirm(
                    'Nulstil firmaprofilen til standard? Eget logo og ændrede værdier fjernes.',
                  )
                )
                  update(defaultProfileState, true);
              }}
            >
              Nulstil firmaprofil til standard
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() =>
                void task(async () => {
                  const json = exportCompanyProfile(
                    state,
                    state.logo ? undefined : await standardLogo(),
                  );
                  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'firmaprofil.json';
                  a.click();
                  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                })
              }
            >
              Eksportér profil
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => importInput.current?.click()}
            >
              Importér profil …
            </Button>
            <input
              ref={importInput}
              type="file"
              hidden
              aria-label="Profilfil"
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file)
                  void task(async () => {
                    const imported = importCompanyProfile(await file.text(), await standardLogo());
                    if (imported.logo) await checkImage(imported.logo);
                    update(() => imported, true);
                  });
              }}
            />
          </div>
        </fieldset>
      </div>
      <aside className="profile-preview" aria-label="Aktuel rapport">
        {preview}
      </aside>
    </div>
  );
}

const employeeFields = [
  ['navn', 'Navn'],
  ['initialer', 'Initialer'],
  ['mail', 'Mail'],
  ['telefon', 'Telefon'],
] as const;
function emptyEmployee(): Employee {
  return { navn: '', initialer: '', mail: '', telefon: '' };
}

function EmployeeField({
  field,
  label,
  id,
  value,
  error,
  onChange,
  inputRef,
  compact = false,
  onSave,
}: {
  field: keyof Employee;
  label: string;
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  compact?: boolean;
  onSave?: () => void;
}) {
  return (
    <div className="setting-field profile-field">
      <label htmlFor={id} className={compact ? 'sr-only' : undefined}>
        {label}
      </label>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        aria-invalid={!!error}
        aria-describedby={error ? id + '-error' : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          if (field === 'telefon') onChange(formatPhone(event.target.value));
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onSave) {
            event.preventDefault();
            onSave();
          }
        }}
      />
      {error && (
        <p className="profile-field-error" id={id + '-error'}>
          {error}
        </p>
      )}
    </div>
  );
}

function EmployeeRow({
  person,
  index,
  disabled,
  locked,
  active,
  onEditing,
  onSave,
  onDelete,
}: {
  person: Employee;
  index: number;
  disabled: boolean;
  locked: boolean;
  active: boolean;
  onEditing: (editing: boolean) => void;
  onSave: (person: Employee) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Employee | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Employee, string>>>({});
  function save() {
    if (!draft || !active || disabled) return;
    const next = { ...draft, telefon: formatPhone(draft.telefon) };
    const invalid = employeeErrors(next);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    onSave(next);
    setDraft(null);
    setErrors({});
    onEditing(false);
  }
  return (
    <TableRow>
      {(['initialer', 'navn', 'mail', 'telefon'] as const).map((key) => (
        <TableCell key={key}>
          {draft && active ? (
            <fieldset disabled={disabled}>
              <EmployeeField
                field={key}
                label={employeeFields.find(([field]) => field === key)![1]}
                id={`employee-edit-${index}-${key}`}
                value={draft[key]}
                error={errors[key]}
                compact
                onSave={save}
                onChange={(value) => {
                  const next = { ...draft, [key]: value };
                  setDraft(next);
                  if (Object.keys(errors).length) setErrors(employeeErrors(next));
                }}
              />
            </fieldset>
          ) : key === 'telefon' ? (
            formatPhone(person[key])
          ) : (
            person[key]
          )}
        </TableCell>
      ))}
      <TableCell>
        <div className="profile-employee-row-actions">
          {draft && active ? (
            <>
              <Button type="button" disabled={disabled} onClick={save}>
                Gem
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraft(null);
                  setErrors({});
                  onEditing(false);
                }}
              >
                Fortryd
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || locked}
                onClick={() => {
                  setDraft({ ...person, telefon: formatPhone(person.telefon) });
                  onEditing(true);
                }}
              >
                Ret
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || locked}
                onClick={() => {
                  if (window.confirm(`Slet medarbejderen ${person.navn}?`)) onDelete();
                }}
              >
                Slet
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** B-050/B-051: tilføjelse i Popover; kartotek og redigering i Sheet. */
function Employees({
  profile,
  disabled,
  onChange,
}: {
  profile: Employee[];
  disabled: boolean;
  onChange: (people: Employee[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [person, setPerson] = useState<Employee>(emptyEmployee);
  const [errors, setErrors] = useState<Partial<Record<keyof Employee, string>>>({});
  const nameInput = useRef<HTMLInputElement>(null);
  function add() {
    const next = { ...person, telefon: formatPhone(person.telefon) };
    const invalid = employeeErrors(next);
    setErrors(invalid);
    if (disabled || Object.keys(invalid).length) return;
    onChange([...profile, next]);
    setPerson(emptyEmployee());
    setErrors({});
    setAdding(false);
  }
  return (
    <>
      <p className="report-caption">
        Personerne kan vælges som sagsbehandler og kvalitetssikring under Sagsoplysninger.
        Oplysninger gemmes i denne browser.
      </p>
      <div className="profile-actions">
        <Popover open={adding} onOpenChange={setAdding}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" disabled={disabled}>
              Tilføj medarbejder
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="profile-employee-popover"
            aria-label="Tilføj medarbejder"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              nameInput.current?.focus();
            }}
          >
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                add();
              }}
            >
              <fieldset disabled={disabled}>
                {employeeFields.map(([key, label]) => (
                  <EmployeeField
                    key={key}
                    field={key}
                    label={label}
                    id={'employee-add-' + key}
                    value={person[key]}
                    error={errors[key]}
                    inputRef={key === 'navn' ? nameInput : undefined}
                    onChange={(value) => {
                      const next = { ...person, [key]: value };
                      setPerson(next);
                      if (Object.keys(errors).length) setErrors(employeeErrors(next));
                    }}
                  />
                ))}
                <Button type="submit">Tilføj</Button>
              </fieldset>
            </form>
          </PopoverContent>
        </Popover>
        <Sheet
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <SheetTrigger asChild>
            <Button type="button" variant="outline" disabled={disabled}>
              Åbn kartotek ({profile.length})
            </Button>
          </SheetTrigger>
          <SheetContent className="profile-employee-sheet" showCloseButton={false}>
            <SheetHeader>
              <SheetTitle>Medarbejderkartotek</SheetTitle>
              <SheetDescription>Ret eller slet personer i kartoteket.</SheetDescription>
              <SheetClose asChild>
                <Button type="button" variant="outline" className="self-start">
                  Luk kartotek
                </Button>
              </SheetClose>
            </SheetHeader>
            <div className="profile-employee-catalogue">
              {profile.length === 0 ? (
                <p>Kartoteket er tomt.</p>
              ) : (
                <Table aria-label="Medarbejdere">
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Initialer</TableHead>
                      <TableHead scope="col">Navn</TableHead>
                      <TableHead scope="col">Mail</TableHead>
                      <TableHead scope="col">Telefon</TableHead>
                      <TableHead scope="col">
                        <span className="sr-only">Handlinger</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.map((value, index) => (
                      <EmployeeRow
                        key={index}
                        person={value}
                        index={index}
                        disabled={disabled}
                        locked={editing !== null}
                        active={editing === index}
                        onEditing={(active) => setEditing(active ? index : null)}
                        onSave={(next) => onChange(profile.map((p, i) => (i === index ? next : p)))}
                        onDelete={() => onChange(profile.filter((_, i) => i !== index))}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
