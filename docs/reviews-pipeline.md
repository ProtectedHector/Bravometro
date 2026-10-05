# Pipeline futuro de reseñas

```text
ReviewSource → descubrimiento → contenido permitido → detección de plato
→ extracción de señales → análisis estructurado → agregación versionada
```

`ReviewSource` debe exponer capacidades, límites, identificadores y política de almacenamiento. El pipeline será idempotente, registrará modelo/fecha y permitirá borrar texto fuente sin perder datos derivados permitidos. CAPTCHA, evasión de límites y scraping contrario a condiciones quedan fuera de alcance.
