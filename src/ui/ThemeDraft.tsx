/** Temaudkast (B-042): nuværende udseende over for forslaget. Kun til forelæggelse;
 * ingen data gemmes, og intet her ændrer de rigtige sider. */
import { useState, type ReactNode } from 'react';
import {
  Check,
  CircleAlert,
  CircleCheck,
  FileText,
  Building2,
  Info,
  Layers3,
  LineChart,
  PanelLeft,
  Plus,
  Redo2,
  RotateCcw,
  Trash2,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { defaults } from '../engine/data';
import { productPicker } from '../engine/product-picker';
import schema from '../engine/dimensioning-ui.json';
import settingsSchema from '../engine/settings-ui.json';
import { HelpHint } from './SettingField';
import { ProductPicker } from './ProductPicker';
import './theme-draft.css';

const NU_GRAA = [
  '#637068',
  '#65736d',
  '#64756a',
  '#63766b',
  '#627168',
  '#68756c',
  '#677c6c',
  '#7c877d',
  '#7a857d',
  '#7d887f',
  '#59745e',
  '#4a554e',
];
const NU_STOERRELSER = [8.5, 9.5, 10, 11, 12, 12.5, 13, 14, 15, 16, 18, 19, 24, 25, 26, 29, 32, 34];

function Section({
  number,
  title,
  changes,
  now,
  proposal,
}: {
  number: number;
  title: string;
  changes: string[];
  now: ReactNode;
  proposal: ReactNode;
}) {
  return (
    <section className="tema-sektion" aria-labelledby={`tema-${number}`}>
      <div className="tema-sektion-hoved">
        <h2 id={`tema-${number}`}>
          {number}. {title}
        </h2>
        <ul>
          {changes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <Tabs defaultValue="forslag" className="tema-forslag">
        <TabsList aria-label={`${title}: nu eller forslag`}>
          <TabsTrigger value="forslag">Forslag</TabsTrigger>
          <TabsTrigger value="nu">Nu</TabsTrigger>
        </TabsList>
        <TabsContent value="forslag" className="tema-ramme">
          {proposal}
        </TabsContent>
        <TabsContent value="nu" className="tema-ramme tema-nu">
          {now}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Shot({ name, alt }: { name: string; alt: string }) {
  return <img className="tema-shot" src={`/temaudkast/${name}.png`} alt={alt} />;
}

function SectionNumber({ children }: { children: ReactNode }) {
  return <span className="tema-nummer">{children}</span>;
}

function SectionCard({
  number,
  title,
  meta,
  highlight = false,
  children,
}: {
  number?: number;
  title: string;
  meta?: ReactNode;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className={`tema-kort${highlight ? ' tema-kort-fremhaevet' : ''}`}>
      <CardHeader className="tema-kort-hoved">
        <CardTitle className="tema-kort-titel">
          {number !== undefined && <SectionNumber>{number}</SectionNumber>}
          <h3>{title}</h3>
        </CardTitle>
        {meta && <CardAction className="tema-meta">{meta}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Kort, sammenhængende valg som segmenteret knaprække; stadig radioknapper for tastatur og skærmlæser. */
function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <RadioGroupPrimitive.Root
      className="tema-segment"
      aria-label={label}
      value={value}
      onValueChange={onChange}
      orientation="horizontal"
    >
      {options.map((o) => (
        <RadioGroupPrimitive.Item key={o} value={o} className="tema-segment-punkt">
          {o}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

function Radios({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="tema-radios">
      {options.map((o, i) => (
        <div key={o} className="tema-valg">
          <RadioGroupItem value={o} id={`${id}-${i}`} />
          <Label htmlFor={`${id}-${i}`}>{o}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}

function FieldLabel({ htmlFor, label, help }: { htmlFor?: string; label: string; help?: string }) {
  return (
    <div className="tema-etiket-raekke">
      {htmlFor ? (
        <Label htmlFor={htmlFor} className="tema-etiket">
          {label}
        </Label>
      ) : (
        <span className="tema-etiket">{label}</span>
      )}
      {help && <HelpHint label={label} help={help} />}
    </div>
  );
}

function ColorsAndType() {
  const tokens: [string, string, string][] = [
    ['Baggrund', '#f6f7f4', 'Sidens flade'],
    ['Kort', '#ffffff', 'Kort, felter, lister'],
    ['Tekst', '#263a32', 'Al almindelig tekst'],
    ['Dæmpet tekst', '#637068', 'Hjælpetekst, meta, kolonneoverskrifter'],
    ['Kant', '#dce3dd', 'Kort, tabeller, skillelinjer'],
    ['Primær', '#25584a', 'Hovedknap, valgt, afkrydset, nummer'],
    ['Topbjælke', '#173d39', 'Topbjælken'],
    ['Fremhævet', '#edf3ef', 'Valgt resultat, info, markering'],
    ['Advarsel', '#fff6df', 'Advarsler (tekst #826320)'],
    ['Fejl', '#fff1ef', 'Fejl (tekst #b42318)'],
  ];
  const scale: [string, string, string][] = [
    ['Sidetitel', 'tema-t-side', 'Dimensionering'],
    ['Afsnitstitel', 'tema-t-afsnit', 'Underbund og dimensioneringsgrundlag'],
    ['Brødtekst og felter', 'tema-t-broed', 'Angiv E-modul for underbunden.'],
    [
      'Tabeller og hjælpetekst',
      'tema-t-tabel',
      'Oftest målt ved belastningsforsøg i marken, eller skønnet.',
    ],
    ['Meta og mærker', 'tema-t-meta', 'Eᵤ 10 MPa · Klasse 4 · Eₒ 80 MPa'],
    ['Overetiket', 'tema-t-over', 'Underbundens styrke'],
  ];
  return (
    <div className="tema-to-kolonner">
      <div>
        <h4 className="tema-underoverskrift">Ti farver i stedet for 73</h4>
        <ul className="tema-farver">
          {tokens.map(([name, hex, use]) => (
            <li key={name}>
              <span className="tema-swatch" style={{ background: hex }} />
              <span>
                <strong>{name}</strong> <code>{hex}</code>
                <br />
                <small>{use}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="tema-underoverskrift">Seks skriftstørrelser i stedet for 18</h4>
        <dl className="tema-skala">
          {scale.map(([name, cls, sample]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd className={cls}>{sample}</dd>
            </div>
          ))}
        </dl>
        <p className="tema-note">
          Skriften er fortsat Segoe UI (Windows' systemskrift). Tal i tabeller og resultater får ens
          cifferbredde, så kolonner flugter.
        </p>
      </div>
    </div>
  );
}

function ColorsNow() {
  return (
    <div className="tema-to-kolonner">
      <div>
        <h4 className="tema-underoverskrift">12 af de 73 farvekoder er grå tekst</h4>
        <ul className="tema-nu-graa">
          {NU_GRAA.map((hex) => (
            <li key={hex}>
              <span className="tema-swatch" style={{ background: hex }} />
              <code>{hex}</code>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="tema-underoverskrift">18 skriftstørrelser</h4>
        <p className="tema-nu-stoerrelser">
          {NU_STOERRELSER.map((s) => (
            <span key={s} style={{ fontSize: Math.min(s, 22) }}>
              {String(s).replace('.', ',')}
            </span>
          ))}
        </p>
        <p className="tema-note">
          Fx 12, 12,5 og 13 px til hjælpetekst på forskellige sider, og knapper i 16 px ved siden af
          tekst i 13 px.
        </p>
      </div>
    </div>
  );
}

function HeaderProposal() {
  const [mode, setMode] = useState('Standard');
  return (
    <div className="tema-app-ramme">
      <header className="tema-topbar">
        <Button variant="ghost" size="sm" className="tema-topbar-menu">
          <PanelLeft aria-hidden="true" />
          Menu
        </Button>
        <div className="tema-brand">
          <Layers3 size={24} strokeWidth={1.6} aria-hidden="true" />
          <strong>MSL</strong>
          <span>Dimensionering</span>
        </div>
      </header>
      <div className="tema-app-indhold">
        <div className="tema-brodkrumme">Beregning / Dimensionering</div>
        <div className="tema-sidehoved">
          <div>
            <h3 className="tema-t-side">Dimensionering</h3>
            <p className="tema-intro">
              Bærelagstykkelse med og uden geonetarmering. Grundlaget er BG Byggros' designmanualer
              til Tensar og GS-GRID samt interne forsøgsdata.
            </p>
          </div>
          <Badge variant="outline" className="tema-gemt">
            <CircleCheck aria-hidden="true" />
            Gemt i denne browser
          </Badge>
        </div>
        <div className="tema-tilstand">
          <div>
            <FieldLabel
              label="Tilstand"
              help="Standard regner med designdiagrammernes referencemateriale. Brugerdefineret giver valg af materialelag."
            />
            <Segmented
              label="Tilstand"
              options={['Standard', 'Brugerdefineret']}
              value={mode}
              onChange={setMode}
            />
          </div>
          <Button variant="outline">
            <RotateCcw aria-hidden="true" />
            Nulstil dimensionering
          </Button>
        </div>
      </div>
    </div>
  );
}

function CardProposal() {
  const [input, setInput] = useState('Eᵤ — E-modul');
  const [eu, setEu] = useState([10]);
  const [basis, setBasis] = useState('Belastningsklasse');
  const [cls, setCls] = useState('4');
  return (
    <SectionCard
      number={1}
      title="Underbund og dimensioneringsgrundlag"
      meta={`Eᵤ ${eu[0]} MPa · Klasse ${cls} · Eₒ 80 MPa`}
    >
      <div className="tema-dim-grid">
        <div className="tema-felt-stak">
          <div className="tema-over">Underbundens styrke</div>
          <Radios
            id="tema-input"
            options={['Eᵤ — E-modul', 'Cv — vingestyrke']}
            value={input}
            onChange={setInput}
          />
          <div className="tema-slider">
            <div className="tema-slider-hoved">
              <Label id="tema-eu-label">Eᵤ (MPa)</Label>
              <span className="tema-vaerdi">{eu[0]}</span>
            </div>
            <Slider
              aria-labelledby="tema-eu-label"
              min={defaults.EU_MIN}
              max={defaults.EU_MAX}
              step={1}
              value={eu}
              onValueChange={setEu}
            />
            <p className="tema-hjaelp">
              Angiv E-modul for underbunden. Oftest målt ved belastningsforsøg i marken, eller
              skønnet.
            </p>
          </div>
        </div>
        <div className="tema-felt-stak">
          <div className="tema-over">Dimensioneringsgrundlag</div>
          <Radios
            id="tema-grundlag"
            options={['Belastningsklasse', 'Trafikklasse']}
            value={basis}
            onChange={setBasis}
          />
          <Segmented
            label="Belastningsklasse"
            options={['1', '2', '3', '4', '5', '6']}
            value={cls}
            onChange={setCls}
          />
          <Button variant="link" className="tema-link">
            <LineChart aria-hidden="true" />
            Se designdiagram
          </Button>
        </div>
        <div className="tema-noegletal">
          <strong>Klasse {cls}</strong>
          <p>Middel trafikerede veje, p-arealer, flydende gulve i lagerhaller</p>
          <dl>
            <dt>Belastning</dt>
            <dd>Middel trafik (akseltryk ≤ 8 t)</dd>
            <dt>Eₒ-kurve</dt>
            <dd>80 MPa</dd>
          </dl>
        </div>
      </div>
    </SectionCard>
  );
}

const productNames = (schema.fields.find((f) => f.key === 'std_geonet')?.options ?? []).map((o) =>
  String(o.value),
);

function ResultProposal() {
  const [product, setProduct] = useState('Tensar TriAx TX160');
  return (
    <SectionCard
      number={3}
      highlight
      title="Resultat"
      meta="Bærelagstykkelse over underbund med Eᵤ = 10 MPa, belastningsklasse 4"
    >
      <div className="tema-resultat-hoved">
        <h4 className="tema-underoverskrift">Vælg geonet</h4>
        <span className="tema-meta">
          Resultat, opbygning og mellemregninger opdateres med det valgte net
        </span>
      </div>
      <div className="tema-produkt">
        <ProductPicker
          id="tema-geonet"
          value={product}
          groups={productPicker(productNames, { selectedClass: 4 })}
          classLabel="belastningsklasse 4"
          onChange={setProduct}
        />
      </div>
      <div className="tema-fliser">
        <div className="tema-flise">
          <div className="tema-over">Nødvendig uden geonet</div>
          <div className="tema-tal">900 mm</div>
          <p>Ubunden opbygning</p>
        </div>
        <div className="tema-flise tema-flise-valgt">
          <div className="tema-flise-top">
            <div className="tema-over">1 lag geonet</div>
            <Badge>Tyndest</Badge>
          </div>
          <div className="tema-tal">650 mm</div>
          <p>
            <strong>−250 mm</strong> · 28 % tyndere
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="tema-anbefaling">
        <Info aria-hidden="true" />1 anbefaling
      </Button>
    </SectionCard>
  );
}

const afrunding = settingsSchema.sections[0];
const helpOf = (key: string) => afrunding.fields.find((f) => f.key === key)?.help;

function SettingsProposal() {
  const [step, setStep] = useState('50');
  const [red, setRed] = useState('Af de oprundede lagtykkelser');
  const [exact, setExact] = useState(false);
  const [phi, setPhi] = useState('Ingen afrunding');
  return (
    <SectionCard number={1} title="Afrunding" meta="50 mm · reduktion af oprundede tykkelser">
      <div className="tema-prosa">
        {afrunding.texts[0].split('\n\n').map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <Badge variant="outline" className="tema-gaelder">
        Gælder: Standard og Brugerdefineret
      </Badge>
      <div className="tema-felter">
        <div>
          <FieldLabel htmlFor="tema-trin" label="Oprundingstrin" help={helpOf('ind_afr_trin')} />
          <Select value={step} onValueChange={setStep}>
            <SelectTrigger id="tema-trin" className="tema-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 mm (ingen oprunding)</SelectItem>
              <SelectItem value="10">10 mm</SelectItem>
              <SelectItem value="50">50 mm</SelectItem>
              <SelectItem value="100">100 mm</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel label="Reduktion i mm og %" help={helpOf('ind_afr_reduktion')} />
          <Radios
            id="tema-red"
            options={['Af de oprundede lagtykkelser', 'Af de beregnede lagtykkelser']}
            value={red}
            onChange={setRed}
          />
        </div>
        <div className="tema-valg tema-valg-afkryds">
          <Checkbox
            id="tema-eksakt"
            checked={exact}
            onCheckedChange={(v) => setExact(v === true)}
          />
          <Label htmlFor="tema-eksakt">
            Anfør den beregnede lagtykkelse i parentes efter den oprundede
          </Label>
          <HelpHint
            label="Anfør den beregnede lagtykkelse i parentes efter den oprundede"
            help={helpOf('ind_afr_vis_eksakt') ?? ''}
          />
        </div>
        <div>
          <FieldLabel label="Afrunding af friktionsvinklen φᵥ" help={helpOf('ind_afr_phi')} />
          <Radios
            id="tema-phi"
            options={[
              'Ingen afrunding',
              'Nedrunding til hel grad',
              'Afrunding til nærmeste hele grad',
            ]}
            value={phi}
            onChange={setPhi}
          />
        </div>
      </div>
      <Alert className="tema-alert tema-alert-info">
        <Info aria-hidden="true" />
        <AlertDescription>
          Eksempel: en beregnet lagtykkelse på 502 mm angives som 550 mm.
        </AlertDescription>
      </Alert>
    </SectionCard>
  );
}

function MessagesProposal() {
  return (
    <div className="tema-beskeder">
      <div>
        <h4 className="tema-underoverskrift">Gælder-mærke</h4>
        <Badge variant="outline" className="tema-gaelder">
          Gælder: Standard og Brugerdefineret
        </Badge>
      </div>
      <Alert className="tema-alert tema-alert-info">
        <Info aria-hidden="true" />
        <AlertDescription>
          Eksempel: en beregnet lagtykkelse på 502 mm angives som 550 mm.
        </AlertDescription>
      </Alert>
      <Alert className="tema-alert tema-alert-advarsel">
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>Minimumstykkelser, der ikke går op i oprundingstrinnet på 50 mm.</AlertTitle>
        <AlertDescription>
          De oprundes til trinnet ved beregningen: klasse 5: 275 mm anvendes som 300 mm. Tabellen
          kan tilpasses trinnet, eller trinnet kan ændres i afsnit 1.
        </AlertDescription>
      </Alert>
      <Alert className="tema-alert tema-alert-fejl">
        <CircleAlert aria-hidden="true" />
        <AlertDescription>Ingen gyldig dimensionering for denne kombination.</AlertDescription>
      </Alert>
      <p className="tema-note">
        Info, advarsel og fejl. Teksterne er appens egne; en fed indledning bliver beskedens titel.
      </p>
    </div>
  );
}

function MessagesNow() {
  return (
    <div className="tema-beskeder">
      <Shot name="nu-gaelder" alt="Nu: Gælder-boks i Indstillinger" />
      <Shot name="nu-advarsel" alt="Nu: advarsel i Indstillinger" />
    </div>
  );
}

const materials = (
  defaults.MATERIAL_DB as {
    navn: string;
    phi: number;
    max_korn: number;
    lagtype: string;
    anvendelse: string;
    krav_maskestoerrelse_mm: number;
  }[]
)
  .filter((m) => m.lagtype === 'Bærelag')
  .slice(0, 4);

function TableProposal() {
  const [onlyChanges, setOnlyChanges] = useState(false);
  return (
    <div className="tema-felt-stak">
      <div className="tema-vaerktoej">
        <div className="tema-vaerktoej-gruppe">
          <Button variant="outline" size="sm" disabled>
            <Undo2 aria-hidden="true" />
            Fortryd
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Redo2 aria-hidden="true" />
            Gentag
          </Button>
          <div className="tema-valg">
            <Checkbox
              id="tema-aendringer"
              checked={onlyChanges}
              onCheckedChange={(v) => setOnlyChanges(v === true)}
            />
            <Label htmlFor="tema-aendringer">Vis kun ændringer</Label>
            <Badge variant="secondary">0</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <RotateCcw aria-hidden="true" />
          Nulstil til standard
        </Button>
      </div>
      <Card className="tema-kort tema-tabelkort">
        <CardHeader className="tema-kort-hoved">
          <CardTitle className="tema-kort-titel">
            <SectionNumber>1</SectionNumber>
            <h3>Bærelagsmaterialer</h3>
            <span className="tema-meta">6 materialer</span>
          </CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm">
              <Plus aria-hidden="true" />
              Tilføj materiale
            </Button>
          </CardAction>
        </CardHeader>
        <div className="tema-tabel-wrap">
          <table className="tema-tabel">
            <thead>
              <tr>
                <th>Materiale</th>
                <th className="tema-tal-kol">φᵢ (°)</th>
                <th className="tema-tal-kol">Maks. korn (mm)</th>
                <th className="tema-tal-kol">Krav til geonet — maskestørrelse (mm)</th>
                <th>Bemærkning</th>
                <th aria-label="Handlinger" />
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.navn}>
                  <td>
                    <input className="tema-celle" defaultValue={m.navn} aria-label="Materiale" />
                  </td>
                  <td className="tema-tal-kol">
                    <input className="tema-celle" defaultValue={m.phi} aria-label="φᵢ (°)" />
                  </td>
                  <td className="tema-tal-kol">
                    <input
                      className="tema-celle"
                      defaultValue={m.max_korn}
                      aria-label="Maks. korn (mm)"
                    />
                  </td>
                  <td className="tema-tal-kol">
                    <input
                      className="tema-celle"
                      defaultValue={m.krav_maskestoerrelse_mm}
                      aria-label="Krav til geonet"
                    />
                  </td>
                  <td>
                    <input
                      className="tema-celle"
                      defaultValue={m.anvendelse}
                      aria-label="Bemærkning"
                    />
                  </td>
                  <td className="tema-handling">
                    <Button variant="ghost" size="icon-sm" aria-label={`Slet ${m.navn}`}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReportProposal() {
  return (
    <div className="tema-felt-stak">
      <div className="tema-grundlag">
        <strong>Rapport baseret på:</strong> Standard · Eᵤ = 10 MPa · Klasse 4 (Eₒ = 80 MPa) ·
        Produkt: <strong>Tensar TriAx TX160</strong> · φᵥ = 37,0°
      </div>
      <Tabs defaultValue="rapport">
        <TabsList aria-label="Rapport og firmaprofil (udkast)" className="tema-faner">
          <TabsTrigger value="rapport">
            <FileText aria-hidden="true" />
            Rapport
          </TabsTrigger>
          <TabsTrigger value="profil">
            <Building2 aria-hidden="true" />
            Firmaprofil
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rapport">
          <SectionCard
            number={1}
            title="Sagsoplysninger"
            meta={<Badge variant="outline">Ikke udfyldt</Badge>}
          >
            <div className="tema-sag-top">
              <p className="tema-hjaelp">
                Felterne huskes automatisk til næste gang. Brug <strong>Nulstil felter</strong> for
                at rydde dem.
              </p>
              <Button variant="outline" size="sm">
                <RotateCcw aria-hidden="true" />
                Nulstil felter
              </Button>
            </div>
            <div className="tema-felter">
              <div>
                <FieldLabel htmlFor="tema-projekt" label="Projekt" />
                <Input id="tema-projekt" />
              </div>
              <div>
                <FieldLabel htmlFor="tema-beskrivelse" label="Beskrivelse" />
                <Textarea id="tema-beskrivelse" rows={2} />
              </div>
              <div>
                <FieldLabel htmlFor="tema-omfang" label="Omfang" />
                <Input id="tema-omfang" />
              </div>
              <div>
                <FieldLabel htmlFor="tema-for" label="Udføres for" />
                <Input id="tema-for" />
              </div>
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="profil">
          <p className="tema-note">Firmaprofilen følger samme kort og felter.</p>
        </TabsContent>
      </Tabs>
      <div className="tema-generer">
        <Button>
          <FileText aria-hidden="true" />
          Generér rapport
        </Button>
        <Button variant="outline" disabled>
          <Check aria-hidden="true" />
          Hent PDF
        </Button>
        <span className="tema-meta">Klar til at starte</span>
      </div>
    </div>
  );
}

export function ThemeDraft() {
  return (
    <main className="tema-udkast">
      <div className="breadcrumb">Udkast</div>
      <div className="page-heading">
        <div>
          <h1>Temaudkast</h1>
          <p className="intro">
            Forslag til et fælles tema for hele appen (B-042). Hvert afsnit kan skiftes mellem
            Forslag og Nu. Tekster, tal, valg og beregninger er uændrede; kun udseendet ændres.
            Felterne kan afprøves, men intet gemmes.
          </p>
        </div>
      </div>
      <Section
        number={1}
        title="Farver og skrift"
        changes={[
          'Alle sider bruger de samme ti farver og seks skriftstørrelser.',
          'Brandfarverne er uændrede: mørkegrøn topbjælke og grøn primærfarve.',
        ]}
        now={<ColorsNow />}
        proposal={<ColorsAndType />}
      />
      <Section
        number={2}
        title="Topbjælke og sidehoved"
        changes={[
          'Lavere topbjælke (56 px i stedet for 82 px), så der er mere plads til indholdet.',
          'Ens sidehoved på alle sider: sti, titel, indledning og »Gemt i denne browser«.',
          'Stien følger menuens grupper, fx »Beregning / Dimensionering« (i dag blandes »Grunddata« og »Opslag«).',
          'Korte valg som Tilstand og belastningsklasse 1–6 som segmenterede knapper.',
        ]}
        now={<Shot name="nu-sidehoved" alt="Nu: topbjælke og sidehoved på Dimensionering" />}
        proposal={<HeaderProposal />}
      />
      <Section
        number={3}
        title="Afsnitskort og felter"
        changes={[
          'shadcn Card, RadioGroup, Slider og Label: ens størrelse, afstand og fokusmarkering.',
          'Skyderens værdi står til højre for etiketten.',
          '»Se designdiagram« får ikon, så det ses, at det kan klikkes.',
        ]}
        now={<Shot name="nu-kort" alt="Nu: afsnit 1 på Dimensionering" />}
        proposal={<CardProposal />}
      />
      <Section
        number={4}
        title="Resultat"
        changes={[
          'Ens resultatfliser; reduktionen står i almindelig skrift (i dag fastbreddeskrift).',
          '»Tyndest« som mærke i primærfarven; produktvælgeren er uændret (B-054/B-056).',
        ]}
        now={<Shot name="nu-resultat" alt="Nu: resultatafsnittet på Dimensionering" />}
        proposal={<ResultProposal />}
      />
      <Section
        number={5}
        title="Indstillinger"
        changes={[
          'Valglister som shadcn Select i stedet for browserens egen liste.',
          'Afkrydsning og radioknapper som shadcn Checkbox og RadioGroup (B-052-farven bevares).',
          '»Gælder: …« som lille mærke under overskriften i stedet for en grå boks.',
          'Brødtekst i 14 px som på de øvrige sider (i dag 13 px).',
        ]}
        now={<Shot name="nu-indstillinger" alt="Nu: afsnit 1 Afrunding i Indstillinger" />}
        proposal={<SettingsProposal />}
      />
      <Section
        number={6}
        title="Beskeder"
        changes={[
          'Én beskedtype (shadcn Alert) i tre udgaver: info, advarsel og fejl, hver med ikon.',
          'Erstatter fem forskellige bokse i dag.',
        ]}
        now={<MessagesNow />}
        proposal={<MessagesProposal />}
      />
      <Section
        number={7}
        title="Tabeller og knapper"
        changes={[
          'Lavere rækker, tal højrestillet med ens cifferbredde.',
          'Knapper i samme størrelse og skrift som resten af siden (i dag 16 px), med ikon.',
          'Én hovedknap pr. side; øvrige knapper er omridsede eller diskrete.',
          'De globale tabelregler fjernes, så tabeller ikke længere tvinges 1030 px brede.',
        ]}
        now={<Shot name="nu-materialer" alt="Nu: værktøjslinje og tabel på Materialer" />}
        proposal={<TableProposal />}
      />
      <Section
        number={8}
        title="Rapport"
        changes={[
          'Fanerne Rapport og Firmaprofil som tydelige faner med ikon.',
          'Status som »Ikke udfyldt« som mærke; knapper med ikon.',
        ]}
        now={<Shot name="nu-rapport" alt="Nu: faner og Sagsoplysninger på Rapport" />}
        proposal={<ReportProposal />}
      />
    </main>
  );
}
