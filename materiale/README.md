# Materiale pentru lecții

Pune PDF-urile în acest folder sau în subfoldere, de exemplu:

```text
materiale/clasa-5/lectia-1.pdf
materiale/clasa-6/lectia-1.pdf
```

Apoi deschide `index.html` și găsește lecția dorită în lista `lessons`. Înlocuiește `material: null` de la acea lecție cu adresa PDF-ului, de exemplu:

```js
material: { type: "pdf", url: "materiale/clasa-5/lectia-1.pdf" }
```

Pentru un material YouTube, folosește:

```js
material: { type: "video", url: "https://www.youtube.com/watch?v=ID_VIDEO" }
```

După publicarea site-ului, păstrează folderul `materiale` și fișierele PDF în aceeași structură de directoare. Butonul „Deschide PDF” va deschide fișierul într-o filă nouă; vizitatorii îl pot citi în browser sau îl pot descărca.
