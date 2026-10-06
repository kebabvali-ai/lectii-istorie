# Configurarea autentificarii cu Supabase

Site-ul foloseste Supabase Auth pentru creare de cont, autentificare, sesiune si resetarea parolei. Supabase verifica parola in cloud; site-ul nu o salveaza si nu o trimite proprietarului. In panoul Supabase poti vedea conturile si adresele de email, dar nu parolele.

## 1. Creeaza proiectul cloud

1. Creeaza un proiect la [supabase.com](https://supabase.com/) si pastreaza in siguranta parola bazei de date a proiectului.
2. In panoul proiectului, deschide **Project Settings → API**.
3. Copiaza **Project URL** si cheia publica **Publishable key** (sau cheia legacy `anon`).
4. Completeaza valorile in `supabase-config.js`:

```js
window.SUPABASE_CONFIG = {
  url: "https://PROJECT-REF.supabase.co",
  anonKey: "CHEIA-PUBLICA-PUBLISHABLE-SAU-ANON"
};
```

Cheia publishable/anon este folosita in browser si nu este un secret. Nu pune aici cheia `service_role`, cheia secreta API sau parola bazei de date.

## 2. Porneste site-ul printr-un server local

Nu deschide pagina direct cu `file://`. Supabase are nevoie de o adresa web valida pentru autentificare si linkurile de confirmare.

In VS Code instaleaza extensia **Live Server**, apoi apasa cu butonul drept pe `index.html` si alege **Open with Live Server**. Pagina va avea de obicei o adresa precum `http://127.0.0.1:5500`.

## 3. Configureaza emailurile si adresele permise

1. In Supabase, deschide **Authentication → Providers → Email** si asigura-te ca autentificarea prin email este activa.
2. Activeaza confirmarea emailului daca vrei ca utilizatorii sa-si confirme adresa inainte de autentificare.
3. In **Authentication → URL Configuration**, seteaza adresa locala a site-ului ca **Site URL** in timpul testarii si adauga adresa ca **Redirect URL** permisa. De exemplu, pentru Live Server poti adauga `http://127.0.0.1:5500/**`.
4. Dupa publicare, adauga si domeniul site-ului tau (de exemplu `https://siteultau.ro/**`) la Redirect URLs si seteaza domeniul public ca Site URL.

Adresa exacta a Live Server poate diferi. Foloseste aceeasi adresa in browser si in lista Redirect URLs.

## 4. Verifica si administreaza conturile

Testeaza crearea contului cu o adresa la care ai acces, confirma emailul daca este activata confirmarea, apoi testeaza autentificarea si resetarea parolei. In panoul Supabase, mergi la **Authentication → Users** ca sa vezi utilizatorii. Parolele nu sunt vizibile si nu trebuie cerute sau trimise proprietarului site-ului.

Contul este optional: lectiile si materialele raman publice. Sesiunea utilizatorului este gestionata de Supabase Auth in browser.
