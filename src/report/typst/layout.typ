// Oprindelse: kopieret fra C:/Users/dst/Documents/MSL-rapportdemo/skabelon/layout.typ.
// R3: Word-skabelon/a330cfd; mål fra spikes/report-typescript/layout.typ.
// Alle variable værdier læses som JSON; ingen eval/markup fra formularfelter.
#let felt-bredde = 85.05pt
#let tabel-bredde = 198.2pt
#let figur-bredde = 160mm // core/rapport.py: InlineImage(width=Cm(16)).
#let rapport(profil, report) = {
  let data = report.context
  let farve = rgb(profil.farve)
  let m = profil.margener_mm
  let skrift = profil.skrift
  let line = 13.44pt * skrift.stoerrelse_pt / 11
  set document(title: profil.titel, author: data.sagsbehandler, date: none)
  // Words enkelte linjeafstand: linjen fylder skriftens ascender + descender
  // (Carlito 11 pt = 13,4 pt), så linjer, afsnit og tabelrækker følger samme gitter.
  set text(font: skrift.broedtekst, size: skrift.stoerrelse_pt * 1pt, lang: "da",
    hyphenate: false, ligatures: false, top-edge: "ascender", bottom-edge: "descender")
  set par(leading: 0pt, spacing: 0pt)
  set block(above: 0pt, below: 0pt)
  let sidetal() = {
    let nr = counter(page).display("1")
    if profil.sidetal == "side-af" { [Side #nr af #counter(page).final().first()] }
    else { [\[#nr\]] }
  }
  set page(paper: "a4",
    margin: (top: m.top * 1mm, bottom: m.bund * 1mm, left: m.venstre * 1mm, right: m.hoejre * 1mm),
    background: context {
      set text(font: skrift.sidehoved, top-edge: "cap-height", bottom-edge: "baseline")
      if profil.logo_paa_alle_sider or counter(page).get().first() == 1 {
        place(top + right, dx: -profil.logo_hoejre_mm * 1mm, dy: profil.logo_top_mm * 1mm,
          image(profil.logo, width: profil.logo_bredde_mm * 1mm))
        place(top + right, dx: -profil.slogan_hoejre_mm * 1mm, dy: profil.slogan_top_mm * 1mm,
          text(size: skrift.sidehoved_pt * 1pt, style: "italic", profil.slogan))
      }
      place(bottom, block(width: 100%, height: profil.sidefod_hoejde_mm * 1mm, fill: farve,
        align(center + horizon, text(size: skrift.sidefod_pt * 1pt,
          fill: rgb(profil.sidefod_tekstfarve), profil.sidefod))))
      place(bottom + center, dy: -profil.sidetal_fra_bund_mm * 1mm,
        text(size: skrift.sidetal_pt * 1pt, sidetal()))
    },
  )
  // Bevar bogstavelige punkter, indrykning, tabulatorer og eksplicitte linjeskift.
  let tekst(s) = {
    if s == "" { return none }
    for (i, afsnit) in s.split("\n\n").enumerate() {
      if i > 0 { v(line, weak: false) }
      for (j, raw) in afsnit.split("\n").enumerate() {
        if j > 0 { linebreak() }
        let indryk = raw.match(regex("^[ \t]+"))
        if indryk != none {
          let offset = 0pt
          for ch in indryk.text {
            if ch == "\t" { offset += 36pt - calc.rem(offset, 36pt) }
            else { offset += 2.49pt * skrift.stoerrelse_pt / 11 }
          }
          h(offset)
          text(raw.slice(indryk.text.len()))
        } else { text(raw) }
      }
      parbreak()
    }
  }
  // B-046: modellen kommer fra TypeScript som JSON, aldrig som Typst-opmærkning.
  let tekststykker(pieces) = {
    for piece in pieces {
      text(weight: if piece.bold { "bold" } else { "regular" },
        style: if piece.italic { "italic" } else { "normal" }, piece.text)
    }
  }
  let indrykning(indent) = {
    let offset = 0pt
    for ch in indent {
      if ch == "\t" { offset += 36pt - calc.rem(offset, 36pt) }
      else { offset += 2.49pt * skrift.stoerrelse_pt / 11 }
    }
    offset
  }
  let formateret(model) = {
    for (i, afsnit) in model.paragraphs.enumerate() {
      if i > 0 { v(line, weak: false) }
      let tidligere = none
      for linje in afsnit.lines {
        if linje.kind == "bullet" {
          if tidligere == "line" { parbreak() }
          // Et rigtigt list-element giver hængende indrykning også ved ombrydning.
          list(indent: calc.max(indrykning(linje.indent), linje.depth * 12pt),
            body-indent: 12pt, spacing: 0pt, tight: true,
            marker: if linje.depth > 0 { [◦] } else { [•] },
            list.item(tekststykker(linje.pieces)))
        } else {
          if tidligere == "line" { linebreak() }
          if linje.indent != "" { h(indrykning(linje.indent)) }
          tekststykker(linje.pieces)
        }
        tidligere = linje.kind
      }
      parbreak()
    }
  }
  let blank(n: 1) = { for _ in range(n) { block(height: line, breakable: false)[] } }
  let overskrift(t) = block(sticky: true,
    text(weight: "bold", fill: if profil.overskrifter_i_farve { farve } else { black }, t))
  let underoverskrift(t) = block(sticky: true, emph(t))
  let tabel(rows) = table(columns: (tabel-bredde, 1fr), stroke: none,
    inset: (left: 5.4pt, right: 5.4pt, y: 0pt),
    ..rows.map(r => (strong(tekst(r.label)), tekst(r.vaerdi))).flatten())
  let figur(f) = {
    // Figurens bredde i originalens målestok (højst figur-bredde), centreret.
    if f != none { block(breakable: false, width: 100%,
      align(center, image(f.image, width: calc.min(f.width_mm * 1mm, figur-bredde)))) }
    else { blank() }
    blank()
  }
  text(size: skrift.titel_pt * 1pt, profil.titel)
  parbreak()
  v(29.3pt, weak: false)
  text(size: skrift.projekt_pt * 1pt, weight: "bold", "Projekt: " + data.projekt)
  parbreak()
  v(29.3pt, weak: false)
  for (label, value) in (("Beskrivelse:", data.beskrivelse), ("Omfang:", data.omfang),
    ("Udføres for:", data.udfoeres_for), ("Udført af:", data.sagsbehandler), ("Kontrol:", data.kontrol)) {
    grid(columns: (felt-bredde, 1fr), strong(label), tekst(value))
    blank()
  }
  v(15.9pt, weak: false)
  overskrift[Dimensioneringsgrundlag:]
  blank()
  if "oplyste_forudsaetninger" in report.formattedTexts {
    underoverskrift[Forudsætninger:]
    blank()
    formateret(report.formattedTexts.oplyste_forudsaetninger)
    blank()
  }
  if report.grundlag != none {
    underoverskrift(report.grundlag.overskrift + ":")
    blank()
    tabel(report.grundlag.rows)
  } else { blank() }
  blank()
  if "generelle_forudsaetninger" in report.formattedTexts {
    overskrift[Generelle dimensioneringsforudsætninger for MSL opbygning:]
    formateret(report.formattedTexts.generelle_forudsaetninger)
    blank()
  }
  overskrift[Dimensioneringsresultat:]
  tekst("Baseret på ovennævnte indgangsparametre kan vi foreslå følgende MSL opbygning:")
  blank()
  tabel(data.dim_resultat)
  blank()
  figur(report.visualisering)
  figur(report.designdiagram)
  for afsnit in profil.afsluttende_afsnit {
    let key = afsnit.noegle.slice(6)
    if key in report.formattedTexts {
      overskrift(afsnit.titel)
      formateret(report.formattedTexts.at(key))
      blank()
    }
  }
  blank(n: 2)
  block(breakable: false)[
    #strong(profil.by + " d.") #data.dato
    #parbreak()
    #blank()
    #tekst(data.sagsbehandler)
    #tekst(data.sagsbehandler_mail)
  ]
}
