// Isolated PDF candidate. Existing brand/content for comparison, not approved design.
#let report = json(sys.inputs.at("data"))
#let d = report.context
#set document(title: "MSL opbygning veje/pladser", author: d.sagsbehandler, date: none)
#set text(font: "Calibri", size: 11pt, lang: "da", hyphenate: false)
#set par(leading: 0.55em, spacing: 0.85em)
#set page(
  paper: "a4",
  margin: (top: 30mm, bottom: 27.5mm, left: 20mm, right: 20mm),
  header-ascent: 0mm,
  header: context if counter(page).get().first() == 1 {
    align(right)[#image("assets/image1.jpeg", width: 44mm) \ #text(size: 9pt, style: "italic")[Skaber sikre løsninger]]
  },
  footer-descent: 4mm,
  footer: context [
    #set par(spacing: 0pt, leading: 0pt)
    #align(center)[#text(size: 9pt)[\[#counter(page).display()\]]]
    #if counter(page).get().first() == 1 {
      v(3mm)
      block(width: 100%, fill: rgb("247322"), inset: 3mm)[
        #set text(font: "Arial", size: 8pt, fill: white)
        #align(center)[BG Byggros A/S | Østbirkvej 2 | 5240 Odense NV | Tlf. 5948 9000 | www.byggros.com]
      ]
    }
  ],
)
#let plain(value) = {
  // JSON strings remain text. Never evaluate user input as Typst source.
  let lines = value.split("\n")
  for (i, line) in lines.enumerate() {
    if i > 0 { linebreak() }
    text(line)
  }
}
#let head(title) = block(above: 1em, below: 0.3em, sticky: true, strong(title))
#let rows(items) = table(
  columns: (42%, 58%),
  stroke: none,
  inset: (x: 2pt, y: 4pt),
  ..items.map(row => (strong(plain(row.label)), plain(row.vaerdi))).flatten(),
)
#let section(title, value) = {
  head(title)
  plain(value)
  parbreak()
}
#text(size: 24pt)[NOTAT – MSL opbygning veje/pladser]
#v(6mm)
#text(size: 16pt, weight: "bold")[Projekt: #plain(d.projekt)]
#v(7mm)
#table(columns: (30mm, 1fr), stroke: none, inset: (y: 5pt),
  [*Beskrivelse:*], plain(d.beskrivelse),
  [*Omfang:*], plain(d.omfang),
  [*Udføres for:*], plain(d.udfoeres_for),
  [*Udført af:*], plain(d.sagsbehandler),
  [*Kontrol:*], plain(d.kontrol),
)
#head("Dimensioneringsgrundlag:")
#emph[Forudsætninger:]

#plain(d.tekst_oplyste_forudsaetninger)

#if d.dim_grundlag.len() > 0 {
  emph[Grundlag for beregning:]
  rows(d.dim_grundlag)
}
#section("Generelle dimensioneringsforudsætninger for MSL opbygning:", d.tekst_generelle_forudsaetninger)
#block(breakable: false)[
  #head("Dimensioneringsresultat:")
  Baseret på ovennævnte indgangsparametre kan vi foreslå følgende MSL opbygning:
  #rows(d.dim_resultat)
]
#for key in ("visualisering", "designdiagram") {
  let value = d.at(key)
  if type(value) == dictionary {
    block(breakable: false, image(value.image, width: value.width_cm * 1cm, alt: if key == "visualisering" {"Opbygning fra den gamle app"} else {"Designdiagram fra den gamle app"}))
  }
}
#section("Krav til komprimering:", d.tekst_krav_komprimering)
#section("Dimensionering og sikkerhed:", d.tekst_dim_sikkerhed)
#section("Udførelse:", d.tekst_udfoerelse)
#section("Kontrolplan:", d.tekst_kontrolplan)
#section("Projekteringsansvar:", d.tekst_projekteringsansvar)
#v(3mm)
*Odense d.* #plain(d.dato)

#plain(d.sagsbehandler) \
#plain(d.sagsbehandler_mail)
