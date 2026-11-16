# Logo and footer page builder

## Goal and scope

Turn `/settings` into a visual footer editor: an insertable block library, a canvas with rows and resizable column proportions, and a selected-element inspector. Preserve Vietnamese/English content and existing contact/menu data. The primary action saves the entire settings document through the existing authenticated settings endpoint.

The layout uses responsive rows/columns rather than absolute coordinates, so blocks remain readable on phones. Support drag/drop between columns, keyboard movement controls, duplicate/delete, undo/redo, desktop/mobile preview, colors, typography, spacing, images, links and logo dimensions. A saved `footer_builder` is opt-in; missing or disabled builders retain the original footer.

## Design contract

Use existing neutral surfaces and primary color. Toolbar: device/language preview and history; left: block library; center: canvas; right: properties. Collapse to vertically stacked panels on small screens. Include loading/error/empty states and an unsaved-change warning. Preview links do not navigate. Changes publish only through Save. No additional dependencies or database migrations.

## Structure and style

- Admin: `src/features/settings/{builder,components,pages,types}`; existing service and form remain responsible for persistence and identity/contact fields.
- API: `app/modules/setting/footer_builder.py` validates the versioned JSON contract stored in the existing settings value.
- Public site: `src/features/setting` types and footer renderer; legacy footer remains the fallback.
- Use typed functional React components, controlled inputs, existing UI primitives and explicit accessible names. Example: `onChange({ ...block, align: 'center' })`.

## Implementation and verification

1. Add bounded, URL-safe, versioned layout contract and round-trip/legacy/invalid-input unit tests.
2. Implement public renderer and configurable header logo dimensions.
3. Add editor operations/history, canvas and inspector; connect to settings save.
4. Verify drag/drop, cross-column and empty-column moves, bilingual values, undo, save/reload and responsive output in the browser.

Commands (from respective repositories):

- Admin: `npm run build`; `npx tsc --noEmit -p tests/tsconfig.settings.json`; `npx eslint src/features/settings`; `node --test tests/footer-builder.test.mjs`. The full project type check currently reports unrelated existing errors outside settings.
- API: `.venv/Scripts/python.exe -m unittest discover -s tests/unit -p test_footer_builder.py`.
- Client: `npx tsc --noEmit`; `npm run build`; targeted ESLint on modified files.

Always preserve unrelated working changes and validate persisted data. Never commit credentials or insert arbitrary HTML/CSS/scripts. Existing API authorization stays in place. No new schema migration, dependency or deployment is required.

References: [WordPress Site Editor](https://wordpress.org/documentation/article/site-editor/), [dnd-kit sortable](https://dndkit.com/legacy/presets/sortable/overview/).
