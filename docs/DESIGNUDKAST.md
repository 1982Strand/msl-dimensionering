# Designudkast med shadcn-komponenter

Direkte adgang: `/#designudkast`. Siden er skjult fra navigationen og er alene et udkast til godkendelse. Eksisterende sider og beregninger er uændrede.

| Forslag | Foreslået anvendelse | Valg til godkendelse |
| --- | --- | --- |
| Sidebar | Samlet navigation med alle otte sider | Sidepanel, sammenklappede ikoner og mobilmenu |
| Accordion | Seks beregningstrin og otte Hjælp-kapitler | Sammenklappelige afsnit med ét åbent punkt |
| Tooltip / Hover Card | Forklaring af Eᵤ, Eₒ, Cv og φᵥ | Korte tooltips og uddybende kort |
| Data Table | Geonet-database, kun opslag | Kolonner, søgning og sortering |
| Alert | Motorens fejl, advarsler og anbefalinger | Tre niveauer med tekst, ikon og farve |
| Sonner | Lagring og PDF-dannelse | Statusbeskeder med Fortryd og Hent |
| Tabs og Sheet | Rapport, Firmaprofil og PDF-visning | Faner og sidepanel til forhåndsvisning |
| Progress | Indlæsning af rapportmotor | Fremdriftsbjælke med procent |

Sidebar vises i en iframe med egen viewport, så den leverede komponents faste placering og mobilmenu forbliver inde i rammen. Den interne route `#designudkast-sidebar` er heller ikke i navigationen. Mobilvisning har 375 px bredde. Sidebar-farverne følger appens grønne tema.

Produktdata læses fra motorens `GEONET_DB`; manuel armering er udeladt som databaseprodukt. Hjælp-titler og resuméer er kopieret fra frontmatter i originalens `01–08-*.md` til `src/ui/design-draft-help.json`. Alert-eksempler dannes af `valider_input`. Beregningstrin, firmaprofil, statusbeskeder og PDF-pladsholder er markerede eksempler; ingen data gemmes. PDF-handlingen Hent viser alene en eksempelbesked.

CLI-forberedelsen tilføjede `@tanstack/react-table` 9.2.4, `sonner` 2.0.8 og `next-themes` 0.4.6 samt shadcn-komponenterne. Udkastet bruger de to første pakker og de eksisterende Radix-, Lucide- og Tailwind-pakker. Tabellen bruger TanStack v9's medfølgende legacy-adapter til shadcn-mønstret. Der er ikke installeret yderligere pakker. `next-themes` er fjernet fra `package.json` og Sonner; låsefilen er bevidst bevaret efter instruktion, da `npm install` ikke kan køres.

Brugeren skal vælge hvert forslag og dets anvendelse før implementering på de rigtige sider. Udkastet registrerer ingen godkendelse; beslutningsloggen ændres ikke.

Kontrol i worktree: typecheck, 2.757 Node-tests, format, format:check og build består. Build advarer om bundter over 500 kB. Playwright-forløbet er forsøgt, men Chromium-start er blokeret med `browserType.launch: spawn EPERM`; browserforløb og visuel kontrol skal køres i et miljø, der tillader browserstart. PowerShell blokerer `npm.ps1`, så kontrollerne blev kørt med `npm.cmd` og `npx.cmd`.
