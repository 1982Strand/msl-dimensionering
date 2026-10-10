// Alle variable værdier læses som JSON, aldrig som Typst-kildekode.
#import "layout.typ": rapport
#rapport(json("profil.json"), json("data.json"))
