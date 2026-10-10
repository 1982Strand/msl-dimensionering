import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { Hint } from './Hint';
import { Button } from '../components/ui/button';
import { useEditor } from './EditorContext';
import {
  formelLinjer,
  helpViewModel,
  laes_kapitler,
  HJAELP_STANDARD_KAPITEL,
  HJAELP_SIDEHOVED,
  HJAELP_UNDERTEKST,
  HJAELP_INTRO_TITEL,
  HJAELP_INTRO_NOTE,
  HJAELP_INTRO,
  HJAELP_TRIN_TITEL,
  HJAELP_TRIN,
  HJAELP_BEGREBER_TITEL,
  HJAELP_NOEGLEBEGREBER,
  type Formel,
} from '../engine/hjaelp';
import './Help.css';
import { PageHeader } from './page';

const kapitler = laes_kapitler(
  import.meta.glob<string>('../content/hjaelp/*.md', {
    query: '?raw',
    eager: true,
    import: 'default',
  }),
);
function readOpenChapters(saved: unknown): string[] {
  if (Array.isArray(saved) && saved.every((key) => typeof key === 'string')) {
    return saved.filter((key) => kapitler.some((k) => k.noegle === key));
  }
  return [HJAELP_STANDARD_KAPITEL];
}
function Markdown({ children }: { children: string }) {
  return (
    <div className="help-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Brede tabeller ruller vandret og skal kunne nås med tastaturet.
          table: ({ node: _node, ...props }) => (
            <div className="help-table-scroll" tabIndex={0} role="region" aria-label="Tabel">
              <table {...props} />
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
function Formula({ formula }: { formula: Formel }) {
  const lines = formelLinjer(formula);
  return (
    <div className="help-formula" data-testid="help-formula">
      <div className="help-expression">
        {lines.udtryk.map((line, i) => (
          <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
        ))}
      </div>
      {lines.hvor.length > 0 && (
        <div className="help-where">
          hvor:
          {lines.hvor.map((line, i) => (
            <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
          ))}
        </div>
      )}
    </div>
  );
}
export function Help() {
  const { session, remember, saveError, externalChange } = useEditor();
  const open = readOpenChapters(session.values.hjaelp_aabne);
  const chapters = helpViewModel(kapitler, open);
  function changeOpen(keys: string[]) {
    remember({ hjaelp_aabne: keys });
  }
  return (
    <main className="help-page">
      <PageHeader page="hjaelp" title={HJAELP_SIDEHOVED} intro={HJAELP_UNDERTEKST} />
      <section className="help-intro" aria-labelledby="help-intro-title">
        <div className="help-card-header">
          <h2 id="help-intro-title">{HJAELP_INTRO_TITEL}</h2>
          <p>{HJAELP_INTRO_NOTE}</p>
        </div>
        <div className="help-intro-grid">
          <Markdown>{HJAELP_INTRO}</Markdown>
          <div className="help-steps">
            <h3>{HJAELP_TRIN_TITEL}</h3>
            <ol>
              {HJAELP_TRIN.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <h3>{HJAELP_BEGREBER_TITEL}</h3>
            <div className="help-concepts">
              {HJAELP_NOEGLEBEGREBER.map(([name, explanation]) => (
                <Hint key={name} content={explanation}>
                  <button type="button" className="help-concept">
                    {name}
                  </button>
                </Hint>
              ))}
            </div>
          </div>
        </div>
      </section>
      {saveError && <p role="status">Åbne kapitler kunne ikke gemmes i browserens lager.</p>}
      {externalChange && (
        <p role="alert">
          Data er ændret i en anden fane. Genindlæs siden, før der redigeres videre.
        </p>
      )}
      <Accordion type="multiple" value={open} onValueChange={changeOpen} className="help-chapters">
        {chapters.map((chapter) => (
          <AccordionItem key={chapter.noegle} value={chapter.noegle} className="help-chapter">
            <AccordionTrigger
              className="help-chapter-trigger"
              aria-label={chapter.knaptekst}
              disabled={externalChange}
            >
              <span className="help-chapter-number">{chapter.nummer}</span>
              <span className="help-chapter-summary">
                <span className="help-chapter-title">{chapter.titel}</span>
                <span className="help-chapter-resume">{chapter.resume}</span>
              </span>
              <span className="help-chapter-count">{chapter.afsnitTal}</span>
            </AccordionTrigger>
            <AccordionContent className="help-chapter-content">
              {chapter.afsnit.map((section) => (
                <section
                  key={section.nummer}
                  className="help-section"
                  aria-labelledby={`help-${chapter.noegle}-${section.nummer}`}
                >
                  <div>
                    <h3 id={`help-${chapter.noegle}-${section.nummer}`}>
                      <span className="help-section-number">{section.nummer}</span>
                      {section.titel}
                    </h3>
                    {section.indhold.map((part, i) => {
                      if (!part) return null;
                      if (typeof part === 'string') return <Markdown key={i}>{part}</Markdown>;
                      if (part._type === 'Formel') return <Formula key={i} formula={part} />;
                      if (part._type === 'Gaatil')
                        return (
                          <Button asChild key={i} variant="outline" className="help-goto">
                            <a href={part.href}>{part.tekst}</a>
                          </Button>
                        );
                      return (
                        <div className="help-sources" key={i}>
                          {part.poster.map((doc, j) => (
                            <a href={doc.url} key={j} target="_blank" rel="noopener noreferrer">
                              <span>{doc.titel}</span>
                              <small>{[doc.udgiver, doc.dato].filter(Boolean).join(' · ')}</small>
                            </a>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  <div className="help-aside">
                    {section.figurer.map((figure) => (
                      <figure key={figure.nummerTekst}>
                        <div className="help-figure-number">{figure.nummerTekst}</div>
                        <Markdown>{figure.tabel}</Markdown>
                        <figcaption>{figure.tekst}</figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </main>
  );
}
