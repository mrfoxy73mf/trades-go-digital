# Website test report — 12 September 2026

Tested the production build locally with Chromium at 1440 × 1000 and 390 × 844; checked the open navigation dropdown at 1100px.

## Results

- All 19 page routes returned HTTP 200, with no uncaught browser errors, broken image elements or document-level horizontal overflow after fixes.
- All 34 unique internal links resolved, including their section anchors.
- Mobile navigation opened and closed; desktop dropdown remained within the viewport; Escape closed it.
- Contact and SafeWork forms rejected empty required fields. No enquiries were sent.
- All three demo video sources returned HTTP 200 without a reported media error. Full audiovisual playback was not reviewed.
- Monthly Updates accordion opened the selected article and closed the previous article.
- Build, TypeScript and 12 mocked payment/fulfilment/SafeWork tests passed.
- Earlier maker tests verified all six document exports, four-page RAMS and two-page permit PDFs, logo transfer, saved designs, SVG/PNG exports and PNG transparency.

## Fixes

- Positioned the Apps & Tools dropdown within the navigation container.
- Corrected pale home-page footer contact and Terms text.
- Re-encoded three invalid LettingDesk SVG images as UTF-8.
- Allowed the shared public logo asset through the existing password wrapper so public pages can display it.

## Coverage and limits

Routes: home, TGD Trades, TAD The Business, Health & Safety, SafeWork builder and order, PDF Maker, Logo Maker, Pricing, Contact, Monthly Updates, general Terms, two fulfilment return pages, LettingDesk and its four legal pages.

Live checks reached the public routes. Other live pages returned HTTP 401 with the available local credentials, so their content was tested on the local production build. Password protection was preserved. Return-page checks did not use real order credentials. Real payments, email delivery, installation fulfilment and AI generation were not exercised; SafeWork sales remain disabled pending configuration and acceptance testing. External destinations and exhaustive accessibility/cross-browser coverage were not part of this check.
