# Analytics

`src/lib/analytics.ts` expone una capa mínima independiente del proveedor. Emite eventos locales `bravometro:analytics` para `page_view`, `search`, `place_view`, `filter_used` y `nearby_requested`.

No se instala ningún tracker ni se envían datos por defecto. En producción puede conectarse un listener a un proveedor respetuoso con la privacidad. Evitar texto libre de búsqueda, coordenadas precisas e identificadores personales; preferir categorías agregadas y consentimiento cuando sea necesario.
