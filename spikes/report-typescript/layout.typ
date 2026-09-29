// Layout rules are independent of report content and the company profile.
#let render-report(report, theme) = {
  let d = report.context
  let line = theme.body.line_pt * 1pt
  set document(title: theme.title, author: d.sagsbehandler, date: none)
  set text(font: theme.fonts.body, size: theme.body.size_pt * 1pt, lang: "da", hyphenate: false,
    top-edge: 10.23pt, bottom-edge: -3.21pt, kerning: false, ligatures: false, overhang: false)
  set par(leading: 0pt, spacing: 0pt, linebreaks: "simple")
  set block(above: 0pt, below: 0pt)
  set page(width: theme.page.width_pt * 1pt, height: theme.page.height_pt * 1pt,
    margin: (top: theme.page.top_pt * 1pt, bottom: theme.page.bottom_pt * 1pt,
      left: theme.page.left_pt * 1pt, right: theme.page.right_pt * 1pt),
    background: context {
      set text(top-edge: "cap-height", bottom-edge: "baseline", font: theme.fonts.furniture, size: 9pt)
      if theme.brand.repeat_on_all_pages or counter(page).get().first() == 1 {
        place(top + left, dx: 440.65pt, dy: 18.15pt, image(theme.brand.logo, width: 120.77pt, height: 35.65pt))
        place(top + right, dx: -31pt, dy: 55.72pt, text(style: "italic", theme.brand.tagline))
        place(bottom + left, block(width: 100%, height: 44pt, fill: rgb(theme.brand.color))[
          #place(center + horizon, dy: -2.75pt, text(size: 8.94pt, fill: white, theme.brand.footer))
        ])
      }
      place(bottom + center, dy: -64.36pt, text("[" + counter(page).display() + "]"))
    },
  )
  let plain(value) = {
    // Preserve raw lines, spaces and literal bullet characters. No Markdown/eval.
    for (i, raw) in value.split("\n").enumerate() {
      if i > 0 { linebreak() }
      let leading = raw.match(regex("^[ \\t]+"))
      if leading != none {
        let offset = 0pt
        for ch in leading.text {
          if ch == "\t" { offset += theme.body.tab_pt * 1pt - calc.rem(offset, theme.body.tab_pt * 1pt) }
          else { offset += theme.body.space_pt * 1pt }
        }
        h(offset)
        text(raw.slice(leading.text.len()))
      } else if raw == "" and value != "" {
        // An explicit empty line is report content, including at a page boundary.
        box(width: 0pt)[]
      } else { text(raw) }
    }
  }
  let para(value, bold: false, italic: false) = {
    text(weight: if bold {"bold"} else {"regular"}, style: if italic {"italic"} else {"normal"}, plain(value))
    parbreak()
  }
  let blank(count: 1) = {
    for _ in range(count) { block(height: line, breakable: false)[] }
  }
  let heading(value) = para(value, bold: true)
  let rows(items) = table(columns: (198.2pt, 283.2pt), stroke: none, inset: (left: 5.4pt, right: 5.4pt, y: 0pt),
    ..items.map(row => (strong(plain(row.label)), plain(row.vaerdi))).flatten())

  // Original Word has one 24pt empty paragraph around the project heading.
  text(size: 24pt, top-edge: 22.36pt, bottom-edge: -6.96pt, theme.title)
  parbreak()
  v(29.3pt, weak: false)
  text(size: 15.96pt, top-edge: 14.87pt, bottom-edge: -4.63pt, weight: "bold", "Projekt: " + d.projekt)
  parbreak()
  v(29.3pt, weak: false)
  for (label, value) in (("Beskrivelse:", d.beskrivelse), ("Omfang:", d.omfang),
    ("Udføres for:", d.udfoeres_for), ("Udført af:", d.sagsbehandler), ("Kontrol:", d.kontrol)) {
    grid(columns: (85.05pt, 1fr), strong(label), plain(value))
    blank()
  }
  v(15.9pt, weak: false)
  heading("Dimensioneringsgrundlag:")
  blank()
  para("Forudsætninger:", italic: true)
  blank()
  para(d.tekst_oplyste_forudsaetninger)
  blank()
  if d.dim_grundlag.len() > 0 {
    para("Grundlag for beregning:", italic: true)
    blank()
    rows(d.dim_grundlag)
  } else {
    // Word removes the heading/table but retains the intervening empty paragraph.
    blank()
  }
  blank()
  heading("Generelle dimensioneringsforudsætninger for MSL opbygning:")
  para(d.tekst_generelle_forudsaetninger)
  blank()
  heading("Dimensioneringsresultat:")
  para("Baseret på ovennævnte indgangsparametre kan vi foreslå følgende MSL opbygning:")
  blank()
  rows(d.dim_resultat)
  blank()
  for key in ("visualisering", "designdiagram") {
    let value = d.at(key)
    if type(value) == dictionary {
      block(breakable: false, image(value.image, width: value.width_cm * 1cm,
        alt: if key == "visualisering" {"Opbygning fra den gamle app"} else {"Designdiagram fra den gamle app"}))
    } else { blank() }
    blank()
  }
  for section in theme.closing_sections {
    heading(section.title)
    para(d.at(section.key))
    blank()
  }
  blank(count: 2)
  strong(theme.closing + " ")
  text(d.dato)
  parbreak()
  blank()
  para(d.sagsbehandler)
  para(d.sagsbehandler_mail)
}
