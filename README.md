# The Bothy Christmas Party @ Bar Lotus

A one-page site where people pick which December dates they can make. It shows the event plan and a map of Bar Lotus and the Lexington. Answers go into a Google Sheet, so you don't need a server.

## 1. Set up the Google Sheet (about 5 minutes)

1. Make a new Google Sheet, for example "Bothy Xmas availability".
2. Go to **Extensions → Apps Script**.
3. Delete what's in `Code.gs`, paste in the contents of [`apps-script/Code.gs`](apps-script/Code.gs), and save.
4. Click **Deploy → New deployment**. Under the gear icon, pick **Web app**, then set:
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Click **Deploy**, approve the permissions prompt, and copy the **Web app URL**. It ends in `/exec`.
6. Open [`config.js`](config.js) and paste that URL into `SCRIPT_URL`.

Each answer lands in the **Responses** tab, one row per person. If someone submits again with the same name, their row gets replaced.

> If you change `Code.gs` later, go to **Deploy → Manage deployments → Edit → Version: New version**. Doing it this way keeps the same URL.

## 2. Publish on GitHub Pages

1. Make a new GitHub repository and push these files to the `main` branch:
   ```bash
   git init && git add . && git commit -m "Bothy Christmas party site"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. In the repo, go to **Settings → Pages**. Under **Build and deployment**, set the source to **Deploy from a branch**, then pick `main` and `/ (root)`.
3. After a minute or so, the site is live at `https://<you>.github.io/<repo>/`.

## Customising

- **Date range and closed days:** change `START_DATE`, `END_DATE` and `DISABLED_WEEKDAYS` in `config.js`. Mondays are greyed out by default because Bar Lotus is closed on Mondays.
- **Event details:** the text is in `index.html`. Once you know where the pizza and beer will be, update the "Venue to be confirmed" line.
- **Demo mode:** if `SCRIPT_URL` is empty, answers are only saved in your own browser. That's useful for trying out the layout.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `styles.css` | Styling |
| `app.js` | Calendar, group heatmap and map |
| `config.js` | Backend URL and date range |
| `apps-script/Code.gs` | The Google Sheets backend. Paste it into Apps Script; it isn't served by Pages |
