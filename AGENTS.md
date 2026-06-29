# Repository Instructions

- When the user provides a game or storefront link, add or update the corresponding entry in `list.md`
- Keep entries in the existing table format: title, links, social links, genre, and status.
- Add `utm_source=reddit`, `utm_medium=social`, and `utm_campaign=scapelikes` to outbound links.
- Use platform labels normalized by `scripts/validate-list.js` such as `Steam`, `Android`, `iOS`, `Website`, and `Discord`.
- Run `npm run update:list` after editing `list.md`, then run `npm run validate:list` before finishing.
